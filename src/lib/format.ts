import { format, parseISO } from "date-fns";

export function formatCurrency(value: number, currency = "USD", compact = false) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
  }).format(Number(value) || 0);
}

export function formatDate(value: string, pattern = "MMM d, yyyy") {
  try {
    return format(parseISO(value), pattern);
  } catch {
    return value;
  }
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function initials(name?: string | null) {
  return (name || "User")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function percent(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "Something went wrong. Please try again.";
}
