"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { btnDangerCls, btnGhostCls } from "@/components/ui";
import { resultText } from "@/components/error-text";
import { setUserActive, setUserRole } from "../actions";

export function ActiveToggle({ userId, active }: { userId: string; active: boolean }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className={active ? btnDangerCls : btnGhostCls}
        onClick={() =>
          start(async () => {
            const res = await setUserActive(userId, !active);
            setMsg(res.ok ? null : resultText(t, res));
          })
        }
      >
        {t(active ? "users.deactivate" : "users.activate")}
      </button>
      {msg && <p className="mt-2 text-sm text-bad">{msg}</p>}
    </div>
  );
}

export function RoleCheckboxes({
  userId,
  roles,
  assigned,
  disabled,
}: {
  userId: string;
  roles: { id: string; name: string; code: string; is_active: boolean }[];
  assigned: string[];
  disabled?: boolean;
}) {
  const { t } = useT();
  const [set, setSet] = useState(new Set(assigned));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(roleId: string, on: boolean) {
    const prev = new Set(set);
    const next = new Set(set);
    if (on) next.add(roleId);
    else next.delete(roleId);
    setSet(next);
    setMsg(null);
    start(async () => {
      const res = await setUserRole(userId, roleId, on);
      if (!res.ok) {
        setSet(prev);
        setMsg(resultText(t, res));
      }
    });
  }

  return (
    <div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {roles.map((r) => (
          <li key={r.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={set.has(r.id)}
                disabled={disabled || pending}
                onChange={(e) => toggle(r.id, e.target.checked)}
              />
              <span>{r.name}</span>
              <span className="text-xs text-muted">{r.code}</span>
              {!r.is_active && <span className="text-xs text-muted">({t("common.inactive")})</span>}
            </label>
          </li>
        ))}
      </ul>
      {msg && <p className="mt-2 text-sm text-bad">{msg}</p>}
    </div>
  );
}
