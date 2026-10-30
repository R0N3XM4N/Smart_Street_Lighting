import { NextRequest, NextResponse } from "next/server";
import { requireOperator, readJson, requireSameOrigin, validationError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { recordAuditEvent } from "@/lib/mongo";
import { validateReading } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  try {
    const auth = await requireOperator(request);
    if (auth.response) return auth.response;
    const result = validateReading(await readJson(request));
    if (!result.ok) return validationError(result.error);
    const { poleId, measuredAt, energyKwh, luxLevel, pedestrianCount, status } = result.value;
    const [insert] = await getPool().execute(
      "INSERT INTO readings (pole_id, measured_at, energy_kwh, lux_level, pedestrian_count, status) VALUES (?, ?, ?, ?, ?, ?)",
      [poleId, new Date(measuredAt), energyKwh, luxLevel, pedestrianCount, status],
    );
    const id = (insert as { insertId: number }).insertId;
    const audit = await recordAuditEvent({
      actorId: auth.user.id, actor: auth.user.username, action: "reading.created",
      entityType: "reading", entityId: String(id), details: { poleId, measuredAt, energyKwh, luxLevel, pedestrianCount, status },
      createdAt: new Date(),
    });
    return NextResponse.json({ id, audit }, { status: 201 });
  } catch (error) {
    console.error("Reading creation failed:", error);
    return NextResponse.json({ error: "Could not create reading." }, { status: 503 });
  }
}
