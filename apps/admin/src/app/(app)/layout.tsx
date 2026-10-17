import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPermissions } from "@/lib/auth";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";
import { signOut } from "@/app/login/actions";
import { LocaleSwitch } from "@/components/locale-switch";

const NAV: { href: string; label: MessageKey; module: string | null }[] = [
  { href: "/", label: "nav.dashboard", module: null },
  { href: "/users", label: "nav.users", module: "admin.users" },
  { href: "/roles", label: "nav.roles", module: "admin.roles" },
  { href: "/modules", label: "nav.modules", module: "admin.modules" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const perms = await getPermissions();
  const { t } = await getT();
  const items = NAV.filter((n) => !n.module || perms.has(`${n.module}:view`));

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-border bg-surface md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block">
          <div className="text-lg font-semibold">{t("app.name")}</div>
          <div className="md:mt-3">
            <LocaleSwitch />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-background">
              {t(n.label)}
            </Link>
          ))}
        </nav>
        <div className="hidden px-4 py-4 text-sm md:block">
          <div className="font-medium">{user.fullName}</div>
          <div className="mb-2 text-xs text-muted">{user.email ?? user.username}</div>
          <form action={signOut}>
            <button className="text-accent hover:underline">{t("nav.signOut")}</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
        <form action={signOut} className="mt-8 md:hidden">
          <button className="text-sm text-accent hover:underline">{t("nav.signOut")}</button>
        </form>
      </main>
    </div>
  );
}
