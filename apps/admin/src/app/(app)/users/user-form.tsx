"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { btnCls, Field, inputCls } from "@/components/ui";
import { resultText } from "@/components/error-text";
import type { FormState } from "./actions";

export type UserDefaults = {
  email?: string;
  username?: string;
  phone?: string | null;
  full_name?: string;
  full_name_km?: string | null;
  employee_code?: string | null;
  position?: string | null;
  department?: string | null;
  hire_date?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  locale?: string;
};

export function UserForm({
  mode,
  defaults = {},
  action,
  canEdit = true,
}: {
  mode: "create" | "edit";
  defaults?: UserDefaults;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  canEdit?: boolean;
}) {
  const { t } = useT();
  const [state, formAction, pending] = useActionState(action, undefined);
  const msg = resultText(t, state);
  const d = defaults;
  const ro = !canEdit;

  return (
    <form action={formAction} className="space-y-6">
      <fieldset disabled={ro} className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted">{t("users.account")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("users.email")}>
              <input name="email" type="email" defaultValue={d.email} required readOnly={mode === "edit"} className={inputCls} />
            </Field>
            <Field label={t("users.username")}>
              <input name="username" defaultValue={d.username} required pattern="[a-z0-9._\-]{3,40}" className={inputCls} />
            </Field>
            <Field label={t("users.phone")}>
              <input name="phone" defaultValue={d.phone ?? ""} className={inputCls} />
            </Field>
            {mode === "create" && (
              <Field label={t("users.password")} hint={t("users.passwordHint")}>
                <input name="password" type="password" minLength={8} required autoComplete="new-password" className={inputCls} />
              </Field>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted">{t("users.profile")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("users.fullName")}>
              <input name="full_name" defaultValue={d.full_name} required className={inputCls} />
            </Field>
            <Field label={t("users.fullNameKm")}>
              <input name="full_name_km" defaultValue={d.full_name_km ?? ""} className={inputCls} />
            </Field>
            <Field label={t("users.employeeCode")}>
              <input name="employee_code" defaultValue={d.employee_code ?? ""} className={inputCls} />
            </Field>
            <Field label={t("users.position")}>
              <input name="position" defaultValue={d.position ?? ""} className={inputCls} />
            </Field>
            <Field label={t("users.department")}>
              <input name="department" defaultValue={d.department ?? ""} className={inputCls} />
            </Field>
            <Field label={t("users.hireDate")}>
              <input name="hire_date" type="date" defaultValue={d.hire_date ?? ""} className={inputCls} />
            </Field>
            <Field label={t("users.gender")}>
              <select name="gender" defaultValue={d.gender ?? ""} className={inputCls}>
                <option value="">—</option>
                <option value="male">{t("users.gender.male")}</option>
                <option value="female">{t("users.gender.female")}</option>
                <option value="other">{t("users.gender.other")}</option>
              </select>
            </Field>
            <Field label={t("users.dob")}>
              <input name="date_of_birth" type="date" defaultValue={d.date_of_birth ?? ""} className={inputCls} />
            </Field>
            <Field label={t("users.address")}>
              <input name="address" defaultValue={d.address ?? ""} className={inputCls} />
            </Field>
            <Field label={t("users.locale")}>
              <select name="locale" defaultValue={d.locale ?? "km"} className={inputCls}>
                <option value="km">ខ្មែរ</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field label={t("users.emergencyName")}>
              <input name="emergency_contact_name" defaultValue={d.emergency_contact_name ?? ""} className={inputCls} />
            </Field>
            <Field label={t("users.emergencyPhone")}>
              <input name="emergency_contact_phone" defaultValue={d.emergency_contact_phone ?? ""} className={inputCls} />
            </Field>
          </div>
        </div>
      </fieldset>

      {msg && (
        <p role="status" className={`rounded-md px-3 py-2 text-sm ${state?.ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}>
          {msg}
        </p>
      )}
      {!ro && (
        <button type="submit" disabled={pending} className={btnCls}>
          {t(mode === "create" ? "common.create" : "common.save")}
        </button>
      )}
    </form>
  );
}
