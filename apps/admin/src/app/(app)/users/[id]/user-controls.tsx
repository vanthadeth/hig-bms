"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
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
        className={`btn ${active ? "btn-danger" : ""}`}
        onClick={() =>
          start(async () => {
            const res = await setUserActive(userId, !active);
            setMsg(res.ok ? null : resultText(t, res));
          })
        }
      >
        {t(active ? "users.deactivate" : "users.activate")}
      </button>
      {msg && <p className="msg msg-bad" style={{ marginTop: 8 }}>{msg}</p>}
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
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid" }}>
        {roles.map((r, i) => (
          <li key={r.id} style={{ borderTop: i ? "1px solid var(--line)" : 0 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 56, padding: "6px 2px", cursor: disabled ? "default" : "pointer" }}>
              <input
                type="checkbox"
                checked={set.has(r.id)}
                disabled={disabled || pending}
                onChange={(e) => toggle(r.id, e.target.checked)}
                style={{ width: 22, height: 22, accentColor: "var(--accent)", flex: "none" }}
              />
              <span style={{ minWidth: 0, flex: 1 }}>
                <b style={{ display: "block", fontWeight: 650 }}>{r.name}</b>
                <span style={{ color: "var(--fg-3)", fontSize: 13, fontFamily: "var(--font-mono)" }}>{r.code}</span>
              </span>
              {!r.is_active && <span className="pill pill-off">{t("common.inactive")}</span>}
            </label>
          </li>
        ))}
      </ul>
      {msg && <p className="msg msg-bad" style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}
