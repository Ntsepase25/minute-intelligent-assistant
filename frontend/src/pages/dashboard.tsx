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
import { useSelectedRecordingStore } from "@/stores/recordingsStore";

import { toast } from "sonner";
import TopComponent from "@/components/dashboard/recordingPage/topComponent";
import BentoGrid from "@/components/mvpblocks/bento-grid-2";

const DashBoard = () => {
  const { data: session, isPending } = authClient.useSession();
  const [recordings, setRecordings] = useState<recording[] | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<recording[] | null>(null);
  const setSelectedRecording = useSelectedRecordingStore(
    (state) => state.setSelectedRecording
  );

  const fetchRecordings = async () => {
    try {
      const response = await fetch(
        // @ts-ignore
        `${import.meta.env.VITE_BACKEND_BASE_URL}/recordings`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // This is crucial for sending cookies
        }
      );
      const data = await response.json();
      // console.log("recordings: ", data);

      if (!response.ok) {
        toast.error(data.message || "Failed to fetch recordings");
        return;
      }
      if (!data.recordings || data.recordings.length === 0) {
        setRecordings([]);
        setLoading(false);
        return;
      }
      setRecordings(
        data.recordings.map((recording: recording) => {
          if (recording.id === data.recordings[0].id) {
            return {
              ...recording,
              selected: true,
            };
          }
          return {
            ...recording,
            selected: false,
          };
        })
      );
      setItems(
        data.recordings.map((recording: recording) => {
          if (recording.id === data.recordings[0].id) {
            setSelectedRecording({
              ...recording,
              title: recording.meetingId,
              // url: `/recordings/${recording.id}`,
              selected: true,
              id: recording.id,
            });
            return {
              title: recording.meetingId,
              url: `/recordings/${recording.id}`,
              selected: true,
              ...recording,
            };
          }
          return {
            title: recording.meetingId,
            url: `/recordings/${recording.id}`,
            selected: false,
            ...recording,
          };
        })
      );
      setLoading(false);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      toast.error(
        "Failed to fetch recordings. Please refresh page to try again."
      );
      setLoading(false);
    }
  };

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
      fetchRecordings();
    }
    if (!session && !loading) {
      setLoading(false);
    }
  }, [session]);

  // console.log("recordings in useState: ", recordings)

  return (
    // <div className="w-full">
    //   <div className="md:w-[80%] w-full mx-auto">
    //     {isPending ? (
    //       <Header session={undefined} isPending={true} />
    //     ) : session && session.user ? (
    //       <Header session={session.user} isPending={isPending} />
    //     ) : (
    //       <Header session={undefined} isPending={isPending} />
    //     )}
    //   </div>
    //   <div className="md:w-[70%] w-[90%] mx-auto mt-4">
    //     {loading && (
    //       <div className="flex justify-center items-center mt-5">
    //         <Loader2 className="animate-spin text-purple-500 h-5 w-5" />
    //       </div>
    //     )}
    //     {recordings && recordings.length > 0 ? (
    //       <DashboardBody recordings={recordings} />
    //     ) : (
    //       !loading && (
    //         <div className="w-full flex flex-col">
    //           <div className="mb-4 flex lg:flex-row flex-col gap-4 justify-between mx-2">
    //             <div className="flex flex-col">
    //               <div className="text-2xl font-bold">MIA Dashboard</div>
    //               <div className="text-muted-foreground text-sm">
    //                 Manage your minutes and recordings
    //               </div>
    //             </div>
    //             <div className="flex gap-2 items-center">
    //               <Button variant="outline">
    //                 <CloudUpload className="h-4 w-4" />
    //                 Upload Recording
    //               </Button>
    //               <Button variant="outline">
    //                 <Funnel className="h-4 w-4" />
    //                 Filter by Date
    //               </Button>
    //             </div>
    //           </div>
    //           <Alert variant="destructive">
    //             <AlertCircleIcon />
    //             <AlertTitle>No recordings found.</AlertTitle>
    //             <AlertDescription>
    //               <p>Please upload a recording.</p>
    //             </AlertDescription>
    //           </Alert>
    //         </div>
    //       )
    //     )}
    //   </div>
    // </div>
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
        items={items}
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
                <BentoGrid />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashBoard;
