import { NextRequest, NextResponse } from "next/server";
import { requireOperator, readJson, requireSameOrigin, validationError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { recordAuditEvent } from "@/lib/mongo";
import { validatePole } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  try {
    const auth = await requireOperator(request);
    if (auth.response) return auth.response;
    const result = validatePole(await readJson(request));
    if (!result.ok) return validationError(result.error);
    const { poleCode, location, zone, wattage } = result.value;
    const [insert] = await getPool().execute(
      "INSERT INTO poles (pole_code, location, zone, wattage, brightness) VALUES (?, ?, ?, ?, 100)",
      [poleCode, location, zone, wattage],
    );
    const id = (insert as { insertId: number }).insertId;
    const audit = await recordAuditEvent({
      actorId: auth.user.id, actor: auth.user.username, action: "pole.created",
      entityType: "pole", entityId: String(id), details: { poleCode, location, zone, wattage },
      createdAt: new Date(),
    });
    return NextResponse.json({ id, audit }, { status: 201 });
  } catch (error) {
    console.error("Pole creation failed:", error);
    return NextResponse.json({ error: "Could not create pole." }, { status: 503 });
  }
}
