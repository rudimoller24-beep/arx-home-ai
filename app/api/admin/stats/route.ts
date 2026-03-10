import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type JwtPayload = {
  userId: string;
};

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const userId = decoded.userId;

    // First get the currently logged-in profile
    const { data: me, error: meError } = await supabaseServer
      .from("profiles")
      .select("id, email, role")
      .eq("id", userId)
      .single();

    if (meError || !me) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let isAdmin = me.role === "admin";

    // If this exact row isn't admin, check whether another profile with the same email is admin
    if (!isAdmin && me.email) {
      const { data: adminMatch, error: adminMatchError } = await supabaseServer
        .from("profiles")
        .select("id, email, role")
        .eq("email", me.email)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminMatchError && adminMatch) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
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

    return NextResponse.json({
      users: userCount || 0,
      diagnoses: diagnosisCount || 0,
      paidSubscribers: subscriberCount || 0,
    });
  } catch (err: any) {
    console.error("ADMIN_STATS_ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}