import { Skeleton } from "@/components/common/Skeleton";

export default function SignupLoading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2 flex flex-col items-center">
          <Skeleton className="w-12 h-12 rounded-2xl mb-2" />
          <Skeleton className="h-7 w-56 rounded-md" />
          <Skeleton className="h-3.5 w-80 rounded-md" />
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-6 md:p-8 shadow-xl space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-20 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-20 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>

          <Skeleton className="h-10 w-full rounded-xl mt-3" />

          <div className="flex justify-center pt-2">
            <Skeleton className="h-3.5 w-48 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
