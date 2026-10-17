import { Loading, PageHeadSkeleton, RowsSkeleton } from "@/components/skeleton";

export default function RolesLoading() {
  return (
    <Loading label="Loading">
      <PageHeadSkeleton action />
      <RowsSkeleton rows={5} avatar={false} />
    </Loading>
  );
}
