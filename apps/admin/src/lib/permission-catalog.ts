import "server-only";
import { getActions, getModuleActions, getModules, getScopes } from "@/lib/catalog";
import { appLabel, moduleName } from "@/i18n/module-name";
import type { MessageKey } from "@/i18n/messages";
import type { EditorGroup, ScopeInfo } from "@/components/permission-editor";

/** Everything the permission editor / effective view needs, grouped by app, with module names localised. */
export async function buildPermissionCatalog(t: (k: MessageKey) => string): Promise<{ groups: EditorGroup[]; scopes: ScopeInfo[] }> {
  const [modules, actions, moduleActions, scopeRows] = await Promise.all([getModules(), getActions(), getModuleActions(), getScopes()]);
  const order = new Map(actions.map((a, i) => [a.code, i]));

  const groups: EditorGroup[] = [];
  for (const m of modules) {
    const acts = moduleActions
      .filter((x) => x.module_id === m.id)
      .sort((a, b) => (order.get(a.action) ?? 99) - (order.get(b.action) ?? 99))
      .map((x) => ({ action: x.action, scoped: x.scoped }));
    if (!acts.length) continue;
    let g = groups.find((x) => x.app === m.app);
    if (!g) groups.push((g = { app: m.app, label: appLabel(m.app), modules: [] }));
    g.modules.push({ id: m.id, code: m.code, name: moduleName(t, m.code, m.name), actions: acts });
  }
  return { groups, scopes: scopeRows.map((s) => ({ code: s.code, rank: s.rank })) };
}
