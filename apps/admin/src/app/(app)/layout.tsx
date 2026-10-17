import { Suspense } from "react";
import { getCurrentUser, getPermissions } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Logo } from "@/components/logo";
import { AccountMenu } from "@/components/shell/account-menu";
import { RailNav, TabBar, type NavItem } from "@/components/shell/nav-links";
import { Skeleton } from "@/components/skeleton";

const NAV: (NavItem & { module: string | null })[] = [
  { href: "/", label: "nav.home", icon: "home", module: null },
  { href: "/users", label: "nav.users", icon: "users", module: "admin.users" },
  { href: "/roles", label: "nav.roles", icon: "roles", module: "admin.roles" },
  { href: "/modules", label: "nav.modules", icon: "modules", module: "admin.modules" },
];

async function allowedNav(): Promise<NavItem[]> {
  const perms = await getPermissions();
  return NAV.filter((n) => !n.module || perms.has(`${n.module}:view`)).map((n) => ({ href: n.href, label: n.label, icon: n.icon }));
}

async function Rail() {
  return <RailNav items={await allowedNav()} />;
}
async function Tabs() {
  return <TabBar items={await allowedNav()} />;
}
async function Account() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <AccountMenu name={user.fullName} email={user.email ?? user.username} seed={user.id} />;
}

function Brand({ sub }: { sub: string }) {
  // Company name sits in layout text beside the mark; it is never attached to the logo itself.
  return (
    <div className="brand">
      <Logo size={36} />
      <div>
        HIG
        <small>{sub}</small>
      </div>
    </div>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  return (
    <div className="shell">
      <aside className="rail">
        <Brand sub={t("app.sub")} />
        <div>
          <div className="rail-label">{t("nav.section")}</div>
          <Suspense fallback={<RailSkeleton />}>
            <Rail />
          </Suspense>
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <header className="app-bar">
          <div className="app-bar-inner">
            <div className="app-bar-brand">
              <Brand sub={t("app.sub")} />
            </div>
            <div style={{ flex: 1 }} />
            <Suspense fallback={<Skeleton w={34} h={34} circle />}>
              <Account />
            </Suspense>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>

      <Suspense fallback={<TabsSkeleton />}>
        <Tabs />
      </Suspense>
    </div>
  );
}

function RailSkeleton() {
  return (
    <div style={{ display: "grid", gap: 8, padding: "0 4px" }} aria-hidden>
      <Skeleton h={38} />
      <Skeleton h={38} />
      <Skeleton h={38} />
    </div>
  );
}
function TabsSkeleton() {
  return (
    <div className="tab-bar" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="tab">
          <Skeleton w={54} h={28} style={{ borderRadius: 99 }} />
          <Skeleton w={36} h={10} />
        </div>
      ))}
    </div>
  );
}
