import { can, requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/i18n/server";
import { relativeTime } from "@/lib/format";
import { Fab, HeaderAction, PageHeader } from "@/components/ui";
import { UserList, type UserRow } from "./user-list";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  await requirePermission("admin.users", "view");
  const { t, locale } = await getT();
  const supabase = await createClient();

  const [{ data }, canCreate] = await Promise.all([
    supabase
      .from("users")
      .select("id, username, email, is_active, last_login_at, user_profiles(full_name, full_name_km), user_roles(roles(name))")
      .order("created_at"),
    can("admin.users", "create"),
  ]);

  const users: UserRow[] = (data ?? []).map((u) => {
    const p = Array.isArray(u.user_profiles) ? u.user_profiles[0] : u.user_profiles;
    const name = (locale === "km" ? p?.full_name_km : null) || p?.full_name || u.username;
    const roles = (u.user_roles ?? [])
      .map((r) => (Array.isArray(r.roles) ? r.roles[0] : r.roles)?.name as string | undefined)
      .filter((n): n is string => !!n);
    return { id: u.id, name, email: u.email ?? "", username: u.username, roles, active: u.is_active, last: relativeTime(u.last_login_at, t) };
  });

  return (
    <>
      <PageHeader
        title={t("users.title")}
        lead={t("users.lead")}
        actions={canCreate ? <HeaderAction href="/users/new" label={t("users.new")} /> : null}
      />
      <UserList users={users} />
      {canCreate && <Fab href="/users/new" label={t("users.new")} />}
    </>
  );
}
