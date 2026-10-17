import type { MessageKey } from "@/i18n/messages";
import { IconCheck, IconDot } from "./shell/icons";
import type { EditorGroup, ScopeInfo } from "./permission-editor";
import { ScopeDots } from "./permission-editor";

export type EffectiveRow = { allowed: boolean; scope: string | null; source: string };

/** Read-only: what a user can actually do after roles and overrides. */
export function EffectiveView({
  groups,
  scopes,
  effective,
  t,
}: {
  groups: EditorGroup[];
  scopes: ScopeInfo[];
  effective: Map<string, EffectiveRow>;
  t: (k: MessageKey, v?: Record<string, string | number>) => string;
}) {
  return (
    <div className="card" style={{ overflow: "clip" }}>
      {groups.map((g) => (
        <div key={g.app}>
          <div className="pm-group">{g.label}</div>
          {g.modules.map((m) => (
            <div key={m.id} className="pe-mod">
              <b style={{ display: "block", fontWeight: 650 }}>{m.name}</b>
              <div className="pe-rows">
                {m.actions.map((a) => {
                  const e = effective.get(`${m.code}:${a.action}`);
                  const on = !!e?.allowed;
                  return (
                    <div key={a.action} className="pe-row">
                      <span className="pe-label">{t(`action.${a.action}` as MessageKey)}</span>
                      <span>
                        {on ? (
                          <span className="pill pill-ok" title={e ? t(`perm.source.${e.source}` as MessageKey) : undefined}>
                            {e?.scope ? <ScopeDots level={e.scope} scopes={scopes} /> : <IconCheck width={13} height={13} />}
                            {e?.scope ? t(`scope.${e.scope}` as MessageKey) : t("perm.noScope")}
                            {e?.source === "user" && <sup>*</sup>}
                          </span>
                        ) : (
                          <span className="pill pill-off" title={e ? t(`perm.source.${e.source}` as MessageKey) : undefined}>
                            <IconDot /> {t("perm.notGranted")}
                            {e?.source === "user" && <sup>*</sup>}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
      <p style={{ margin: 0, padding: "10px 16px", borderTop: "1px solid var(--line)", color: "var(--fg-3)", fontSize: 13 }}>* {t("perm.source.user")}</p>
    </div>
  );
}
