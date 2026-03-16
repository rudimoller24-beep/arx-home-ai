import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("Missing JWT_SECRET environment variable.");
}

const secret = new TextEncoder().encode(jwtSecret);

export async function GET(req: Request) {
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

    let profile = null;

    const { data: profileById, error: profileByIdError } = await supabaseServer
      .from("profiles")
      .select("id, email, subscription_status")
      .eq("id", userId)
      .maybeSingle();

    if (profileByIdError) {
      return NextResponse.json(
        { error: "Could not load profile", details: profileByIdError.message },
        { status: 500 }
      );
    }

    profile = profileById;

    if (!profile && userEmail) {
      const { data: profileByEmail, error: profileByEmailError } = await supabaseServer
        .from("profiles")
        .select("id, email, subscription_status")
        .eq("email", userEmail)
        .maybeSingle();

      if (profileByEmailError) {
        return NextResponse.json(
          { error: "Could not load profile", details: profileByEmailError.message },
          { status: 500 }
        );
      }

      profile = profileByEmail;
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const resolvedUserId = profile.id;

    if (profile.subscription_status === "active") {
      return NextResponse.json({
        allowed: true,
        remaining: "unlimited",
      });
    }

    const { count, error: countError } = await supabaseServer
      .from("diagnoses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", resolvedUserId);

    if (countError) {
      return NextResponse.json(
        { error: "Could not count diagnoses", details: countError.message },
        { status: 500 }
      );
    }

    const used = count || 0;
    const remaining = Math.max(0, 3 - used);

    return NextResponse.json({
      allowed: used < 3,
      remaining,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}