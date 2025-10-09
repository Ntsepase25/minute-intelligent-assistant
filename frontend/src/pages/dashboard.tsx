import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import Header from "../components/dashboard/header";
import DashboardBody from "../components/dashboard/dashboardBody";
import type { recording, sidebarItem } from "../lib/types";

import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import {
  AlertCircleIcon,
  Building,
  Camera,
  CloudUpload,
  Compass,
  Funnel,
  Heart,
  Home,
  HomeIcon,
  Loader2,
  MapPin,
  Pin,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRecordingsStore } from "@/stores/recordingsStore";

import { toast } from "sonner";
import TopComponent from "@/components/dashboard/recordingPage/topComponent";
import BentoGrid from "@/components/mvpblocks/bento-grid-2";
import { BentoGridLoadingSkeleton } from "@/components/dashboard/recordingPage/bentoGridSkeleton";

const DashBoard = () => {
  const { data: session, isPending } = authClient.useSession();
  const { recordings, loading, fetchRecordings } = useRecordingsStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.custom((t) => (
        <Alert variant="default" className="w-full">
          <Wifi />
          <AlertTitle>You are online</AlertTitle>
          <AlertDescription>
            You have regained internet connection.
          </AlertDescription>
        </Alert>
      ));
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.custom((t) => (
        <Alert variant="destructive" className="w-full">
          <WifiOff />
          <AlertTitle>You are offline</AlertTitle>
          <AlertDescription>
            Please check your internet connection.
          </AlertDescription>
        </Alert>
      ));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    console.log("Session data:", session);
    if (!isPending && session) {
      fetchRecordings().catch((error) => {
        toast.error(
          "Failed to fetch recordings. Please refresh page to try again."
        );
      });
    }
  }, [session, isPending, fetchRecordings]);

  // console.log("recordings in useState: ", recordings)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        items={recordings}
        loading={loading}
        isLoadingUser={isPending}
        user={session?.user}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="w-[90%] mx-auto">
                <TopComponent loading={loading} />
                {/* <div className="w-full text-xl font-bold flex items-center gap-2">
                  <Pin color="#000000" className="h-4 w-4" />
                  Notes & Key Points
                </div> */}
                {loading ? <BentoGridLoadingSkeleton /> : <BentoGrid />}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashBoard;
