import Link from "next/link";
import { can, requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/i18n/server";
import { Fab, HeaderAction, PageHeader, StatusPill } from "@/components/ui";
import { IconChevron, IconLock } from "@/components/shell/icons";

export const metadata = { title: "Roles" };

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
      <PageHeader title={t("roles.title")} lead={t("roles.lead")} actions={canCreate ? <HeaderAction href="/roles/new" label={t("roles.new")} /> : null} />
      {!roles?.length ? (
        <div className="card empty"><b>{t("common.loading")}</b></div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {roles.map((r) => (
            <Link key={r.id} href={`/roles/${r.id}`} className="row" style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}>
              <div className="row-main">
                <b>{r.name}</b>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {r.is_system && <IconLock aria-label={t("common.system")} style={{ flex: "none", color: "var(--warn)" }} />}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{r.code}</span>
                  <span>· {t("roles.members", { n: r.user_roles?.[0]?.count ?? 0 })}</span>
                </span>
              </div>
              <StatusPill active={r.is_active} activeLabel={t("common.active")} inactiveLabel={t("common.inactive")} />
              <IconChevron className="chev" style={{ display: "block" }} />
            </Link>
          ))}
        </div>
      )}
      {canCreate && <Fab href="/roles/new" label={t("roles.new")} />}
    </>
  );
}
