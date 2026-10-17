import { CardSkeleton, Loading, Skeleton, TabsSkeleton } from "@/components/skeleton";

export default function UserDetailLoading() {
  return (
    <Loading label="Loading">
      <Skeleton w={90} h={16} style={{ marginBottom: 14 }} />
      <div className="card card-pad" style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }} aria-hidden>
        <Skeleton w={56} h={56} circle />
        <div style={{ flex: 1, display: "grid", gap: 8 }}>
          <Skeleton w="50%" h={20} />
          <Skeleton w="65%" h={13} />
        </div>
      </div>
      <TabsSkeleton />
      <CardSkeleton lines={4} />
    </Loading>
  );
}
