import { Skeleton, SVGSkeleton } from "../ui/skeleton";

export const LoadingUserSidebarSkeleton = () => (
  <>
    <div className="flex flex-col gap-2 p-2">
      <ul className="flex w-full min-w-0 flex-col gap-1">
        <li className="relative">
          <div className="flex w-full items-center gap-2 p-2 text-left outline-hidden [&amp;>svg]:size-4 [&amp;>svg]:shrink-0 h-12">
            <span className="relative flex size-8 shrink-0 h-8 w-8">
              <span className="flex size-full items-center justify-center">
                <Skeleton className="ml-auto size-4 w-[24px] h-6" />
              </span>
            </span>
            <div className="grid flex-1 gap-2 text-left leading-tight">
              <span>
                <Skeleton className="w-[48px] max-w-full h-6" />
              </span>
              <span>
                <Skeleton className="w-[104px] max-w-full h-6" />
              </span>
            </div>
            <Skeleton className="w-[16px] max-w-full h-6" />
          </div>
        </li>
      </ul>
    </div>
  </>
);
