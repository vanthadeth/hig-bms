"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALES } from "@/i18n/messages";

export async function setLocale(locale: string) {
  if (!LOCALES.includes(locale as (typeof LOCALES)[number])) return;
  (await cookies()).set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
