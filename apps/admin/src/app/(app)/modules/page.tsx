import { requirePermission } from "@/lib/auth";
import { getModules } from "@/lib/catalog";
import { getT } from "@/i18n/server";
import { Badge, Card, PageHeader } from "@/components/ui";

export default async function ModulesPage() {
  await requirePermission("admin.modules", "view");
  const [modules, { t }] = await Promise.all([getModules(), getT()]);
  return (
    <>
      <PageHeader title={t("modules.title")} />
      <Card hint={t("modules.hint")}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-2 font-medium">{t("common.name")}</th>
              <th className="py-2 font-medium">{t("common.code")}</th>
              <th className="py-2 font-medium">{t("modules.app")}</th>
              <th className="py-2 font-medium">{t("common.status")}</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="py-2">{m.name}</td>
                <td className="py-2 font-mono text-xs">{m.code}</td>
                <td className="py-2">{m.app}</td>
                <td className="py-2">
                  <Badge tone={m.is_active ? "ok" : "muted"}>{t(m.is_active ? "common.active" : "common.inactive")}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
