import { Loading, PageHeadSkeleton, RowsSkeleton } from "@/components/skeleton";

export default function ModulesLoading() {
  return (
    <Loading label="Loading">
      <PageHeadSkeleton />
      <RowsSkeleton rows={5} avatar={false} />
    </Loading>
  );
}
