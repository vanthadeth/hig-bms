import Link from "next/link";
import { can, requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/i18n/server";
import { Badge, btnCls, Card, PageHeader } from "@/components/ui";

export default async function RolesPage() {
  await requirePermission("admin.roles", "view");
  const { t } = await getT();
  const supabase = await createClient();
  const [{ data: roles }, canCreate] = await Promise.all([
    supabase.from("roles").select("id, code, name, description, is_system, is_active, user_roles(count)").order("name"),
    can("admin.roles", "create"),
  ]);

  return (
    <>
      <PageHeader
        title={t("roles.title")}
        actions={canCreate ? <Link href="/roles/new" className={btnCls}>{t("roles.new")}</Link> : null}
      />
      <Card>
        {!roles?.length ? (
          <p className="text-sm text-muted">{t("common.noData")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-2 font-medium">{t("common.name")}</th>
                <th className="py-2 font-medium">{t("common.code")}</th>
                <th className="py-2 font-medium">{t("roles.members")}</th>
                <th className="py-2 font-medium">{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2">
                    <Link href={`/roles/${r.id}`} className="font-medium text-accent hover:underline">{r.name}</Link>
                    {r.is_system && <span className="ml-2"><Badge tone="muted">{t("common.system")}</Badge></span>}
                    {r.description && <div className="text-xs text-muted">{r.description}</div>}
                  </td>
                  <td className="py-2 font-mono text-xs">{r.code}</td>
                  <td className="py-2">{r.user_roles?.[0]?.count ?? 0}</td>
                  <td className="py-2">
                    <Badge tone={r.is_active ? "ok" : "muted"}>{t(r.is_active ? "common.active" : "common.inactive")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
