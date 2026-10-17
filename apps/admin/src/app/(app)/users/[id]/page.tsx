import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import { can, getPermissions, requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getModules, getScopes } from "@/lib/catalog";
import { getT } from "@/i18n/server";
import { moduleName, appLabel } from "@/i18n/module-name";
import type { MessageKey } from "@/i18n/messages";
import { Avatar, BackLink, Card, StatusPill, Tabs } from "@/components/ui";
import { CardSkeleton, Loading, MatrixSkeleton, Skeleton } from "@/components/skeleton";
import { MatrixLazy } from "@/components/matrix-lazy";
import type { MatrixGroup } from "@/components/permission-matrix";
import { IconCheck, IconDot } from "@/components/shell/icons";
import { setUserPermissions, type PermState } from "@/app/permission-actions";
import { UserForm } from "../user-form";
import { updateUser } from "../actions";
import { ActiveToggle, RoleCheckboxes } from "./user-controls";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Tab = "profile" | "roles" | "access";
const TABS: Tab[] = ["profile", "roles", "access"];

export async function generateMetadata() {
  return { title: "User" };
}

const getUserRecord = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("*, user_profiles(*)").eq("id", id).maybeSingle();
  if (!data) return null;
  const profile = Array.isArray(data.user_profiles) ? data.user_profiles[0] : data.user_profiles;
  return { user: data, profile };
});

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  if (!UUID_RE.test(id)) notFound();
  await requirePermission("admin.users", "view");

  // Only one permission lookup (shared with the layout) happens before the first byte is sent.
  const [{ t }, perms] = await Promise.all([getT(), getPermissions()]);
  const canEdit = perms.has("admin.users:update");
  const visible = TABS.filter((x) => (x === "roles" ? perms.has("admin.roles:view") : x === "access" ? perms.has("admin.permissions:view") : true));
  const tab: Tab = visible.includes(rawTab as Tab) ? (rawTab as Tab) : "profile";
  const loading = (
    <Loading label={t("common.loading")}>{tab === "access" ? <MatrixSkeleton /> : <CardSkeleton lines={tab === "roles" ? 3 : 4} />}</Loading>
  );

  return (
    <>
      <BackLink href="/users" label={t("users.title")} />
      <Suspense fallback={<HeaderSkeleton />}>
        <UserHeader id={id} canEdit={canEdit} />
      </Suspense>

      <Tabs items={visible.map((x) => ({ href: `/users/${id}?tab=${x}`, label: t(`users.tab.${x}` as const), active: x === tab }))} />

      <Suspense key={tab} fallback={loading}>
        {tab === "profile" && <ProfileTab id={id} canEdit={canEdit} />}
        {tab === "roles" && <RolesTab userId={id} />}
        {tab === "access" && <AccessTab userId={id} />}
      </Suspense>
    </>
  );
}

function HeaderSkeleton() {
  return (
    <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 14, margin: "6px 0 16px" }} aria-hidden>
      <Skeleton w={56} h={56} circle />
      <div style={{ flex: 1, display: "grid", gap: 8 }}>
        <Skeleton w="50%" h={20} />
        <Skeleton w="65%" h={13} />
      </div>
    </div>
  );
}

async function UserHeader({ id, canEdit }: { id: string; canEdit: boolean }) {
  const [{ t, locale }, rec] = await Promise.all([getT(), getUserRecord(id)]);
  if (!rec) notFound();
  const { user, profile } = rec;
  const name = (locale === "km" ? profile?.full_name_km : null) || profile?.full_name || user.username;
  return (
    <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", margin: "6px 0 16px" }}>
      <Avatar name={name} seed={id} size="lg" />
      <div style={{ minWidth: 0, flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.25, fontWeight: 650, overflowWrap: "anywhere" }}>{name}</h1>
        <p style={{ margin: "2px 0 8px", color: "var(--fg-3)", overflowWrap: "break-word" }}>{user.email}</p>
        <StatusPill active={user.is_active} activeLabel={t("common.active")} inactiveLabel={t("common.inactive")} />
      </div>
      {canEdit && (
        <div className="header-action">
          <ActiveToggle userId={id} active={user.is_active} />
        </div>
      )}
    </div>
  );
}

