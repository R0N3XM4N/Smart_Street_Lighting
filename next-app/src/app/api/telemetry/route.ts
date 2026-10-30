import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { mongoAvailability, searchAuditEvents } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;
    const search = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (search.length > 100) {
      return NextResponse.json({ error: "Search text must be 100 characters or fewer." }, { status: 400 });
    }
    const availability = await mongoAvailability();
    if (availability.status !== "available") {
      return NextResponse.json({ availability, recent: [], byAction: [], byHour: [] });
    }
    const data = await searchAuditEvents(search);
    return NextResponse.json({ availability, ...data });
  } catch (error) {
    console.error("Telemetry request failed:", error);
    return NextResponse.json({
      availability: {
        status: "unavailable",
        message: "MongoDB event search is unavailable. Check the server connection and application logs.",
      },
      recent: [], byAction: [], byHour: [],
    });
  }
}
