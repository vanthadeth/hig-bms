"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import type { ActionResult } from "@/lib/auth";
import type { PermState } from "@/app/permission-actions";
import { resultText } from "./error-text";

export type MatrixModule = { id: string; app: string; code: string; name: string };
export type MatrixScope = { code: string; name: string };

const NEXT: Record<PermState, PermState> = { inherit: "allowed", allowed: "denied", denied: "inherit" };

const CELL: Record<PermState, string> = {
  inherit: "border-border bg-surface text-muted",
  allowed: "border-ok bg-ok-bg text-ok",
  denied: "border-bad bg-bad-bg text-bad",
};
const GLYPH: Record<PermState, string> = { inherit: "–", allowed: "✓", denied: "✕" };
const LABEL: Record<PermState, MessageKey> = {
  inherit: "perm.inherit",
  allowed: "perm.allowed",
  denied: "perm.denied",
};

/**
 * Module x scope grid. Click a cell to cycle: not set -> allowed -> denied.
 * `values` keys are "<moduleId>:<scope>". Writes go through a server action,
 * which re-checks permission; the grid itself is only a view.
 */
export function PermissionMatrix({
  modules,
  scopes,
  initial,
  disabled,
  onChange,
}: {
  modules: MatrixModule[];
  scopes: MatrixScope[];
  initial: Record<string, PermState>;
  disabled?: boolean;
  onChange: (moduleId: string, scope: string, state: PermState) => Promise<ActionResult>;
}) {
  const { t } = useT();
  const [values, setValues] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function cycle(moduleId: string, scope: string) {
    const key = `${moduleId}:${scope}`;
    const prev = values[key] ?? "inherit";
    const next = NEXT[prev];
    setValues((v) => ({ ...v, [key]: next }));
    setMsg(null);
    start(async () => {
      const res = await onChange(moduleId, scope, next);
      if (!res.ok) {
        setValues((v) => ({ ...v, [key]: prev })); // roll back
        setMsg(resultText(t, res));
      }
    });
  }

  return (
    <div>
      {msg && <p className="mb-3 rounded-md bg-bad-bg px-3 py-2 text-sm text-bad">{msg}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-2 pr-4 font-medium">{t("nav.modules")}</th>
              {scopes.map((s) => (
                <th key={s.code} className="px-1 py-2 text-center font-medium">
                  {t(`scope.${s.code}` as MessageKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="py-2 pr-4">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted">{m.code}</div>
                </td>
                {scopes.map((s) => {
                  const state = values[`${m.id}:${s.code}`] ?? "inherit";
                  return (
                    <td key={s.code} className="px-1 py-2 text-center">
                      <button
                        type="button"
                        disabled={disabled || pending}
                        onClick={() => cycle(m.id, s.code)}
                        title={t(LABEL[state])}
                        aria-label={`${m.name} ${s.name}: ${t(LABEL[state])}`}
                        className={`h-8 w-8 rounded-md border text-base font-semibold disabled:cursor-not-allowed ${CELL[state]}`}
                      >
                        {GLYPH[state]}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
