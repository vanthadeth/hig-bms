"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/actions";
import { useT } from "@/i18n/client";

export function LocaleSeg() {
  const { locale, t } = useT();
  const [pending, start] = useTransition();
  return (
    <div className="seg" role="group" aria-label={t("account.language")} style={{ width: "auto" }}>
      {(["km", "en"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={locale === l} disabled={pending} onClick={() => start(() => setLocale(l))}>
          {l === "km" ? "ខ្មែរ" : "EN"}
        </button>
      ))}
    </div>
  );
}
