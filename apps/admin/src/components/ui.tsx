import type { ReactNode } from "react";
import Link from "next/link";
import { IconBack, IconPlus } from "@/components/shell/icons";
import { avatarClass, initials } from "@/lib/avatar";

export function PageHeader({
  title,
  lead,
  back,
  actions,
}: {
  title: string;
  lead?: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <>
      {back && (
        <Link href={back.href} className="back">
          <IconBack /> {back.label}
        </Link>
      )}
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <h1>{title}</h1>
          {lead && <p>{lead}</p>}
        </div>
        {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
      </div>
    </>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="back">
      <IconBack /> {label}
    </Link>
  );
}

export function Card({ title, hint, children, pad = true }: { title?: string; hint?: string; children: ReactNode; pad?: boolean }) {
  return (
    <section className={`card${pad ? " card-pad" : ""}`}>
      {title && <h2>{title}</h2>}
      {hint && <p className="card-hint">{hint}</p>}
      {(title || hint) && <div style={{ height: 14 }} />}
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field" style={{ display: "block" }}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function StatusPill({ active, activeLabel, inactiveLabel }: { active: boolean; activeLabel: string; inactiveLabel: string }) {
  return (
    <span className={`pill ${active ? "pill-ok" : "pill-off"}`}>
      <i className="dot" />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export function Avatar({ name, seed, size }: { name: string; seed: string; size?: "sm" | "lg" }) {
  return <span className={`avatar ${size === "lg" ? "avatar-lg" : size === "sm" ? "avatar-sm" : ""} ${avatarClass(seed)}`}>{initials(name)}</span>;
}

/** Phone: floating action button above the tab bar. Desktop shows the header button instead. */
export function Fab({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="fab">
      <IconPlus /> {label}
    </Link>
  );
}

export function HeaderAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn btn-primary desktop-only">
      <IconPlus /> {label}
    </Link>
  );
}

export function Tabs({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((it) => (
        <Link key={it.href} href={it.href} replace scroll={false} role="tab" aria-selected={it.active} aria-current={it.active ? "page" : undefined}>
          {it.label}
        </Link>
      ))}
    </div>
  );
}
