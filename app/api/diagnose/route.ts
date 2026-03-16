import { NextResponse } from "next/server";
import OpenAI from "openai";
import { jwtVerify } from "jose";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const jwtSecret = process.env.JWT_SECRET;
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
      return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
    }

    const { name, phone, area, urgency, prompt } = await req.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Problem description is required" },
        { status: 400 }
      );
    }

    let profile = null;

    const { data: profileById } = await supabaseServer
      .from("profiles")
      .select("id, email, subscription_status")
      .eq("id", userId)
      .maybeSingle();

    profile = profileById;

    if (!profile && userEmail) {
      const { data: profileByEmail } = await supabaseServer
        .from("profiles")
        .select("id, email, subscription_status")
        .eq("email", userEmail)
        .maybeSingle();

      profile = profileByEmail;
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const resolvedUserId = profile.id;

    if (profile.subscription_status !== "active") {
      const { count } = await supabaseServer
        .from("diagnoses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", resolvedUserId);

      const used = count || 0;

      if (used >= 3) {
        return NextResponse.json(
          {
            error:
              "You have reached your 3 free diagnoses. Please upgrade to continue.",
          },
          { status: 403 }
        );
      }
    }

    const aiPrompt = `
You are ARX Home AI, a practical home repair assistant for South Africa.

Customer:
Name: ${name || "-"}
Phone: ${phone || "-"}
Area: ${area || "-"}
Urgency: ${urgency || "-"}

Problem:
${prompt}

Give the answer in this format:

1. Likely cause
2. Risk level
3. Recommended action
4. Tools/materials needed
5. Estimated cost range in South African Rand
6. When to call a professional
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional home repair diagnosis assistant for ARX Developments in South Africa.",
        },
        { role: "user", content: aiPrompt },
      ],
      temperature: 0.4,
    });

    const result =
      completion.choices?.[0]?.message?.content?.trim() ||
      "No diagnosis generated.";

  await supabaseServer.from("diagnoses").insert({
  user_id: resolvedUserId,
  prompt,
  result,
});

    if (insertError) {
      console.error("SAVE ERROR:", insertError);
      return NextResponse.json(
        { error: "Failed to save diagnosis", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (err: any) {
    console.error("DIAGNOSE ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}