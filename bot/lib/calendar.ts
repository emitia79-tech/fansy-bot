export const CALENDAR_NAME = "Мой день";

export const LANES = ["personal", "mastermine", "zemtronic", "hausearth", "shared"] as const;
export type Lane = (typeof LANES)[number];

export const LANE_LABELS: Record<Lane, string> = {
  personal: "Личное",
  mastermine: "Mastermine",
  zemtronic: "Земтроник",
  hausearth: "Hausearth",
  shared: "Общее",
};

export const DAY_PARTS = ["morning", "day", "evening"] as const;
export type DayPart = (typeof DAY_PARTS)[number];

export const DAY_PART_LABELS = ["Утро", "День", "Вечер"] as const;

export function isLane(value: string | undefined): value is Lane {
  return value !== undefined && (LANES as readonly string[]).includes(value);
}

export function isDayPart(value: string | undefined): value is DayPart {
  return value !== undefined && (DAY_PARTS as readonly string[]).includes(value);
}

export function dayPartFrom(happenedAt: string | undefined): DayPart {
  const hour = happenedAt?.match(/T(\d{2})/)?.[1];
  if (hour === undefined) return "day";
  const value = Number(hour);
  if (value < 12) return "morning";
  if (value < 18) return "day";
  return "evening";
}
