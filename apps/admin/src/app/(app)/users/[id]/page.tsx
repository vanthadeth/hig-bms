import { notFound } from "next/navigation";
import { can, requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getModules, getScopes } from "@/lib/catalog";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";
import { Badge, Card, PageHeader } from "@/components/ui";
import { PermissionMatrix } from "@/components/permission-matrix";
import type { PermState } from "@/app/permission-actions";
import { setUserPermission } from "@/app/permission-actions";
import { UserForm } from "../user-form";
import { updateUser } from "../actions";
import { ActiveToggle, RoleCheckboxes } from "./user-controls";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  await requirePermission("admin.users", "view");

  const { t } = await getT();
  const supabase = await createClient();

  const [{ data: user }, canEdit, canViewRoles, canEditRoles, canViewPerms, canEditPerms] = await Promise.all([
    supabase.from("users").select("*, user_profiles(*)").eq("id", id).maybeSingle(),
    can("admin.users", "update"),
    can("admin.roles", "view"),
    can("admin.roles", "update"),
    can("admin.permissions", "view"),
    can("admin.permissions", "update"),
  ]);
  if (!user) notFound();
  const profile = Array.isArray(user.user_profiles) ? user.user_profiles[0] : user.user_profiles;

  const [modules, scopes] = await Promise.all([getModules(), getScopes()]);

  const [roles, assigned, overrides, effective] = await Promise.all([
    canViewRoles ? supabase.from("roles").select("id, name, code, is_active").order("name") : null,
    canViewRoles ? supabase.from("user_roles").select("role_id").eq("user_id", id) : null,
    canViewPerms ? supabase.from("user_permissions").select("module_id, scope, allowed").eq("user_id", id) : null,
    canViewPerms ? supabase.rpc("effective_permissions", { p_user: id }) : null,
  ]);

  const initial: Record<string, PermState> = {};
  for (const o of overrides?.data ?? []) initial[`${o.module_id}:${o.scope}`] = o.allowed ? "allowed" : "denied";

  const eff = new Map<string, { allowed: boolean; source: string }>();
  for (const e of (effective?.data ?? []) as { module_code: string; scope: string; allowed: boolean; source: string }[]) {
    eff.set(`${e.module_code}:${e.scope}`, e);
  }

  return (
    <>
      <PageHeader
        title={profile?.full_name || user.username}
        back={{ href: "/users", label: t("users.title") }}
        actions={
          <>
            <Badge tone={user.is_active ? "ok" : "muted"}>{t(user.is_active ? "common.active" : "common.inactive")}</Badge>
            {canEdit && <ActiveToggle userId={id} active={user.is_active} />}
          </>
        }
      />

      <Card>
        <UserForm
          mode="edit"
          canEdit={canEdit}
          action={updateUser.bind(null, id)}
          defaults={{ email: user.email ?? "", username: user.username, phone: user.phone, ...profile }}
        />
      </Card>

      {roles && (
        <Card title={t("users.roles")}>
          <RoleCheckboxes
            userId={id}
            roles={roles.data ?? []}
            assigned={(assigned?.data ?? []).map((r) => r.role_id)}
            disabled={!canEditRoles}
          />
        </Card>
      )}

      {canViewPerms && (
        <>
          <Card title={t("users.overrides")} hint={t("users.overridesHint")}>
            <PermissionMatrix
              modules={modules}
              scopes={scopes}
              initial={initial}
              disabled={!canEditPerms}
              onChange={setUserPermission.bind(null, id)}
            />
          </Card>

          <Card title={t("users.effective")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="py-2 font-medium">{t("nav.modules")}</th>
                    {scopes.map((s) => (
                      <th key={s.code} className="px-1 py-2 text-center font-medium">{t(`scope.${s.code}` as MessageKey)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="py-2">{m.name}</td>
                      {scopes.map((s) => {
                        const e = eff.get(`${m.code}:${s.code}`);
                        return (
                          <td key={s.code} className="px-1 py-2 text-center">
                            <span
                              title={e ? t(`perm.source.${e.source}` as MessageKey) : ""}
                              className={e?.allowed ? "text-ok" : "text-bad"}
                            >
                              {e?.allowed ? "✓" : "✕"}
                            </span>
                            {e?.source === "user" && <sup className="text-accent">*</sup>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">* {t("perm.source.user")}</p>
          </Card>
        </>
      )}
    </>
  );
}
