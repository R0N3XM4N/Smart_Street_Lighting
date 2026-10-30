import { NextRequest, NextResponse } from "next/server";
import { requireOperator, readJson, requireSameOrigin, validationError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { recordAuditEvent } from "@/lib/mongo";
import { validateSchedule } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  try {
    const auth = await requireOperator(request);
    if (auth.response) return auth.response;
    const result = validateSchedule(await readJson(request));
    if (!result.ok) return validationError(result.error);
    const { name, zone, onTime, offTime, days } = result.value;
    const [insert] = await getPool().execute(
      "INSERT INTO schedules (name, zone, on_time, off_time, days, enabled) VALUES (?, ?, ?, ?, ?, 1)",
      [name, zone, onTime, offTime, days.join(",")],
    );
    const id = (insert as { insertId: number }).insertId;
    const audit = await recordAuditEvent({
      actorId: auth.user.id, actor: auth.user.username, action: "schedule.created",
      entityType: "schedule", entityId: String(id), details: { name, zone, onTime, offTime, days },
      createdAt: new Date(),
    });
    return NextResponse.json({ id, audit }, { status: 201 });
  } catch (error) {
    console.error("Schedule creation failed:", error);
    return NextResponse.json({ error: "Could not create schedule." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  try {
    const auth = await requireOperator(request);
    if (auth.response) return auth.response;
    const rawId = request.nextUrl.searchParams.get("id");
    const id = rawId ? Number(rawId) : NaN;
    if (!Number.isSafeInteger(id) || id < 1) {
      return validationError("Provide a valid schedule ID.");
    }
    const [result] = await getPool().execute("DELETE FROM schedules WHERE id = ?", [id]);
    const affectedRows = (result as { affectedRows: number }).affectedRows;
    if (!affectedRows) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
    const audit = await recordAuditEvent({
      actorId: auth.user.id, actor: auth.user.username, action: "schedule.deleted",
      entityType: "schedule", entityId: String(id), details: {},
      createdAt: new Date(),
    });
    return NextResponse.json({ ok: true, audit });
  } catch (error) {
    console.error("Schedule deletion failed:", error);
    return NextResponse.json({ error: "Could not delete schedule." }, { status: 503 });
  }
}
