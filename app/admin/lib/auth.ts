import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

export type JwtPayload = {
  sub: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
};

export type AuthUser = {
  id: string;
  email: string | null;
  role: string | null;
};

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

export function getBearerToken(request: NextRequest): string | null {
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

export function verifyJwtToken(token: string): JwtPayload {
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

export async function getAuthenticatedUserFromRequest(
  request: NextRequest
): Promise<AuthUser> {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("Unauthorized: missing token");
  }

  const decoded = verifyJwtToken(token);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", decoded.sub)
    .single();

  if (error || !data) {
    throw new Error("Unauthorized: user profile not found");
  }

  return {
    id: data.id,
    email: data.email ?? null,
    role: data.role ?? null,
  };
}

export async function requireAdminFromRequest(
  request: NextRequest
): Promise<AuthUser> {
  const user = await getAuthenticatedUserFromRequest(request);

  if (user.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }

  return user;
}