import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { count: userCount } = await supabaseServer
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: diagnosisCount } = await supabaseServer
      .from("diagnoses")
      .select("*", { count: "exact", head: true });

    const { count: subscriberCount } = await supabaseServer
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "active");

    const { count: leadsCount } = await supabaseServer
      .from("leads")
      .select("*", { count: "exact", head: true });

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