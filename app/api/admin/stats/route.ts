import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    users: 999,
    diagnoses: 999,
    paidSubscribers: 999,
    leads: 999,
  });
}