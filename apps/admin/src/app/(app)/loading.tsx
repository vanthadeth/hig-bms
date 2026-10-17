import { CardSkeleton, Loading, PageHeadSkeleton } from "@/components/skeleton";

export default function Loadingx() {
  return (
    <Loading label="Loading">
      <PageHeadSkeleton />
      <CardSkeleton lines={3} />
    </Loading>
  );
}
