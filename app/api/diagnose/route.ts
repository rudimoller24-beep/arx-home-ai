import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabaseServer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require("jsonwebtoken");

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.userId;

    const { name, phone, area, urgency, prompt } = await req.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Problem description is required" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("subscription_status")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.subscription_status !== "active") {
      const { count, error: countError } = await supabaseServer
        .from("diagnoses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countError) {
        return NextResponse.json({ error: "Could not check diagnosis limit" }, { status: 500 });
      }

      const used = count || 0;
      if (used >= 3) {
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

    await supabaseServer.from("diagnoses").insert({
      user_id: userId,
      problem: prompt,
      result,
    });

    return NextResponse.json({ result });
  } catch (err: any) {
    console.error("DIAGNOSE_ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}