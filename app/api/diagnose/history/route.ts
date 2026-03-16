import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

type JwtPayload = {
  sub: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
};

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const cookieToken =
    request.cookies.get("token")?.value ||
    request.cookies.get("auth_token")?.value ||
    request.cookies.get("jwt")?.value ||
    null;

  return cookieToken;
}

function getUserFromToken(token: string): JwtPayload {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("Missing JWT_SECRET");
  }

  const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

  if (!decoded?.sub) {
    throw new Error("Invalid token payload: missing sub");
  }

  return decoded;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function normalizeImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];

  return images.filter((item): item is string => typeof item === "string");
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: missing token" },
        { status: 401 }
      );
    }

    let user: JwtPayload;

    try {
      user = getUserFromToken(token);
    } catch {
      return NextResponse.json(
        { error: "Unauthorized: invalid token" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("diagnoses")
      .select("id, prompt, result, created_at, images")
      .eq("user_id", user.sub)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(error.message);
    }

    const diagnoses = (data || []).map((item) => ({
      id: item.id,
      prompt: item.prompt || "",
      result: item.result || "",
      created_at: item.created_at,
      images: normalizeImages(item.images),
    }));

    return NextResponse.json({
      success: true,
      diagnoses,
    });
  } catch (error) {
    console.error("Diagnose history route error:", error);

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      {
        error: "Failed to load diagnosis history",
        details: message,
      },
      { status: 500 }
    );
  }
}