import { CardSkeleton, Loading, PageHeadSkeleton } from "@/components/skeleton";

export default function NewUserLoading() {
  return (
    <Loading label="Loading">
      <PageHeadSkeleton />
      <div className="stack-lg">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    </Loading>
  );
}
