"use client";

import { useActionState, useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { Field } from "@/components/ui";
import { resultText } from "@/components/error-text";
import type { FormState } from "../users/actions";
import { deleteRole } from "./actions";

export function RoleForm({
  mode,
  action,
  defaults,
  locked,
}: {
  mode: "create" | "edit";
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  defaults?: { code?: string; name?: string; description?: string | null; is_active?: boolean };
  locked?: boolean;
}) {
  const { t } = useT();
  const [state, formAction, pending] = useActionState(action, undefined);
  const msg = resultText(t, state);
  return (
    <form action={formAction} className="stack-lg">
      <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <section className="card card-pad">
          <div className="form-grid">
            <Field label={t("common.code")} hint={mode === "create" ? t("roles.codeHint") : undefined}>
              <input className="input" name="code" autoCapitalize="none" autoCorrect="off" spellCheck={false} defaultValue={defaults?.code} required readOnly={mode === "edit"} pattern="[a-z][a-z0-9_]*" />
            </Field>
            <Field label={t("common.name")}>
              <input className="input" name="name" defaultValue={defaults?.name} required />
            </Field>
            <div className="form-span">
              <Field label={t("common.description")}>
                <input className="input" name="description" defaultValue={defaults?.description ?? ""} />
              </Field>
            </div>
            {mode === "edit" && (
              <label style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 46 }}>
                <input type="checkbox" name="is_active" defaultChecked={defaults?.is_active ?? true} style={{ width: 22, height: 22, accentColor: "var(--accent)" }} />
                <span style={{ fontWeight: 600 }}>{t("common.active")}</span>
              </label>
            )}
          </div>
        </section>
      </fieldset>
      {msg && (
        <p role="status" className={`msg ${state?.ok ? "msg-ok" : "msg-bad"}`} style={{ margin: 0 }}>
          {msg}
        </p>
      )}
      {!locked && (
        <div className="form-actions">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {t(mode === "create" ? "common.create" : "common.save")}
          </button>
        </div>
      )}
    </form>
  );
}

export function DeleteRoleButton({ roleId }: { roleId: string }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="btn btn-danger"
        onClick={() => {
          if (!confirm(t("roles.confirmDelete"))) return;
          start(async () => {
            const res = await deleteRole(roleId);
            if (res && !res.ok) setMsg(resultText(t, res));
          });
        }}
      >
        {t("common.delete")}
      </button>
      {msg && <p className="msg msg-bad" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
