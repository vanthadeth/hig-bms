"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import type { ActionResult } from "@/lib/auth";
import type { PermEntry, PermState } from "@/app/permission-actions";
import { resultText } from "./error-text";
import { IconCheck, IconDot, IconX } from "./shell/icons";

export type MatrixModule = { id: string; code: string; name: string };
export type MatrixGroup = { app: string; label: string; modules: MatrixModule[] };
export type MatrixScope = { code: string };

const NEXT: Record<PermState, PermState> = { inherit: "allowed", allowed: "denied", denied: "inherit" };
const STATE_KEY: Record<PermState, MessageKey> = { inherit: "perm.inherit", allowed: "perm.allowed", denied: "perm.denied" };
const dataS = (s: PermState) => (s === "allowed" ? "a" : s === "denied" ? "d" : "i");
const StateIcon = ({ s }: { s: PermState }) => (s === "allowed" ? <IconCheck /> : s === "denied" ? <IconX /> : <IconDot />);

/**
 * Module x action grid. Tap an action to cycle: not set -> allowed -> denied.
 * Phone: one card per module with large buttons. Desktop: a table-like grid with column headers.
 * Changes are optimistic and rolled back if the server action (which re-checks permission) refuses.
 */
export default function PermissionMatrix({
  groups,
  scopes,
  initial,
  disabled,
  onChange,
}: {
  groups: MatrixGroup[];
  scopes: MatrixScope[];
  initial: Record<string, PermState>;
  disabled?: boolean;
  onChange: (entries: PermEntry[]) => Promise<ActionResult>;
}) {
  const { t } = useT();
  const [values, setValues] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const get = (moduleId: string, scope: string): PermState => values[`${moduleId}:${scope}`] ?? "inherit";
  const all = groups.flatMap((g) => g.modules);

  function apply(entries: PermEntry[]) {
    const prev = values;
    setValues((v) => {
      const next = { ...v };
      for (const e of entries) {
        if (e.state === "inherit") delete next[`${e.moduleId}:${e.scope}`];
        else next[`${e.moduleId}:${e.scope}`] = e.state;
      }
      return next;
    });
    setMsg(null);
    start(async () => {
      const res = await onChange(entries);
      if (!res.ok) {
        setValues(prev);
        setMsg(resultText(t, res));
      }
    });
  }

  const cycle = (moduleId: string, scope: string) => apply([{ moduleId, scope, state: NEXT[get(moduleId, scope)] }]);

  /** If every target is already allowed, clear them; otherwise allow them all. */
  function bulk(targets: { moduleId: string; scope: string }[]) {
    const allOn = targets.every((x) => get(x.moduleId, x.scope) === "allowed");
    apply(targets.map((x) => ({ ...x, state: allOn ? "inherit" : "allowed" })));
  }

  let allowed = 0;
  let denied = 0;
  for (const s of Object.values(values)) {
    if (s === "allowed") allowed++;
    else if (s === "denied") denied++;
  }
  const total = all.length * scopes.length;

  return (
    <div className="card" style={{ overflow: "clip" }}>
      <div className="pm-legend">
        <span><i data-s="a"><IconCheck width={13} height={13} /></i>{t("perm.allowed")}</span>
        <span><i data-s="d"><IconX width={11} height={11} /></i>{t("perm.denied")}</span>
        <span><i><IconDot /></i>{t("perm.legend.inherit")}</span>
      </div>
      {!disabled && <p style={{ margin: 0, padding: "0 16px 12px", color: "var(--fg-3)", fontSize: 14 }}>{t("perm.hint")}</p>}
      {msg && <p role="alert" className="msg msg-bad" style={{ margin: "0 16px 12px" }}>{msg}</p>}

      <div className="pm-head" aria-hidden={disabled || undefined}>
        <span>{t("perm.module")}</span>
        {scopes.map((s) => (
          <button key={s.code} type="button" disabled={disabled || pending} onClick={() => bulk(all.map((m) => ({ moduleId: m.id, scope: s.code })))}>
            {t(`scope.${s.code}` as MessageKey)}
          </button>
        ))}
      </div>

      {groups.map((g) => (
        <div key={g.app}>
          <div className="pm-group">{g.label}</div>
          {g.modules.map((m) => (
            <div key={m.id} className="pm-mod">
              <div className="pm-name">
                <div style={{ minWidth: 0 }}>
                  <b>{m.name}</b>
                  <small>{m.code}</small>
                </div>
                <button type="button" className="pm-all" disabled={disabled || pending} onClick={() => bulk(scopes.map((s) => ({ moduleId: m.id, scope: s.code })))}>
                  {t("perm.setAll")}
                </button>
              </div>
              <div className="pm-cells">
                {scopes.map((s) => {
                  const state = get(m.id, s.code);
                  const label = t(`scope.${s.code}` as MessageKey);
                  return (
                    <button
                      key={s.code}
                      type="button"
                      className="pm-cell"
                      data-s={dataS(state)}
                      disabled={disabled || pending}
                      onClick={() => cycle(m.id, s.code)}
                      aria-label={`${m.name}, ${label}: ${t(STATE_KEY[state])}`}
                    >
                      <StateIcon s={state} />
                      <span className="pm-label">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="pm-sum" aria-live="polite">
        <span>
          <span className="pm-bar"><i style={{ width: `${total ? Math.round((allowed / total) * 100) : 0}%` }} /></span>
          {t("perm.sum", { a: allowed, d: denied })}
        </span>
        <span>{t("perm.of", { t: total })}</span>
      </div>
    </div>
  );
}
