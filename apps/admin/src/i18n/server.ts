import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, translate, type Locale, type MessageKey } from "./messages";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get("locale")?.value;
  return LOCALES.includes(v as Locale) ? (v as Locale) : DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
  };
}
