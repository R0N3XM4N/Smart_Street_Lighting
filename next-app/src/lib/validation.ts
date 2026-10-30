export type PoleInput = {
  poleCode: string;
  location: string;
  zone: string;
  wattage: number;
};

export type ReadingInput = {
  poleId: number;
  measuredAt: string;
  energyKwh: number;
  luxLevel: number;
  pedestrianCount: number;
  status: "online" | "offline" | "maintenance";
};

export type ScheduleInput = {
  name: string;
  zone: string;
  onTime: string;
  offTime: string;
  days: string[];
};

export type BrightnessInput = {
  poleId: number;
  brightness: number;
};

export type RegistrationInput = {
  username: string;
  password: string;
  role: "viewer" | "operator";
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximum;
}

function numericValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

export function validateRegistration(value: unknown): ValidationResult<RegistrationInput> {
  if (!isRecord(value) || typeof value.username !== "string" ||
      !/^[A-Za-z0-9._-]{3,32}$/.test(value.username.trim()) ||
      typeof value.password !== "string" || value.password.length < 12 ||
      value.password.length > 200 ||
      (value.role !== undefined && value.role !== "viewer" && value.role !== "operator")) {
    return {
      ok: false,
      error: "Use a 3–32 character username (letters, numbers, ., _ or -) and a password of at least 12 characters.",
    };
  }
  return {
    ok: true,
    value: {
      username: value.username.trim(),
      password: value.password,
      role: value.role === "operator" ? "operator" : "viewer",
    },
  };
}

export function validatePole(value: unknown): ValidationResult<PoleInput> {
  const wattage = isRecord(value) ? numericValue(value.wattage) : Number.NaN;
  if (!isRecord(value) || !boundedText(value.poleCode, 40) ||
      !boundedText(value.location, 160) || !boundedText(value.zone, 80) ||
      !Number.isInteger(wattage) || wattage < 1 || wattage > 5000) {
    return { ok: false, error: "Provide a pole code, location, zone, and wattage (1–5000)." };
  }
  return {
    ok: true,
    value: {
      poleCode: value.poleCode.trim(),
      location: value.location.trim(),
      zone: value.zone.trim(),
      wattage,
    },
  };
}

export function validateReading(value: unknown): ValidationResult<ReadingInput> {
  const poleId = isRecord(value) ? numericValue(value.poleId) : Number.NaN;
  const energyKwh = isRecord(value) ? numericValue(value.energyKwh) : Number.NaN;
  const luxLevel = isRecord(value) ? numericValue(value.luxLevel ?? 0) : Number.NaN;
  const pedestrianCount = isRecord(value) ? numericValue(value.pedestrianCount ?? 0) : Number.NaN;
  if (!isRecord(value) || !Number.isInteger(poleId) || poleId < 1 ||
      typeof value.measuredAt !== "string" || Number.isNaN(Date.parse(value.measuredAt)) ||
      !Number.isFinite(energyKwh) || energyKwh < 0 || energyKwh > 1_000_000 ||
      !Number.isFinite(luxLevel) || luxLevel < 0 || luxLevel > 99_999_999.99 ||
      !Number.isInteger(pedestrianCount) || pedestrianCount < 0 ||
      !["online", "offline", "maintenance"].includes(String(value.status))) {
    return { ok: false, error: "Provide a valid pole, timestamp, non-negative energy/lux, pedestrian count, and status." };
  }
  return {
    ok: true,
    value: {
      poleId,
      measuredAt: new Date(value.measuredAt).toISOString(),
      energyKwh,
      luxLevel,
      pedestrianCount,
      status: value.status as ReadingInput["status"],
    },
  };
}

export function validateSchedule(value: unknown): ValidationResult<ScheduleInput> {
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const validDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = isRecord(value)
    ? (typeof value.days === "string" ? value.days.split(",").map((day) => day.trim()).filter(Boolean) : value.days)
    : undefined;
  if (!isRecord(value) || !boundedText(value.name, 100) || !boundedText(value.zone, 80) ||
      typeof value.onTime !== "string" || !timePattern.test(value.onTime) ||
      typeof value.offTime !== "string" || !timePattern.test(value.offTime) ||
      !Array.isArray(days) || days.length === 0 ||
      !days.every((day) => typeof day === "string" && validDays.includes(day))) {
    return { ok: false, error: "Provide a name, zone, valid on/off times, and at least one valid day." };
  }
  return {
    ok: true,
    value: {
      name: value.name.trim(),
      zone: value.zone.trim(),
      onTime: value.onTime,
      offTime: value.offTime,
      days: [...new Set(days as string[])],
    },
  };
}

export function validateBrightness(value: unknown): ValidationResult<BrightnessInput> {
  const poleId = isRecord(value) ? numericValue(value.poleId) : Number.NaN;
  const brightness = isRecord(value) ? numericValue(value.brightness) : Number.NaN;
  if (!isRecord(value) || !Number.isInteger(poleId) || poleId < 1 ||
      !Number.isInteger(brightness) || brightness < 0 || brightness > 100) {
    return { ok: false, error: "Provide a valid pole ID and brightness from 0 to 100." };
  }
  return {
    ok: true,
    value: { poleId, brightness },
  };
}
