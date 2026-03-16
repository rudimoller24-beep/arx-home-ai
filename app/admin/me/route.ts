import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);

    return NextResponse.json({
      success: true,
      user,
      isAdmin: user.role === "admin",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    const status = message.includes("missing token") || message.includes("Unauthorized")
      ? 401
      : 500;

    return NextResponse.json(
      {
        error: "Failed to load current user",
        details: message,
      },
      { status }
    );
  }
}