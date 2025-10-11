import { useEffect, useState } from "react";
import * as React from "react";
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
import { useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";
import TopComponent from "@/components/dashboard/recordingPage/topComponent";
import BentoGrid from "@/components/mvpblocks/bento-grid-2";
import { BentoGridLoadingSkeleton } from "@/components/dashboard/recordingPage/bentoGridSkeleton";
import { useRecordings } from "@/hooks/useRecordings";

const DashBoard = () => {
  const { data: session, isPending } = authClient.useSession();
  const { selectedRecording, setSelectedRecording } = useRecordingsStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();

  // Use React Query for recordings data
  const {
    data: recordingsData = [],
    isLoading: loadingRecordings,
    error: recordingsError,
    refetch: refetchRecordings,
  } = useRecordings();

  // Manual polling with setInterval (avoiding React Query's caching issues)
  useEffect(() => {
    const checkForProcessing = () => {
      const hasProcessing = recordingsData.some(
        (rec: recording) =>
          rec.transcriptionStatus === "processing" ||
          rec.transcriptionStatus === "pending" ||
          rec.summaryStatus === "processing"
      );
      
      if (hasProcessing) {
        const processingIds = recordingsData
          .filter((rec: recording) => 
            rec.transcriptionStatus === "processing" ||
            rec.transcriptionStatus === "pending" ||
            rec.summaryStatus === "processing"
          )
          .map((r: recording) => r.id.substring(0, 8));
        
        console.log(`🔄 [POLLING] ${processingIds.length} recordings still processing:`, processingIds);
        return true;
      }
      
      console.log('✅ [POLLING] All recordings completed');
      return false;
    };

    // Start polling if we have processing recordings
    if (checkForProcessing()) {
      console.log('🚀 [POLLING] Starting manual polling every 2 seconds...');
      
      const interval = setInterval(async () => {
        console.log('🔄 [POLLING] Invalidating cache and refetching...');
        await queryClient.invalidateQueries({ queryKey: ['recordings'] });
        await refetchRecordings();
      }, 2000);

      return () => {
        console.log('⏹️ [POLLING] Stopping polling');
        clearInterval(interval);
      };
    }
  }, [recordingsData, refetchRecordings, queryClient]);

  // Deduplicate recordings by ID (just in case backend returns duplicates)
  const recordings = React.useMemo(() => {
    const seen = new Set();
    return recordingsData.filter((recording: recording) => {
      if (seen.has(recording.id)) {
        console.warn('⚠️ Duplicate recording detected:', recording.id);
        return false;
      }
      seen.add(recording.id);
      return true;
    });
  }, [recordingsData]);

  // Set first recording as selected when data loads
  useEffect(() => {
    if (recordings.length > 0 && !selectedRecording) {
      const firstRecording = recordings[0];
      setSelectedRecording({
        ...firstRecording,
        title:
          firstRecording.title ||
          firstRecording.meetingId ||
          "Untitled Meeting",
      });
    }
  }, [recordings, selectedRecording, setSelectedRecording]);

  // Sync selectedRecording with recordings array when data updates
  // This ensures the UI reflects changes from polling
  useEffect(() => {
    if (selectedRecording && recordings.length > 0) {
      const updatedRecording = recordings.find(r => r.id === selectedRecording.id);
      if (updatedRecording) {
        // Check if the recording has been updated (different status or content)
        const hasChanged = 
          updatedRecording.transcriptionStatus !== selectedRecording.transcriptionStatus ||
          updatedRecording.summaryStatus !== selectedRecording.summaryStatus ||
          updatedRecording.transcript !== selectedRecording.transcript ||
          updatedRecording.summary !== selectedRecording.summary ||
          updatedRecording.title !== selectedRecording.title;
        
        if (hasChanged) {
          console.log('🔄 [SYNC] Updating selected recording with fresh data:', {
            id: updatedRecording.id.substring(0, 8),
            transcription: updatedRecording.transcriptionStatus,
            summary: updatedRecording.summaryStatus,
            hasTranscript: !!updatedRecording.transcript,
            hasSummary: !!updatedRecording.summary
          });
          setSelectedRecording(updatedRecording);
        }
      }
    }
  }, [recordings, selectedRecording, setSelectedRecording]);

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

      // Refetch recordings when back online
      refetchRecordings();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.custom((t) => (
        <Alert variant="destructive" className="w-full">
          <WifiOff />
          <AlertTitle>You are offline</AlertTitle>
          <AlertDescription>
            Check your internet connection. Some features may not work.
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
  }, [refetchRecordings]);

  // Show error if recordings failed to load
  useEffect(() => {
    if (recordingsError) {
      console.error("Failed to fetch recordings:", recordingsError);
      toast.error("Failed to load recordings. Please try again.");
    }
  }, [recordingsError]);

  if (!session && !isPending) {
    window.location.href = "/login";
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Please sign in to access the dashboard. Redirecting to login page...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
        loading={loadingRecordings}
        isLoadingUser={isPending}
        user={session?.user}
        onUploadComplete={async (data) => {
          console.log('📤 [UPLOAD] Upload complete, invalidating cache and refetching...');
          
          // CRITICAL: Invalidate the cache first to force React Query to fetch fresh data
          // Otherwise it returns stale cached data with undefined status fields
          await queryClient.invalidateQueries({ queryKey: ['recordings'] });
          
          // Now refetch to get FRESH data from server (not cached data)
          const { data: freshData } = await refetchRecordings();
          
          console.log('📤 [UPLOAD] Refetch complete, recordings:', freshData?.length);
          
          // Select the newly uploaded recording from the fetched list
          if (data?.id && freshData) {
            console.log('📤 [UPLOAD] Auto-selecting recording:', data.id.substring(0, 8));
            
            // Find in the fresh recordings array
            const freshRecording = freshData.find((r: recording) => r.id === data.id);
            if (freshRecording) {
              console.log('📤 [UPLOAD] Found recording with status:', {
                transcription: freshRecording.transcriptionStatus,
                summary: freshRecording.summaryStatus,
                title: freshRecording.title,
                hasTranscript: !!freshRecording.transcript,
                hasSummary: !!freshRecording.summary,
              });
              setSelectedRecording(freshRecording);
            } else {
              console.log('📤 [UPLOAD] Recording not found in fresh data yet');
            }
          }
          
          toast.success("Recording uploaded!", {
            description: "Your recording is being transcribed and summarized.",
          });
        }}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="w-[90%] mx-auto">
                <TopComponent loading={loadingRecordings} />
                {/* <div className="w-full text-xl font-bold flex items-center gap-2">
                  <Pin color="#000000" className="h-4 w-4" />
                  Notes & Key Points
                </div> */}
                {loadingRecordings ? (
                  <BentoGridLoadingSkeleton />
                ) : (
                  <BentoGrid />
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashBoard;
