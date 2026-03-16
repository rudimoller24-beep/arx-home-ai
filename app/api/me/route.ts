import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserFromRequest } from "../../../../lib/auth";

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
    console.error("Admin auth error:", error);

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    let status = 500;

    if (
      message.toLowerCase().includes("missing token") ||
      message.toLowerCase().includes("unauthorized")
    ) {
      status = 401;
    }

    if (message.toLowerCase().includes("forbidden")) {
      status = 403;
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status }
    );
  }
}