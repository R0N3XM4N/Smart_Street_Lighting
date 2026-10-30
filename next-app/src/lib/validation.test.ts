import { describe, expect, it } from "vitest";
import { validateBrightness, validatePole, validateReading, validateSchedule } from "./validation";

describe("request validation", () => {
  it("accepts browser form pole fields and trims text", () => {
    expect(validatePole({ poleCode: " ST-1 ", location: " Main St ", zone: " East ", wattage: "120" }))
      .toEqual({ ok: true, value: { poleCode: "ST-1", location: "Main St", zone: "East", wattage: 120 } });
  });

  it("rejects unsafe pole wattage", () => {
    expect(validatePole({ poleCode: "ST-1", location: "Main St", zone: "East", wattage: "5001" }).ok).toBe(false);
  });

  it("validates readings and canonicalizes their timestamps", () => {
    const result = validateReading({
      poleId: "2", measuredAt: "2026-10-30T12:00:00Z", energyKwh: "2.5", status: "online",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toMatchObject({ poleId: 2, energyKwh: 2.5, status: "online" });
    expect(validateReading({
      poleId: "0", measuredAt: "not-a-date", energyKwh: "-1", status: "unknown",
    }).ok).toBe(false);
  });

  it("accepts comma-separated schedule days and deduplicates them", () => {
    expect(validateSchedule({
      name: "Evening", zone: "North", onTime: "18:30", offTime: "05:45", days: "Mon,Tue,Mon",
    })).toEqual({
      ok: true,
      value: { name: "Evening", zone: "North", onTime: "18:30", offTime: "05:45", days: ["Mon", "Tue"] },
    });
    expect(validateSchedule({
      name: "Bad", zone: "North", onTime: "25:00", offTime: "05:00", days: "Someday",
    }).ok).toBe(false);
  });

  it("enforces brightness between 0 and 100", () => {
    expect(validateBrightness({ poleId: "4", brightness: "0" })).toEqual({
      ok: true, value: { poleId: 4, brightness: 0 },
    });
    expect(validateBrightness({ poleId: 4, brightness: 101 }).ok).toBe(false);
  });
});
