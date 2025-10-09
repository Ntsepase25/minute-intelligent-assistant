import { Skeleton } from "@/components/ui/skeleton";

export const BentoGridLoadingSkeleton = () => (
  <>
    <section className="relative pb-12 pt-5">
      {/* <div className="w-full flex items-center gap-2">
        <Skeleton className="w-[144px] h-[24px] max-w-full" />
        <Skeleton className="w-[24px] h-[24px]" />
      </div> */}
      <div className="absolute top-20 -left-20 h-64 w-64"></div>
      <div className="absolute -right-20 bottom-20 h-64 w-64"></div>
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-3">
        <div className="min-h-60 md:col-span-2">
          <div className="flex flex-col rounded-md gap-6 border py-6 relative h-full border-border/60 -translate-y-1">
            <div className="absolute">
              <div className="absolute"></div>
            </div>
            <div className="relative space-y-2 p-4 pt-0">
              <h3 className="tracking-tight">
                <Skeleton className="w-[176px] h-[24px] max-w-full" />
                <span className="ml-2">
                  <Skeleton className="w-[120px] h-[24px] max-w-full" />
                </span>
              </h3>
              <p className="leading-relaxed">
                <Skeleton className="w-[3656px] h-[24px] max-w-full" />
              </p>
            </div>
            <div className="absolute -z-10 from-transparent p-px"></div>
          </div>
        </div>
        <div className="min-h-60 col-span-1">
          <div className="flex flex-col rounded-md gap-6 border py-6  relative h-full border-border/60">
            <div className="absolute group-hover:opacity-100">
              <div className="absolute"></div>
            </div>
            <div className="relative space-y-2 p-4 pt-0">
              <h3 className="tracking-tight">
                <Skeleton className="w-[176px] h-[24px] max-w-full" />
                <span className="ml-2">
                  <Skeleton className="w-[80px] h-[24px] max-w-full" />
                </span>
              </h3>
              <p className="leading-relaxed">
                <Skeleton className="w-[128px] h-[24px] max-w-full" />
              </p>
            </div>
            <div className="absolute -z-10 from-transparent p-px group-hover:opacity-100"></div>
          </div>
        </div>
        <div className="min-h-60 col-span-1">
          <div className="flex flex-col rounded-md gap-6 border py-6  relative h-full border-border/60">
            <div className="absolute group-hover:opacity-100">
              <div className="absolute"></div>
            </div>
            <div className="relative space-y-2 p-4 pt-0">
              <h3 className="tracking-tight">
                <Skeleton className="w-[232px] h-[24px] max-w-full" />
                <span className="ml-2">
                  <Skeleton className="w-[136px] h-[24px] max-w-full" />
                </span>
              </h3>
              <p className="leading-relaxed">
                <Skeleton className="w-[280px] h-[24px] max-w-full" />
              </p>
            </div>
            <div className="absolute -z-10 from-transparent p-px group-hover:opacity-100"></div>
          </div>
        </div>
        <div className="min-h-60 md:col-span-2">
          <div className="flex flex-col gap-6 border py-6  rounded-md relative h-full border-border/60">
            <div className="absolute group-hover:opacity-100">
              <div className="absolute"></div>
            </div>
            <div className="relative space-y-2 p-4 pt-0">
              <h3 className="tracking-tight">
                <Skeleton className="w-[200px] h-[24px] max-w-full" />
                <span className="ml-2">
                  <Skeleton className="w-[120px] h-[24px] max-w-full" />
                </span>
              </h3>
              <p className="leading-relaxed">
                <Skeleton className="w-[1136px] h-[24px] max-w-full" />
              </p>
            </div>
            <div className="absolute -z-10 from-transparent p-px group-hover:opacity-100"></div>
          </div>
        </div>
      </div>
    </section>
  </>
);
