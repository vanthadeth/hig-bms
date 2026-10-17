"use client";

import { createContext, useContext, type ReactNode } from "react";
import { translate, type Locale, type MessageKey } from "./messages";

const LocaleContext = createContext<Locale>("km");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useT() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
  };
}
