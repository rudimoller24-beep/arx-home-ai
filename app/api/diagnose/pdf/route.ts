import { NextResponse } from "next/server";
import OpenAI from "openai";
import { jwtVerify } from "jose";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

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

    const { name, phone, area, urgency, prompt, images } = await req.json();

    if (!prompt || !String(prompt).trim()) {
      return NextResponse.json(
        { error: "Problem description is required" },
        { status: 400 }
      );
    }

    let profile: any = null;

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
You are a professional construction and repair diagnosis assistant.

Customer details:
Name: ${name || "-"}
Phone: ${phone || "-"}
Area: ${area || "-"}
Urgency: ${urgency || "-"}

Problem description:
${prompt}

Use the images provided (if any) to help identify the issue.

Respond in this format:

1. Likely cause
2. Risk level
3. Recommended action
4. Tools/materials needed
5. Estimated repair cost
6. When a professional is required
`;

    const content: any[] = [{ type: "text", text: aiPrompt }];

    if (Array.isArray(images)) {
      images.forEach((img: string) => {
        content.push({
          type: "image_url",
          image_url: { url: img },
        });
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content,
        },
      ],
      temperature: 0.4,
    });

    const result =
      completion.choices?.[0]?.message?.content?.trim() ||
      "No diagnosis generated.";

    const { error: insertError } = await supabaseServer.from("diagnoses").insert({
      user_id: resolvedUserId,
      prompt,
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
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}