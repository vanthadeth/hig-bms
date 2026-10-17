import { Loading, PageHeadSkeleton, RowsSkeleton, Skeleton } from "@/components/skeleton";

export default function UsersLoading() {
  return (
    <Loading label="Loading">
      <PageHeadSkeleton action />
      <div className="stack" style={{ marginBottom: 14 }} aria-hidden>
        <Skeleton h={46} style={{ borderRadius: 11 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <Skeleton w={78} h={36} style={{ borderRadius: 99 }} />
          <Skeleton w={96} h={36} style={{ borderRadius: 99 }} />
          <Skeleton w={96} h={36} style={{ borderRadius: 99 }} />
        </div>
      </div>
      <RowsSkeleton rows={7} />
    </Loading>
  );
}
