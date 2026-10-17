import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import { can, getPermissions, requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getModules, getScopes } from "@/lib/catalog";
import { getT } from "@/i18n/server";
import { appLabel, moduleName } from "@/i18n/module-name";
import { BackLink, Tabs } from "@/components/ui";
import { CardSkeleton, Loading, MatrixSkeleton, Skeleton } from "@/components/skeleton";
import { MatrixLazy } from "@/components/matrix-lazy";
import type { MatrixGroup } from "@/components/permission-matrix";
import { IconLock } from "@/components/shell/icons";
import { setRolePermissions, type PermState } from "@/app/permission-actions";
import { RoleForm, DeleteRoleButton } from "../role-form";
import { updateRole } from "../actions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata() {
  return { title: "Role" };
}

const getRole = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("roles").select("*, user_roles(count)").eq("id", id).maybeSingle();
  return data;
});

export default async function RoleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  if (!UUID_RE.test(id)) notFound();
  await requirePermission("admin.roles", "view");

  const [{ t }, perms] = await Promise.all([getT(), getPermissions()]);
  const canViewPerms = perms.has("admin.permissions:view");
  const tab = rawTab === "details" || !canViewPerms ? "details" : "permissions";

  return (
    <>
      <BackLink href="/roles" label={t("roles.title")} />
      <Suspense fallback={<RoleHeaderSkeleton />}>
        <RoleHeader id={id} />
      </Suspense>

      {canViewPerms && (
        <Tabs
          items={[
            { href: `/roles/${id}?tab=permissions`, label: t("roles.tab.permissions"), active: tab === "permissions" },
            { href: `/roles/${id}?tab=details`, label: t("roles.tab.details"), active: tab === "details" },
          ]}
        />
      )}

      <Suspense key={tab} fallback={<Loading label={t("common.loading")}>{tab === "permissions" ? <MatrixSkeleton /> : <CardSkeleton lines={3} />}</Loading>}>
        {tab === "permissions" ? <PermissionsTab roleId={id} /> : <DetailsTab id={id} />}
      </Suspense>
    </>
  );
}

function RoleHeaderSkeleton() {
  return (
    <div style={{ margin: "6px 0 16px" }} aria-hidden>
      <Skeleton w="45%" h={30} />
      <Skeleton w="25%" h={14} style={{ marginTop: 10 }} />
    </div>
  );
}

async function RoleHeader({ id }: { id: string }) {
  const [{ t }, role] = await Promise.all([getT(), getRole(id)]);
  if (!role) notFound();
  return (
    <>
      <div className="page-head" style={{ marginTop: 6 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {role.name}
            {role.is_system && <span className="pill pill-lock"><IconLock /> {t("roles.locked")}</span>}
          </h1>
          <p>{t("roles.members", { n: role.user_roles?.[0]?.count ?? 0 })}</p>
        </div>
      </div>
      {role.is_system && <p className="msg msg-warn" style={{ margin: "0 0 14px" }}>{t("roles.systemLocked")}</p>}
    </>
  );
}

async function DetailsTab({ id }: { id: string }) {
  const [role, perms] = await Promise.all([getRole(id), getPermissions()]);
  if (!role) notFound();
  const canUpdate = perms.has("admin.roles:update");
  const canDelete = perms.has("admin.roles:delete");
  return (
    <div className="stack-lg">
      <RoleForm mode="edit" action={updateRole.bind(null, id)} defaults={role} locked={role.is_system || !canUpdate} />
      {canDelete && !role.is_system && <DeleteRoleButton roleId={id} />}
    </div>
  );
}

async function PermissionsTab({ roleId }: { roleId: string }) {
  const { t } = await getT();
  const supabase = await createClient();
  const [modules, scopes, { data: perms }, role, allowed] = await Promise.all([
    getModules(),
    getScopes(),
    supabase.from("role_permissions").select("module_id, scope, allowed").eq("role_id", roleId),
    getRole(roleId),
    can("admin.permissions", "update"),
  ]);
  const disabled = !role || role.is_system || !allowed;

  const groups: MatrixGroup[] = [];
  for (const m of modules) {
    let g = groups.find((x) => x.app === m.app);
    if (!g) groups.push((g = { app: m.app, label: appLabel(m.app), modules: [] }));
    g.modules.push({ id: m.id, code: m.code, name: moduleName(t, m.code, m.name) });
  }
  const initial: Record<string, PermState> = {};
  for (const p of perms ?? []) initial[`${p.module_id}:${p.scope}`] = p.allowed ? "allowed" : "denied";

  return <MatrixLazy groups={groups} scopes={scopes} initial={initial} disabled={disabled} onChange={setRolePermissions.bind(null, roleId)} />;
}
