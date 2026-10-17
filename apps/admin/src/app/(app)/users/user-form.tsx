"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { Field } from "@/components/ui";
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
  reports_to?: string | null;
};

export type ManagerOption = { id: string; name: string };

export function UserForm({
  mode,
  defaults = {},
  action,
  canEdit = true,
  managers = [],
  selfId,
}: {
  mode: "create" | "edit";
  defaults?: UserDefaults;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  canEdit?: boolean;
  managers?: ManagerOption[];
  selfId?: string;
}) {
  const { t } = useT();
  const [state, formAction, pending] = useActionState(action, undefined);
  const msg = resultText(t, state);
  const d = defaults;

  return (
    <form action={formAction} className="stack-lg">
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} className="stack-lg">
        <section className="card card-pad">
          <h2 style={{ marginBottom: 14 }}>{t("users.account")}</h2>
          <div className="form-grid">
            <Field label={t("users.email")}>
              <input className="input" name="email" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" defaultValue={d.email} required readOnly={mode === "edit"} />
            </Field>
            <Field label={t("users.username")}>
              <input className="input" name="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} defaultValue={d.username} required pattern="[a-z0-9._\-]{3,40}" />
            </Field>
            <Field label={t("users.phone")}>
              <input className="input" name="phone" type="tel" inputMode="tel" autoComplete="off" defaultValue={d.phone ?? ""} />
            </Field>
            {mode === "create" && (
              <Field label={t("users.password")} hint={t("users.passwordHint")}>
                <input className="input" name="password" type="password" minLength={8} required autoComplete="new-password" />
              </Field>
            )}
          </div>
        </section>

        <section className="card card-pad">
          <h2 style={{ marginBottom: 14 }}>{t("users.profile")}</h2>
          <div className="form-grid">
            <Field label={t("users.fullName")}>
              <input className="input" name="full_name" autoComplete="off" defaultValue={d.full_name} required />
            </Field>
            <Field label={t("users.fullNameKm")}>
              <input className="input" name="full_name_km" autoComplete="off" defaultValue={d.full_name_km ?? ""} />
            </Field>
            <Field label={t("users.employeeCode")}>
              <input className="input" name="employee_code" autoCapitalize="characters" defaultValue={d.employee_code ?? ""} />
            </Field>
            <Field label={t("users.position")}>
              <input className="input" name="position" defaultValue={d.position ?? ""} />
            </Field>
            <Field label={t("users.department")}>
              <input className="input" name="department" defaultValue={d.department ?? ""} />
            </Field>
            <div className="form-span">
              <Field label={t("users.reportsTo")} hint={t("users.reportsToHint")}>
                <select className="select" name="reports_to" defaultValue={defaults.reports_to ?? ""}>
                  <option value="">{t("users.noManager")}</option>
                  {managers.filter((m) => m.id !== selfId).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t("users.hireDate")}>
              <input className="input" name="hire_date" type="date" defaultValue={d.hire_date ?? ""} />
            </Field>
            <Field label={t("users.gender")}>
              <select className="select" name="gender" defaultValue={d.gender ?? ""}>
                <option value="">—</option>
                <option value="male">{t("users.gender.male")}</option>
                <option value="female">{t("users.gender.female")}</option>
                <option value="other">{t("users.gender.other")}</option>
              </select>
            </Field>
            <Field label={t("users.dob")}>
              <input className="input" name="date_of_birth" type="date" defaultValue={d.date_of_birth ?? ""} />
            </Field>
            <div className="form-span">
              <Field label={t("users.address")}>
                <input className="input" name="address" autoComplete="street-address" defaultValue={d.address ?? ""} />
              </Field>
            </div>
            <Field label={t("users.emergencyName")}>
              <input className="input" name="emergency_contact_name" defaultValue={d.emergency_contact_name ?? ""} />
            </Field>
            <Field label={t("users.emergencyPhone")}>
              <input className="input" name="emergency_contact_phone" type="tel" inputMode="tel" defaultValue={d.emergency_contact_phone ?? ""} />
            </Field>
            <Field label={t("users.locale")}>
              <select className="select" name="locale" defaultValue={d.locale ?? "km"}>
                <option value="km">ខ្មែរ</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
        </section>
      </fieldset>

      {msg && (
        <p role="status" className={`msg ${state?.ok ? "msg-ok" : "msg-bad"}`} style={{ margin: 0 }}>
          {msg}
        </p>
      )}
      {canEdit && (
        <div className="form-actions">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {t(mode === "create" ? "common.create" : "common.save")}
          </button>
        </div>
      )}
    </form>
  );
}
