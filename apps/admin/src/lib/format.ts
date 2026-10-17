import type { MessageKey } from "@/i18n/messages";

type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** "3 min ago" / "Yesterday" in the viewer's language. Computed on the server at request time. */
export function relativeTime(iso: string | null, t: T, never: MessageKey = "users.never"): string {
  if (!iso) return t(never);
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return t("rel.now");
  if (min < 60) return t("rel.min", { n: min });
  const hr = Math.round(min / 60);
  if (hr < 24) return t("rel.hr", { n: hr });
  const day = Math.round(hr / 24);
  return day === 1 ? t("rel.yesterday") : t("rel.day", { n: day });
}
