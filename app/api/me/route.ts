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
      .select("id, email, trial_end, subscription_status, role")
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
        .select("id, email, trial_end, subscription_status, role")
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

    return NextResponse.json(profile);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}