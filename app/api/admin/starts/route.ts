import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  try {
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
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}