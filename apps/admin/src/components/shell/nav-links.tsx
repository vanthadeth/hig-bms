"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { IconGrid, IconHome, IconShield, IconUsers } from "./icons";

export type NavItem = { href: string; label: MessageKey; icon: "home" | "users" | "roles" | "modules" };

const ICONS = { home: IconHome, users: IconUsers, roles: IconShield, modules: IconGrid };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/** Phone: bottom tab bar (thumb reach). */
export function TabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { t } = useT();
  return (
    <nav className="tab-bar" aria-label={t("nav.main")}>
      {items.map((it) => {
        const Icon = ICONS[it.icon];
        return (
          <Link key={it.href} href={it.href} className="tab" aria-current={isActive(pathname, it.href) ? "page" : undefined}>
            <span className="tab-ico">
              <Icon />
            </span>
            {t(it.label)}
          </Link>
        );
      })}
    </nav>
  );
}

/** Desktop: left sidebar links. */
export function RailNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { t } = useT();
  return (
    <nav className="rail-nav" aria-label={t("nav.main")}>
      {items.map((it) => {
        const Icon = ICONS[it.icon];
        return (
          <Link key={it.href} href={it.href} className="rail-link" aria-current={isActive(pathname, it.href) ? "page" : undefined}>
            <Icon width={20} height={20} />
            {t(it.label)}
          </Link>
        );
      })}
    </nav>
  );
}
