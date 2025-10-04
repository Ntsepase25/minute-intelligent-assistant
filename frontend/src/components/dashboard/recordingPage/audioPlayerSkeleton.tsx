import { Skeleton } from "@/components/ui/skeleton";

export const AudioPlayerLoadingSkeleton = () => (
  <>
    <div>
      <div className="flex items-center md:pl-2 mt-2 w-full">
        <div className="mt-2 h-4">
          <Skeleton className="w-[250px] h-[24px] max-w-full" />
        </div>
      </div>
    </div>
  </>
);
