"use client";

import { useActionState, useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { btnCls, btnDangerCls, Field, inputCls } from "@/components/ui";
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
    <form action={formAction} className="space-y-4">
      <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.code")} hint={mode === "create" ? t("roles.codeHint") : undefined}>
          <input name="code" defaultValue={defaults?.code} required readOnly={mode === "edit"} pattern="[a-z][a-z0-9_]*" className={inputCls} />
        </Field>
        <Field label={t("common.name")}>
          <input name="name" defaultValue={defaults?.name} required className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t("common.description")}>
            <input name="description" defaultValue={defaults?.description ?? ""} className={inputCls} />
          </Field>
        </div>
        {mode === "edit" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={defaults?.is_active ?? true} />
            {t("common.active")}
          </label>
        )}
      </fieldset>
      {msg && (
        <p role="status" className={`rounded-md px-3 py-2 text-sm ${state?.ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}>
          {msg}
        </p>
      )}
      {!locked && (
        <button type="submit" disabled={pending} className={btnCls}>
          {t(mode === "create" ? "common.create" : "common.save")}
        </button>
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
        className={btnDangerCls}
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
      {msg && <p className="mt-2 text-sm text-bad">{msg}</p>}
    </div>
  );
}
