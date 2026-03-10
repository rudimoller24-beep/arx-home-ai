import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require("jsonwebtoken");

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.userId;

    const { name, phone, area, urgency, problem, diagnosis } = await req.json();

    if (!problem || !diagnosis) {
      return NextResponse.json(
        { error: "Problem and diagnosis are required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer.from("leads").insert({
      user_id: userId,
      name: name || "",
      phone: phone || "",
      area: area || "",
      urgency: urgency || "",
      problem,
      diagnosis,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}