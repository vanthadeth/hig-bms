import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser, getPermissions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/i18n/server";
import { PageHeader } from "@/components/ui";
import { IconChevron, IconGrid, IconShield, IconUsers } from "@/components/shell/icons";
import { Skeleton } from "@/components/skeleton";

export const metadata = { title: "Home" };

export default async function DashboardPage() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getT()]);
  return (
    <>
      <PageHeader title={`${t("dash.welcome")}${user ? `, ${user.fullName}` : ""}`} lead={t("dash.lead")} />
      <Suspense fallback={<TilesSkeleton />}>
        <Tiles />
      </Suspense>
    </>
  );
}

async function Tiles() {
  const [perms, { t }] = await Promise.all([getPermissions(), getT()]);
  const supabase = await createClient();
  const canUsers = perms.has("admin.users:view");
  const canRoles = perms.has("admin.roles:view");
  const canModules = perms.has("admin.modules:view");

  const [users, active, roles, modules] = await Promise.all([
    canUsers ? supabase.from("users").select("id", { count: "exact", head: true }) : null,
    canUsers ? supabase.from("users").select("id", { count: "exact", head: true }).eq("is_active", true) : null,
    canRoles ? supabase.from("roles").select("id", { count: "exact", head: true }) : null,
    canModules ? supabase.from("modules").select("id", { count: "exact", head: true }) : null,
  ]);

  const tiles = [
    canUsers && { href: "/users", icon: <IconUsers />, title: t("dash.users"), big: String(users?.count ?? 0), sub: t("dash.activeUsers", { n: active?.count ?? 0 }) },
    canRoles && { href: "/roles", icon: <IconShield />, title: t("dash.roles"), big: String(roles?.count ?? 0), sub: t("dash.rolesCount", { n: roles?.count ?? 0 }) },
    canModules && { href: "/modules", icon: <IconGrid />, title: t("dash.modules"), big: String(modules?.count ?? 0), sub: t("dash.modulesCount", { n: modules?.count ?? 0 }) },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; title: string; big: string; sub: string }[];

  return (
    <>
      <div className="card" style={{ overflow: "hidden" }}>
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className="row" style={{ gridTemplateColumns: "auto minmax(0,1fr) auto auto", minHeight: 72 }}>
            <span style={{ color: "var(--accent)", display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 12, background: "var(--accent-soft)" }}>{tile.icon}</span>
            <div className="row-main">
              <b>{tile.title}</b>
              <span>{tile.sub}</span>
            </div>
            <span className="num" style={{ fontSize: 24, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>{tile.big}</span>
            <IconChevron className="chev" style={{ display: "block" }} />
          </Link>
        ))}
      </div>
      <p style={{ color: "var(--fg-3)", marginTop: 14 }}>{t("dash.allowed", { n: perms.size })}</p>
    </>
  );
}

function TilesSkeleton() {
  return (
    <div className="card" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="row" style={{ gridTemplateColumns: "auto minmax(0,1fr) auto", minHeight: 72 }}>
          <Skeleton w={40} h={40} style={{ borderRadius: 12 }} />
          <div style={{ display: "grid", gap: 8 }}>
            <Skeleton w="40%" h={15} />
            <Skeleton w="28%" h={12} />
          </div>
          <Skeleton w={32} h={26} />
        </div>
      ))}
    </div>
  );
}
