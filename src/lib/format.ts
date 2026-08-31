import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";

let formattingLanguage: "en" | "ar" = "en";

export function setFormattingLanguage(language: "en" | "ar") {
  formattingLanguage = language;
}

export function getFormattingLocale() {
  return formattingLanguage === "ar" ? "ar-IQ" : "en-US";
}

export function normalizeIqdInput(value: string) {
  return value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
}

export function formatIqdInput(value: string | number | readonly string[] | undefined) {
  const normalized = normalizeIqdInput(String(value ?? ""));
  return normalized ? normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
}

export function formatCurrency(value: number, currency = "USD", compact = false) {
  const amount = Number(value) || 0;
  if (currency === "IQD") {
    return `${Math.round(amount).toLocaleString("de-DE", { maximumFractionDigits: 0 })} IQD`;
  }
  return new Intl.NumberFormat(getFormattingLocale(), {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
  }).format(amount);
}

export function formatDate(value: string, pattern = "MMM d, yyyy") {
  try {
    const localizedPattern = formattingLanguage === "ar" && pattern === "MMM d, yyyy" ? "d MMM yyyy" : pattern;
    return format(parseISO(value), localizedPattern, { locale: formattingLanguage === "ar" ? ar : enUS });
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

export function formatMonth(value: Date, includeYear = false) {
  return format(value, includeYear ? "MMMM yyyy" : "MMM", { locale: formattingLanguage === "ar" ? ar : enUS });
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
