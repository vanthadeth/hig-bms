import { notFound } from "next/navigation";
import { can, requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getModules, getScopes } from "@/lib/catalog";
import { getT } from "@/i18n/server";
import { Card, PageHeader } from "@/components/ui";
import { PermissionMatrix } from "@/components/permission-matrix";
import { setRolePermission, type PermState } from "@/app/permission-actions";
import { RoleForm, DeleteRoleButton } from "../role-form";
import { updateRole } from "../actions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  await requirePermission("admin.roles", "view");

  const { t } = await getT();
  const supabase = await createClient();
  const [{ data: role }, canUpdate, canDelete, canViewPerms, canEditPerms] = await Promise.all([
    supabase.from("roles").select("*").eq("id", id).maybeSingle(),
    can("admin.roles", "update"),
    can("admin.roles", "delete"),
    can("admin.permissions", "view"),
    can("admin.permissions", "update"),
  ]);
  if (!role) notFound();

  const [modules, scopes] = await Promise.all([getModules(), getScopes()]);
  const { data: perms } = canViewPerms
    ? await supabase.from("role_permissions").select("module_id, scope, allowed").eq("role_id", id)
    : { data: [] };
  const initial: Record<string, PermState> = {};
  for (const p of perms ?? []) initial[`${p.module_id}:${p.scope}`] = p.allowed ? "allowed" : "denied";

  return (
    <>
      <PageHeader
        title={role.name}
        back={{ href: "/roles", label: t("roles.title") }}
        actions={canDelete && !role.is_system ? <DeleteRoleButton roleId={id} /> : null}
      />
      {role.is_system && (
        <p className="mb-6 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted">{t("roles.systemLocked")}</p>
      )}
      <Card>
        <RoleForm mode="edit" action={updateRole.bind(null, id)} defaults={role} locked={role.is_system || !canUpdate} />
      </Card>
      {canViewPerms && (
        <Card title={t("roles.permissions")}>
          <PermissionMatrix
            modules={modules}
            scopes={scopes}
            initial={initial}
            disabled={role.is_system || !canEditPerms}
            onChange={setRolePermission.bind(null, id)}
          />
        </Card>
      )}
    </>
  );
}
