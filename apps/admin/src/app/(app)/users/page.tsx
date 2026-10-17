import Link from "next/link";
import { can, requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/i18n/server";
import { Badge, btnCls, Card, PageHeader } from "@/components/ui";

export default async function UsersPage() {
  await requirePermission("admin.users", "view");
  const { t } = await getT();
  const supabase = await createClient();
  const [{ data: users }, canCreate] = await Promise.all([
    supabase
      .from("users")
      .select("id, username, email, is_active, user_profiles(full_name, position), user_roles(roles(name))")
      .order("created_at"),
    can("admin.users", "create"),
  ]);

  return (
    <>
      <PageHeader
        title={t("users.title")}
        actions={canCreate ? <Link href="/users/new" className={btnCls}>{t("users.new")}</Link> : null}
      />
      <Card>
        {!users?.length ? (
          <p className="text-sm text-muted">{t("common.noData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 font-medium">{t("common.name")}</th>
                  <th className="py-2 font-medium">{t("users.username")}</th>
                  <th className="py-2 font-medium">{t("users.roles")}</th>
                  <th className="py-2 font-medium">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const p = Array.isArray(u.user_profiles) ? u.user_profiles[0] : u.user_profiles;
                  const roles = (u.user_roles ?? []).map((r) => (Array.isArray(r.roles) ? r.roles[0] : r.roles)?.name).filter(Boolean);
                  return (
                    <tr key={u.id} className="border-t border-border">
                      <td className="py-2">
                        <Link href={`/users/${u.id}`} className="font-medium text-accent hover:underline">
                          {p?.full_name || u.username}
                        </Link>
                        <div className="text-xs text-muted">{u.email}</div>
                      </td>
                      <td className="py-2">{u.username}</td>
                      <td className="py-2">{roles.join(", ") || "—"}</td>
                      <td className="py-2">
                        <Badge tone={u.is_active ? "ok" : "muted"}>{t(u.is_active ? "common.active" : "common.inactive")}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
