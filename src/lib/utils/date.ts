// src/lib/utils/date.ts
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { fr, enUS } from "date-fns/locale";

export function getLocale(lang: string = "fr") {
  return lang === "fr" ? fr : enUS;
}

export function formatDate(date: string | Date, lang: string = "fr"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const locale = getLocale(lang);
  if (isToday(d)) return format(d, "HH:mm", { locale });
  if (isYesterday(d)) return lang === "fr" ? `Hier ${format(d, "HH:mm")}` : `Yesterday ${format(d, "HH:mm")}`;
  return format(d, "dd/MM/yyyy", { locale });
}

export function formatDateTime(date: string | Date, lang: string = "fr"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const locale = getLocale(lang);
  return format(d, "dd/MM/yyyy HH:mm", { locale });
}

export function formatRelative(date: string | Date, lang: string = "fr"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: getLocale(lang) });
}
