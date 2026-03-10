import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require("jsonwebtoken");

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.userId;

    const { data: me, error: meError } = await supabaseServer
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .single();

    if (meError || !me) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (me.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseServer
      .from("leads")
      .select("id, name, phone, area, urgency, problem, diagnosis, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leads: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}