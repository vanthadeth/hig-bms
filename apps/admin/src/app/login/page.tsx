"use client";

import { useActionState } from "react";
import { signIn } from "./actions";
import { useT } from "@/i18n/client";
import { LocaleSwitch } from "@/components/locale-switch";
import { btnCls, Field, inputCls } from "@/components/ui";

export default function LoginPage() {
  const { t } = useT();
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="mb-4 flex justify-end">
        <LocaleSwitch />
      </div>
      <form action={action} className="rounded-lg border border-border bg-surface p-6">
        <h1 className="mb-1 text-xl font-semibold">{t("app.name")}</h1>
        <p className="mb-5 text-sm text-muted">{t("login.title")}</p>
        <div className="space-y-4">
          <Field label={t("login.email")}>
            <input name="email" type="email" autoComplete="username" required className={inputCls} />
          </Field>
          <Field label={t("login.password")}>
            <input name="password" type="password" autoComplete="current-password" required className={inputCls} />
          </Field>
          {state?.error && (
            <p role="alert" className="rounded-md bg-bad-bg px-3 py-2 text-sm text-bad">
              {t(state.error === "inactive" ? "login.inactive" : "login.invalid")}
            </p>
          )}
          <button type="submit" disabled={pending} className={`${btnCls} w-full`}>
            {t("login.submit")}
          </button>
        </div>
      </form>
    </main>
  );
}
