import { Skeleton } from "../ui/skeleton";

export const SidebarLoadingSkeleton = () => (
  <>
    <div>
      <ul className="border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5">
        <li className="relative">
          <a className="flex h-7 min-w-0 -translate-x-px items-center gap-2 px-2 outline-hidden [&amp;>svg]:size-4 [&amp;>svg]:shrink-0">
            <span>
              <Skeleton className="w-[96px] max-w-full h-6" />
            </span>
          </a>
        </li>
        <li className="relative">
          <a className="flex h-7 min-w-0 -translate-x-px items-center gap-2 px-2 outline-hidden [&amp;>svg]:size-4 [&amp;>svg]:shrink-0">
            <span>
              <Skeleton className="w-[96px] max-w-full h-6" />
            </span>
          </a>
        </li>
        <li className="relative">
          <a className="flex h-7 min-w-0 -translate-x-px items-center gap-2 px-2 outline-hidden [&amp;>svg]:size-4 [&amp;>svg]:shrink-0">
            <span>
              <Skeleton className="w-[96px] max-w-full h-6" />
            </span>
          </a>
        </li>
      </ul>
    </div>
  </>
);