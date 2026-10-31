import { NextRequest, NextResponse } from "next/server";
import { requireUserOrDemoViewer } from "@/lib/api";
import { fetchDashboard } from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUserOrDemoViewer(request);
    if (auth.response) return auth.response;
    return NextResponse.json({ ...await fetchDashboard(), user: auth.user });
  } catch (error) {
    console.error("Dashboard request failed:", error);
    return NextResponse.json({ error: "Dashboard data is unavailable." }, { status: 503 });
  }
}
