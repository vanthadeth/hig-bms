"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/actions";
import { useT } from "@/i18n/client";

export function LocaleSwitch() {
  const { locale } = useT();
  const [pending, start] = useTransition();
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border text-xs" aria-busy={pending}>
      {(["km", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() => start(() => setLocale(l))}
          className={`px-2.5 py-1 ${locale === l ? "bg-accent text-accent-fg" : "bg-surface hover:bg-background"}`}
        >
          {l === "km" ? "ខ្មែរ" : "EN"}
        </button>
      ))}
    </div>
  );
}
