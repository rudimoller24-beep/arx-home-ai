import { NextResponse } from "next/server";
import OpenAI from "openai";
import { jwtVerify } from "jose";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("Missing JWT_SECRET environment variable.");
}

const secret = new TextEncoder().encode(jwtSecret);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, secret);

    const userId = String(payload.sub || "").trim();
    const userEmail = String(payload.email || "").trim().toLowerCase();

    if (!userId) {
      return NextResponse.json(
        {
          error: "Invalid token payload",
          debug: { payload },
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, phone, area, urgency, prompt } = body;

    if (!prompt || !String(prompt).trim()) {
      return NextResponse.json(
        { error: "Problem description is required" },
        { status: 400 }
      );
    }

    const { data: profileById, error: profileByIdError } = await supabaseServer
      .from("profiles")
      .select("id, email, subscription_status")
      .eq("id", userId)
      .maybeSingle();

    const { data: profileByEmail, error: profileByEmailError } = await supabaseServer
      .from("profiles")
      .select("id, email, subscription_status")
      .eq("email", userEmail)
      .maybeSingle();

    if (profileByIdError || profileByEmailError) {
      return NextResponse.json(
        {
          error: "Could not load profile",
          details: {
            byId: profileByIdError?.message || null,
            byEmail: profileByEmailError?.message || null,
          },
          debug: {
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
            userId,
            userEmail,
            profileById,
            profileByEmail,
          },
        },
        { status: 500 }
      );
    }

    const profile = profileById || profileByEmail;

    if (!profile) {
      return NextResponse.json(
        {
          error: "Profile not found",
          debug: {
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
            userId,
            userEmail,
            profileById,
            profileByEmail,
          },
        },
        { status: 404 }
      );
    }

    const resolvedUserId = profile.id;

    if (profile.subscription_status !== "active") {
      const { count, error: countError } = await supabaseServer
        .from("diagnoses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", resolvedUserId);

      if (countError) {
        return NextResponse.json(
          {
            error: "Could not check diagnosis limit",
            details: countError.message,
          },
          { status: 500 }
        );
      }

      if ((count || 0) >= 3) {
        return NextResponse.json(
          { error: "You have reached your 3 free diagnoses. Please upgrade to continue." },
          { status: 403 }
        );
      }
    }

    const aiPrompt = `
You are ARX Home AI, a practical home repair and construction diagnosis assistant for South Africa.

Customer details:
- Name: ${name || "-"}
- Phone: ${phone || "-"}
- Area: ${area || "-"}
- Urgency: ${urgency || "-"}

Problem:
${prompt}

Give a practical diagnosis in this format:

1. Likely cause
2. Risk level
3. Recommended action
4. Tools/materials needed
5. Estimated cost range in South African Rand
6. When to call a professional

Keep it clear, practical, and suitable for a homeowner.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a practical, professional home repair and renovation diagnosis assistant for ARX Developments in South Africa.",
        },
        {
          role: "user",
          content: aiPrompt,
        },
      ],
      temperature: 0.4,
    });

    const result =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, no diagnosis could be generated.";

    const { error: insertError } = await supabaseServer.from("diagnoses").insert({
      user_id: resolvedUserId,
      problem: String(prompt).trim(),
      result,
    });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save diagnosis", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (err: any) {
    console.error("DIAGNOSE_ERROR:", err);

    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}