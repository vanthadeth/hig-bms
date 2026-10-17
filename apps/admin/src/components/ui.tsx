import type { ReactNode } from "react";
import Link from "next/link";

export const inputCls =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent";
export const btnCls =
  "inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50";
export const btnGhostCls =
  "inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background disabled:opacity-50";
export const btnDangerCls =
  "inline-flex items-center justify-center rounded-md border border-bad px-4 py-2 text-sm font-medium text-bad hover:bg-bad-bg disabled:opacity-50";

export function PageHeader({ title, actions, back }: { title: string; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="text-sm text-muted hover:underline">
          ← {back.label}
        </Link>
      )}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex gap-2">{actions}</div>
      </div>
    </div>
  );
}

export function Card({ title, children, hint }: { title?: string; children: ReactNode; hint?: string }) {
  return (
    <section className="mb-6 rounded-lg border border-border bg-surface p-5">
      {title && <h2 className="mb-1 text-base font-semibold">{title}</h2>}
      {hint && <p className="mb-4 text-sm text-muted">{hint}</p>}
      {!hint && title && <div className="mb-3" />}
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Badge({ tone, children }: { tone: "ok" | "bad" | "muted"; children: ReactNode }) {
  const cls =
    tone === "ok" ? "bg-ok-bg text-ok" : tone === "bad" ? "bg-bad-bg text-bad" : "bg-background text-muted border border-border";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}
