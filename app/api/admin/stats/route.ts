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

    const { count: userCount, error: userError } = await supabaseServer
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    const { count: diagnosisCount, error: diagnosisError } = await supabaseServer
      .from("diagnoses")
      .select("*", { count: "exact", head: true });

    if (diagnosisError) {
      return NextResponse.json({ error: diagnosisError.message }, { status: 500 });
    }

    const { count: subscriberCount, error: subscriberError } = await supabaseServer
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "active");

    if (subscriberError) {
      return NextResponse.json({ error: subscriberError.message }, { status: 500 });
    }

    const { count: leadsCount, error: leadsError } = await supabaseServer
      .from("leads")
      .select("*", { count: "exact", head: true });

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    return NextResponse.json({
      users: userCount || 0,
      diagnoses: diagnosisCount || 0,
      paidSubscribers: subscriberCount || 0,
      leads: leadsCount || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}