async function ProfileTab({ id, canEdit }: { id: string; canEdit: boolean }) {
  const rec = await getUserRecord(id);
  if (!rec) notFound();
  const { user, profile } = rec;
  return (
    <UserForm
      mode="edit"
      canEdit={canEdit}
      action={updateUser.bind(null, id)}
      defaults={{ email: user.email ?? "", username: user.username, phone: user.phone, ...profile }}
    />
  );
}

async function RolesTab({ userId }: { userId: string }) {
  const { t } = await getT();
  const supabase = await createClient();
  const [{ data: roles }, { data: assigned }, canEdit] = await Promise.all([
    supabase.from("roles").select("id, name, code, is_active").order("name"),
    supabase.from("user_roles").select("role_id").eq("user_id", userId),
    can("admin.roles", "update"),
  ]);
  return (
    <Card title={t("users.roles")} hint={t("users.rolesHint")}>
      <RoleCheckboxes userId={userId} roles={roles ?? []} assigned={(assigned ?? []).map((r) => r.role_id)} disabled={!canEdit} />
    </Card>
  );
}

async function AccessTab({ userId }: { userId: string }) {
  const { t } = await getT();
  const supabase = await createClient();
  const [modules, scopes, { data: overrides }, { data: effective }, canEdit] = await Promise.all([
    getModules(),
    getScopes(),
    supabase.from("user_permissions").select("module_id, scope, allowed").eq("user_id", userId),
    supabase.rpc("effective_permissions", { p_user: userId }),
    can("admin.permissions", "update"),
  ]);

  const groups: MatrixGroup[] = [];
  for (const m of modules) {
    let g = groups.find((x) => x.app === m.app);
    if (!g) groups.push((g = { app: m.app, label: appLabel(m.app), modules: [] }));
    g.modules.push({ id: m.id, code: m.code, name: moduleName(t, m.code, m.name) });
  }
  const initial: Record<string, PermState> = {};
  for (const o of overrides ?? []) initial[`${o.module_id}:${o.scope}`] = o.allowed ? "allowed" : "denied";

  const eff = new Map<string, { allowed: boolean; source: string }>();
  for (const e of (effective ?? []) as { module_code: string; scope: string; allowed: boolean; source: string }[]) eff.set(`${e.module_code}:${e.scope}`, e);

  return (
    <div className="stack-lg">
      <div>
        <h2 style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 650 }}>{t("users.overrides")}</h2>
        <p style={{ margin: "0 0 12px", color: "var(--fg-3)" }}>{t("users.overridesHint")}</p>
        <MatrixLazy groups={groups} scopes={scopes} initial={initial} disabled={!canEdit} onChange={setUserPermissions.bind(null, userId)} />
      </div>

      <div>
        <h2 style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 650 }}>{t("users.effective")}</h2>
        <p style={{ margin: "0 0 12px", color: "var(--fg-3)" }}>{t("users.effectiveHint")}</p>
        <div className="card" style={{ overflow: "clip" }}>
          <div className="pm-head" aria-hidden>
            <span>{t("perm.module")}</span>
            {scopes.map((s) => (
              <span key={s.code}>{t(`scope.${s.code}` as MessageKey)}</span>
            ))}
          </div>
          {groups.map((g) => (
            <div key={g.app}>
              <div className="pm-group">{g.label}</div>
              {g.modules.map((m) => (
                <div key={m.id} className="pm-mod">
                  <div className="pm-name">
                    <div>
                      <b>{m.name}</b>
                      <small>{m.code}</small>
                    </div>
                  </div>
                  <div className="pm-cells">
                    {scopes.map((s) => {
                      const e = eff.get(`${m.code}:${s.code}`);
                      const on = !!e?.allowed;
                      const label = t(`scope.${s.code}` as MessageKey);
                      return (
                        <span key={s.code} className="pm-cell" data-s={on ? "a" : "i"} title={e ? t(`perm.source.${e.source}` as MessageKey) : undefined}>
                          {on ? <IconCheck /> : <IconDot />}
                          <span className="pm-label">{label}</span>
                          {e?.source === "user" && <sup style={{ color: "var(--accent)", fontWeight: 700 }}>*</sup>}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <p style={{ margin: 0, padding: "10px 16px", borderTop: "1px solid var(--line)", color: "var(--fg-3)", fontSize: 13 }}>* {t("perm.source.user")}</p>
        </div>
      </div>
    </div>
  );
}
