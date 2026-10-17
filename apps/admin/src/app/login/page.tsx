"use client";

import { useActionState, useState } from "react";
import { signIn } from "./actions";
import { useT } from "@/i18n/client";
import { Logo } from "@/components/logo";
import { LocaleSeg } from "@/components/shell/locale-seg";
import { Field } from "@/components/ui";

export default function LoginPage() {
  const { t } = useT();
  const [state, action, pending] = useActionState(signIn, undefined);
  const [show, setShow] = useState(false);

  return (
    <main className="center-screen">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <LocaleSeg />
      </div>
      <form action={action} className="card auth-card" noValidate={false}>
        <Logo size={56} />
        <span className="green-rule" />
        <h1 style={{ margin: "0 0 4px", fontSize: 28, lineHeight: 1.2, fontWeight: 650, letterSpacing: "-0.015em" }}>{t("login.title")}</h1>
        <p style={{ margin: "0 0 22px", color: "var(--fg-3)" }}>{t("login.lead")}</p>

        <div className="stack">
          <Field label={t("login.email")}>
            <input className="input" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
          </Field>
          <Field label={t("login.password")}>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                style={{ paddingRight: 76 }}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-pressed={show}
                style={{ position: "absolute", right: 4, top: 4, bottom: 4, minWidth: 64, border: 0, background: "transparent", color: "var(--accent)", fontWeight: 600, borderRadius: 8 }}
              >
                {t(show ? "login.hide" : "login.show")}
              </button>
            </div>
          </Field>
          {state?.error && (
            <p role="alert" className="msg msg-bad" style={{ margin: 0 }}>
              {t(state.error === "inactive" ? "login.inactive" : "login.invalid")}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn btn-primary btn-block" style={{ minHeight: 48 }}>
            {t("login.submit")}
          </button>
        </div>
      </form>
    </main>
  );
}
