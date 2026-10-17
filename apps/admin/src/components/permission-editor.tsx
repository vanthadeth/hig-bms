"use client";

import { useId, useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import type { ActionResult } from "@/lib/auth";
import type { PermEntry, PermState } from "@/app/permission-actions";
import { resultText } from "./error-text";
import { IconCheck, IconX } from "./shell/icons";

export type EditorAction = { action: string; scoped: boolean };
export type EditorModule = { id: string; code: string; name: string; actions: EditorAction[] };
export type EditorGroup = { app: string; label: string; modules: EditorModule[] };
export type ScopeInfo = { code: string; rank: number };

const WIDEST = (scopes: ScopeInfo[]) => [...scopes].sort((a, b) => b.rank - a.rank)[0]?.code as PermState | undefined;

/** Options for one action, narrow to wide. Scoped actions pick a reach; the others just allow. */
function optionsFor(a: EditorAction, scopes: ScopeInfo[]): PermState[] {
  return a.scoped
    ? ["inherit", ...([...scopes].sort((x, y) => x.rank - y.rank).map((s) => s.code) as PermState[]), "denied"]
    : ["inherit", "allowed", "denied"];
}

/** Dots show how far a scope reaches without relying on color or language. */
export function ScopeDots({ level, scopes }: { level: string; scopes: ScopeInfo[] }) {
  const rank = scopes.find((s) => s.code === level)?.rank ?? 0;
  return (
    <span className="dots" aria-hidden>
      {scopes.map((s) => (
        <i key={s.code} className={s.rank <= rank ? "on" : ""} />
      ))}
    </span>
  );
}

/**
 * Permission editor. For every action of every module choose:
 *   Not set | Own / Team / All (actions that take a scope) | Allowed (actions that do not) | Denied
 * Changes save immediately and are rolled back if the server refuses (it re-checks permission).
 */
export default function PermissionEditor({
  groups,
  scopes,
  initial,
  disabled,
  onChange,
}: {
  groups: EditorGroup[];
  scopes: ScopeInfo[];
  initial: Record<string, PermState>;
  disabled?: boolean;
  onChange: (entries: PermEntry[]) => Promise<ActionResult>;
}) {
  const { t } = useT();
  const uid = useId();
  const [values, setValues] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const get = (moduleId: string, action: string): PermState => values[`${moduleId}:${action}`] ?? "inherit";

  function apply(entries: PermEntry[]) {
    const prev = values;
    setValues((v) => {
      const next = { ...v };
      for (const e of entries) {
        if (e.state === "inherit") delete next[`${e.moduleId}:${e.action}`];
        else next[`${e.moduleId}:${e.action}`] = e.state;
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

  const full = (m: EditorModule): PermEntry[] =>
    m.actions.map((a) => ({ moduleId: m.id, action: a.action, state: a.scoped ? (WIDEST(scopes) ?? "all") : "allowed" }));
  const clear = (m: EditorModule): PermEntry[] => m.actions.map((a) => ({ moduleId: m.id, action: a.action, state: "inherit" as const }));

  const label = (s: PermState): string => (s === "inherit" ? t("perm.inherit") : s === "denied" ? t("perm.denied") : "");

  let granted = 0;
  let denied = 0;
  let total = 0;
  for (const g of groups) for (const m of g.modules) total += m.actions.length;
  for (const s of Object.values(values)) {
    if (s === "denied") denied++;
    else if (s !== "inherit") granted++;
  }

  return (
    <div className="card" style={{ overflow: "clip" }}>
      <details className="pe-help">
        <summary>{t("perm.help")}</summary>
        <dl>
          {[...scopes].sort((a, b) => a.rank - b.rank).map((s) => (
            <div key={s.code}>
              <dt>
                <ScopeDots level={s.code} scopes={scopes} /> {t(`scope.${s.code}` as MessageKey)}
              </dt>
              <dd>{t(`scope.${s.code}.desc` as MessageKey)}</dd>
            </div>
          ))}
        </dl>
      </details>
      {!disabled && <p style={{ margin: 0, padding: "0 16px 12px", color: "var(--fg-3)", fontSize: 14 }}>{t("perm.hint")}</p>}
      {msg && <p role="alert" className="msg msg-bad" style={{ margin: "0 16px 12px" }}>{msg}</p>}

      {groups.map((g) => (
        <div key={g.app}>
          <div className="pm-group">{g.label}</div>
          {g.modules.map((m) => (
            <div key={m.id} className="pe-mod">
              <div className="pe-mod-head">
                <div style={{ minWidth: 0 }}>
                  <b style={{ display: "block", fontWeight: 650 }}>{m.name}</b>
                  <small style={{ display: "block", color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{m.code}</small>
                </div>
                {!disabled && (
                  <div className="pe-tools">
                    <button type="button" className="pe-tool" disabled={pending} onClick={() => apply(full(m))}>{t("perm.fullAccess")}</button>
                    <button type="button" className="pe-tool" disabled={pending} onClick={() => apply(clear(m))}>{t("perm.clear")}</button>
                  </div>
                )}
              </div>

              <div className="pe-rows">
                {m.actions.map((a) => {
                  const state = get(m.id, a.action);
                  const labelId = `${uid}-${m.id}-${a.action}`;
                  const actionName = t(`action.${a.action}` as MessageKey);
                  return (
                    <div key={a.action} className="pe-row">
                      <span id={labelId} className="pe-label">{actionName}</span>
                      <div className="pe-seg" role="radiogroup" aria-labelledby={labelId} aria-label={t("perm.choose", { module: m.name, action: actionName })}>
                        {optionsFor(a, scopes).map((o) => (
                          <label key={o} className="pe-opt" data-s={o} data-end={o === "inherit" || o === "denied" ? "1" : undefined}>
                            <input
                              type="radio"
                              name={`${uid}-${m.id}-${a.action}`}
                              value={o}
                              checked={state === o}
                              disabled={disabled || pending}
                              onChange={() => apply([{ moduleId: m.id, action: a.action, state: o }])}
                            />
                            <span title={o === "inherit" || o === "denied" ? label(o) : undefined}>
                              {o === "denied" ? (
                                <>
                                  <IconX width={14} height={14} />
                                  <span className="sr-only-always">{t("perm.denied")}</span>
                                </>
                              ) : o === "allowed" ? (
                                <>
                                  <IconCheck width={14} height={14} /> {t("perm.allowed")}
                                </>
                              ) : o === "inherit" ? (
                                <>
                                  –<span className="sr-only-always">{t("perm.inherit")}</span>
                                </>
                              ) : (
                                t(`scope.${o}` as MessageKey)
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="pm-sum" aria-live="polite">
        <span>
          <span className="pm-bar"><i style={{ width: `${total ? Math.round((granted / total) * 100) : 0}%` }} /></span>
          {t("perm.sum", { a: granted, d: denied })}
        </span>
        <span>{t("perm.of", { t: total })}</span>
      </div>
    </div>
  );
}
