import { Loading, MatrixSkeleton, Skeleton, TabsSkeleton } from "@/components/skeleton";

export default function RoleDetailLoading() {
  return (
    <Loading label="Loading">
      <Skeleton w={80} h={16} style={{ marginBottom: 14 }} />
      <Skeleton w="45%" h={30} style={{ marginBottom: 8 }} />
      <Skeleton w="25%" h={14} style={{ marginBottom: 18 }} />
      <TabsSkeleton />
      <MatrixSkeleton />
    </Loading>
  );
}
