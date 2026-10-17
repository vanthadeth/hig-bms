import { requirePermission } from "@/lib/auth";
import { getActions, getModuleActions, getModules } from "@/lib/catalog";
import { getT } from "@/i18n/server";
import { appLabel, moduleName } from "@/i18n/module-name";
import type { MessageKey } from "@/i18n/messages";
import { PageHeader, StatusPill } from "@/components/ui";

export const metadata = { title: "Modules" };

export default async function ModulesPage() {
  await requirePermission("admin.modules", "view");
  const [modules, actions, moduleActions, { t }] = await Promise.all([getModules(), getActions(), getModuleActions(), getT()]);
  const apps = [...new Set(modules.map((m) => m.app))];
  const order = new Map(actions.map((a, i) => [a.code, i]));

  return (
    <>
      <PageHeader title={t("modules.title")} lead={t("modules.lead")} />
      <div className="stack-lg">
        {apps.map((app) => (
          <div key={app}>
            <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: "var(--fg-3)", margin: "0 2px 8px" }}>{appLabel(app)}</div>
            <div className="card" style={{ overflow: "hidden" }}>
              {modules
                .filter((m) => m.app === app)
                .map((m) => {
                  const acts = moduleActions.filter((x) => x.module_id === m.id).sort((a, b) => (order.get(a.action) ?? 99) - (order.get(b.action) ?? 99));
                  return (
                    <div key={m.id} className="row" style={{ gridTemplateColumns: "minmax(0,1fr) auto", cursor: "default" }}>
                      <div className="row-main">
                        <b>{moduleName(t, m.code, m.name)}</b>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{m.code}</span>
                        <span style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, overflow: "visible", whiteSpace: "normal" }}>
                          {acts.map((a) => (
                            <span key={a.action} className="pill" title={a.scoped ? t("modules.takesScope") : undefined}>
                              {t(`action.${a.action}` as MessageKey)}
                              {a.scoped && <small style={{ opacity: 0.7 }}>· {t("scope.own")}/{t("scope.team")}/{t("scope.all")}</small>}
                            </span>
                          ))}
                        </span>
                      </div>
                      <StatusPill active={m.is_active} activeLabel={t("common.active")} inactiveLabel={t("common.inactive")} />
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
      <p style={{ color: "var(--fg-3)", marginTop: 14 }}>{t("modules.hint")}</p>
    </>
  );
}
