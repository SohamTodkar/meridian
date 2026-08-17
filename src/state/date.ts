export type DateKey = `${number}-${string}-${string}`;

export function getLocalDateKey(date = new Date(), timeZone?: string): DateKey {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (kind: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === kind)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}` as DateKey;
}

export function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

export function shiftDateKey(key: string, days: number): DateKey {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10) as DateKey;
}

export function getWeekStartKey(date = new Date(), timeZone?: string): DateKey {
  const key = getLocalDateKey(date, timeZone);
  const cursor = dateFromKey(key);
  const day = cursor.getUTCDay();
  return shiftDateKey(key, -(day === 0 ? 6 : day - 1));
}

export function isDateKeyInRange(key: string, start: string, end: string): boolean {
  return key >= start && key <= end;
}
