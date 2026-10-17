import type { CSSProperties } from "react";

/** Placeholder block. Pure CSS shimmer; decorative, so hidden from assistive tech. */
export function Skeleton({ w, h = 14, circle, style }: { w?: number | string; h?: number | string; circle?: boolean; style?: CSSProperties }) {
  return <div className={`skeleton${circle ? " sk-circle" : ""}`} style={{ width: w ?? "100%", height: h, ...style }} aria-hidden />;
}

/** Wrap skeleton groups so screen readers announce loading once. */
export function Loading({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      {children}
    </div>
  );
}

export function PageHeadSkeleton({ action }: { action?: boolean }) {
  return (
    <div className="page-head" aria-hidden>
      <div style={{ flex: 1, minWidth: 200 }}>
        <Skeleton w="45%" h={30} />
        <Skeleton w="70%" h={14} style={{ marginTop: 10 }} />
      </div>
      {action && <Skeleton w={120} h={40} style={{ borderRadius: 11 }} />}
    </div>
  );
}

export function RowsSkeleton({ rows = 6, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <div className="card" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="row" style={{ gridTemplateColumns: avatar ? "auto minmax(0,1fr) auto" : "minmax(0,1fr) auto" }}>
          {avatar && <Skeleton w={40} h={40} circle />}
          <div style={{ display: "grid", gap: 8 }}>
            <Skeleton w={`${50 + ((i * 13) % 30)}%`} h={15} />
            <Skeleton w={`${35 + ((i * 17) % 25)}%`} h={12} />
          </div>
          <Skeleton w={64} h={24} style={{ borderRadius: 99 }} />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="card card-pad" style={{ display: "grid", gap: 14 }} aria-hidden>
      <Skeleton w="30%" h={18} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ display: "grid", gap: 6 }}>
          <Skeleton w="25%" h={12} />
          <Skeleton h={46} style={{ borderRadius: 11 }} />
        </div>
      ))}
    </div>
  );
}

export function MatrixSkeleton({ modules = 4 }: { modules?: number }) {
  return (
    <div className="card" aria-hidden>
      <div className="pm-legend">
        <Skeleton w={90} h={14} />
        <Skeleton w={90} h={14} />
        <Skeleton w={120} h={14} />
      </div>
      {Array.from({ length: modules }).map((_, i) => (
        <div key={i} className="pm-mod">
          <Skeleton w="40%" h={16} />
          <div className="pm-cells">
            {Array.from({ length: 6 }).map((__, j) => (
              <Skeleton key={j} h={46} style={{ borderRadius: 11 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TabsSkeleton() {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 16 }} aria-hidden>
      <Skeleton w={84} h={36} />
      <Skeleton w={84} h={36} />
      <Skeleton w={84} h={36} />
    </div>
  );
}
