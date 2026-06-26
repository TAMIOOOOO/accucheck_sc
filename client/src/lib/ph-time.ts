const PH_TIMEZONE = "Asia/Manila";

export function formatPHDate(date: Date | string | number, fmt: "short" | "long" | "date-only" = "long"): string {
  const d = new Date(date);
  switch (fmt) {
    case "short":
      return d.toLocaleDateString("en-PH", {
        timeZone: PH_TIMEZONE,
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      });
    case "date-only":
      return d.toLocaleDateString("en-PH", {
        timeZone: PH_TIMEZONE,
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case "long":
    default:
      return d.toLocaleDateString("en-PH", {
        timeZone: PH_TIMEZONE,
        month: "long",
        day: "numeric",
        year: "numeric",
      });
  }
}

export function formatPHTime(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleTimeString("en-PH", {
    timeZone: PH_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatPHDateTime(date: Date | string | number): string {
  return `${formatPHDate(date)} ${formatPHTime(date)}`;
}

export function formatPHShortDateTime(date: Date | string | number): string {
  return `${formatPHDate(date, "short")} ${formatPHTime(date)}`;
}

export function getPHToday(): Date {
  const now = new Date();
  const phStr = now.toLocaleDateString("en-CA", { timeZone: PH_TIMEZONE });
  return new Date(phStr + "T00:00:00+08:00");
}

export function isSamePHDay(a: Date | string | number, b: Date | string | number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  const aStr = da.toLocaleDateString("en-CA", { timeZone: PH_TIMEZONE });
  const bStr = db.toLocaleDateString("en-CA", { timeZone: PH_TIMEZONE });
  return aStr === bStr;
}

export function getPHTodayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: PH_TIMEZONE });
}

export function isPHBeforeToday(date: Date): boolean {
  const dateStr = date.toLocaleDateString("en-CA", { timeZone: PH_TIMEZONE });
  return dateStr < getPHTodayStr();
}
