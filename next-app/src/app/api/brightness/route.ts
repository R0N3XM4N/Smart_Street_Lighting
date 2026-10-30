import { NextRequest, NextResponse } from "next/server";
import { requireOperator, readJson, requireSameOrigin, validationError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { recordAuditEvent } from "@/lib/mongo";
import { validateBrightness } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  try {
    const auth = await requireOperator(request);
    if (auth.response) return auth.response;
    const result = validateBrightness(await readJson(request));
    if (!result.ok) return validationError(result.error);
    const { poleId, brightness } = result.value;
    await getPool().execute("CALL set_pole_brightness(?, ?)", [poleId, brightness]);
    const audit = await recordAuditEvent({
      actorId: auth.user.id, actor: auth.user.username, action: "brightness.changed",
      entityType: "pole", entityId: String(poleId), details: { brightness },
      createdAt: new Date(),
    });
    return NextResponse.json({ ok: true, audit });
  } catch (error) {
    console.error("Brightness update failed:", error);
    return NextResponse.json({ error: "Could not update pole brightness." }, { status: 503 });
  }
}
