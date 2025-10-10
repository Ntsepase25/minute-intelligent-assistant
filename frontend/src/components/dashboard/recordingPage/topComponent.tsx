import { RefreshCcw, Trash2, Loader2, FileText, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { recording } from "@/lib/types";
import { useRecordingsStore } from "@/stores/recordingsStore";
import AudioPlayer from "./audioPlayer";
import { AudioPlayerLoadingSkeleton } from "./audioPlayerSkeleton";
import { useState } from "react";
import { toast } from "sonner";
import { useRegenerateTranscript, useRegenerateSummary } from "@/hooks/useRecordings";

type Props = {
  loading: boolean;
};

const TopComponent = ({ loading }: Props) => {
  const { selectedRecording, setSelectedRecording } = useRecordingsStore();
  const [fetchingGoogleMeetData, setFetchingGoogleMeetData] = useState(false);

  // React Query mutations
  const regenerateTranscriptMutation = useRegenerateTranscript();
  const regenerateSummaryMutation = useRegenerateSummary();

  const handleRegenerateTranscript = async () => {
    if (!selectedRecording?.id) return;

    // Step 1: Check if this is a Google Meet recording and try to fetch participant data
    let shouldFetchGoogleMeetData = false;
    if (selectedRecording.meetingPlatform === "google-meet" && 
        selectedRecording.meetingId &&
        (!selectedRecording.participants || selectedRecording.participants.length === 0)) {
      shouldFetchGoogleMeetData = true;
    }

    if (shouldFetchGoogleMeetData) {
      setFetchingGoogleMeetData(true);
      toast.loading("Fetching Google Meet participants and transcript...", { id: "transcript-regen" });
      
      try {
        const googleMeetResponse = await fetch(
          `${(import.meta as any).env.VITE_BACKEND_BASE_URL}/recordings/fetch-google-meet-data/${selectedRecording.id}`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (googleMeetResponse.ok) {
          const googleMeetData = await googleMeetResponse.json();
          
          // Update recording with Google Meet data in Zustand store
          const updatedRecording = {
            ...selectedRecording,
            participants: googleMeetData.participants,
            transcriptEntries: googleMeetData.transcriptEntries,
          };
          
          setSelectedRecording(updatedRecording);
          
          if (!googleMeetData.alreadyExists) {
            toast.success("Google Meet data fetched successfully", { id: "transcript-regen" });
            
            // Auto-regenerate summary with the new transcript data
            regenerateSummaryMutation.mutate(selectedRecording.id);
          }
          
          setFetchingGoogleMeetData(false);
          return; // Exit early since we successfully processed Google Meet data
        }
      } catch (googleMeetError) {
        console.warn("Could not fetch Google Meet data, falling back to regular regeneration:", googleMeetError);
      } finally {
        setFetchingGoogleMeetData(false);
      }
    }

    // Step 2: Regular transcript regeneration (fallback or for non-Google Meet recordings)
    regenerateTranscriptMutation.mutate(selectedRecording.id, {
      onSuccess: () => {
        // Auto-regenerate summary after transcript regeneration
        regenerateSummaryMutation.mutate(selectedRecording.id);
      }
    });
  };

  const handleRegenerateSummary = async () => {
    if (!selectedRecording?.id) return;

    if (!selectedRecording.transcript) {
      toast.error("No transcript available. Please regenerate transcript first.");
      return;
    }

    // Step 1: Check if this is a Google Meet recording and try to fetch participant data first
    if (selectedRecording.meetingPlatform === "google-meet" && 
        selectedRecording.meetingId &&
        (!selectedRecording.participants || selectedRecording.participants.length === 0)) {
      
      setFetchingGoogleMeetData(true);
      toast.loading("Fetching Google Meet participants for better summary...", { id: "summary-regen" });
      
      try {
        const googleMeetResponse = await fetch(
          `${(import.meta as any).env.VITE_BACKEND_BASE_URL}/recordings/fetch-google-meet-data/${selectedRecording.id}`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (googleMeetResponse.ok) {
          const googleMeetData = await googleMeetResponse.json();
          
          // Update recording with Google Meet data
          const updatedRecording = {
            ...selectedRecording,
            participants: googleMeetData.participants,
            transcriptEntries: googleMeetData.transcriptEntries,
          };
          
          setSelectedRecording(updatedRecording);
          
          if (!googleMeetData.alreadyExists) {
            toast.success("Google Meet data fetched successfully", { id: "summary-regen" });
          }
        }
      } catch (googleMeetError) {
        console.warn("Could not fetch Google Meet data, proceeding with regular summary:", googleMeetError);
      } finally {
        setFetchingGoogleMeetData(false);
      }
    }

    // Step 2: Regular summary regeneration using React Query
    regenerateSummaryMutation.mutate(selectedRecording.id);
  };

  const handleFetchGoogleMeetData = async () => {
    if (!selectedRecording?.id) return;

    if (selectedRecording.meetingPlatform !== "google-meet") {
      toast.error("This recording is not from Google Meet");
      return;
    }

    if (!selectedRecording.meetingId) {
      toast.error("No meeting ID available for this recording");
      return;
    }

    setFetchingGoogleMeetData(true);
    try {
      toast.loading("Fetching Google Meet participants and transcript...", { id: "google-meet-fetch" });
      
      const googleMeetResponse = await fetch(
        `${(import.meta as any).env.VITE_BACKEND_BASE_URL}/recordings/fetch-google-meet-data/${selectedRecording.id}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!googleMeetResponse.ok) {
        const errorData = await googleMeetResponse.json();
        throw new Error(errorData.error || "Failed to fetch Google Meet data");
      }

      const googleMeetData = await googleMeetResponse.json();
      
      // Handle special case where we got a valid response but it indicates no data
      if (googleMeetData.isGoogleMeetError) {
        toast.warning(
          googleMeetData.suggestion, 
          { 
            id: "google-meet-fetch",
            duration: 8000,
            description: "This is normal if transcription wasn't enabled during the meeting."
          }
        );
        return; // Don't update the recording state
      }
      
      // Update recording with Google Meet data
      const updatedRecording = {
        ...selectedRecording,
        participants: googleMeetData.participants,
        transcriptEntries: googleMeetData.transcriptEntries,
      };
      
      setSelectedRecording(updatedRecording);
      
      if (googleMeetData.alreadyExists) {
        toast.success("Google Meet data loaded successfully", { id: "google-meet-fetch" });
      } else {
        // Show appropriate success message based on what data was retrieved
        if (googleMeetData.hasParticipants && googleMeetData.hasTranscriptEntries) {
          toast.success(`Fetched ${googleMeetData.participants.length} participants and ${googleMeetData.transcriptEntries.length} transcript segments`, { id: "google-meet-fetch" });
        } else if (googleMeetData.hasParticipants && !googleMeetData.hasTranscriptEntries) {
          toast.success(`Fetched ${googleMeetData.participants.length} participants (no transcript data - transcription may not have been enabled)`, { id: "google-meet-fetch" });
        } else if (googleMeetData.spaceFound) {
          toast.info("Google Meet space found but no participant data available - transcription was likely not enabled during the meeting", { id: "google-meet-fetch" });
        } else {
          toast.success("Google Meet data fetched successfully", { id: "google-meet-fetch" });
        }
      }
    } catch (error) {
      console.error("Error fetching Google Meet data:", error);
      
      // Parse the error response to get more details
      let errorData = null;
      try {
        if (error.message) {
          // Try to parse JSON error message
          const match = error.message.match(/\{.*\}/);
          if (match) {
            errorData = JSON.parse(match[0]);
          }
        }
      } catch (parseError) {
        // Not JSON, continue with original error
      }
      
      // Handle specific Google Meet errors with helpful messages
      if (errorData && errorData.isGoogleMeetError) {
        toast.warning(
          `${errorData.message}: ${errorData.suggestion}`, 
          { 
            id: "google-meet-fetch",
            duration: 8000,
            description: "This is normal if transcription wasn't enabled during the meeting."
          }
        );
      } else {
        // Handle different types of errors more gracefully
        const errorMessage = error.message || String(error);
        
        if (errorMessage.includes("transcription")) {
          toast.warning("Google Meet space found but transcription was not enabled. Enable transcription in future meetings to get participant and speech data.", { id: "google-meet-fetch", duration: 6000 });
        } else if (errorMessage.includes("404") || errorMessage.includes("not found")) {
          toast.error("Google Meet data not found. This meeting may be too old, have incorrect meeting ID, or transcription wasn't enabled.", { id: "google-meet-fetch" });
        } else if (errorMessage.includes("401") || errorMessage.includes("authentication")) {
          toast.error("Google Meet access denied. Please re-authenticate with Google Meet permissions.", { id: "google-meet-fetch" });
        } else {
          toast.error(`Failed to fetch Google Meet data: ${errorMessage}`, { id: "google-meet-fetch" });
        }
      }
    } finally {
      setFetchingGoogleMeetData(false);
    }
  };

  return (
    <div className="flex lg:flex-row flex-col gap-2 justify-between mx-2">
      <div>
        {loading ? (
          <AudioPlayerLoadingSkeleton />
        ) : (
          <AudioPlayer audioUrl={selectedRecording?.recordingUrl} />
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {/* Google Meet data fetch button - only show for Google Meet recordings */}
        {selectedRecording?.meetingPlatform === "google-meet" && selectedRecording?.meetingId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleFetchGoogleMeetData}
                disabled={fetchingGoogleMeetData || regenerateTranscriptMutation.isPending || regenerateSummaryMutation.isPending || !selectedRecording?.id}
              >
                {fetchingGoogleMeetData ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                <span className="hidden lg:inline">
                  {fetchingGoogleMeetData ? "Fetching..." : "Fetch Participants"}
                </span>
                <span className="lg:hidden">
                  {fetchingGoogleMeetData ? "Fetching..." : "Participants"}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Fetch participant information and speaker-attributed transcript from Google Meet</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRegenerateTranscript}
              disabled={regenerateTranscriptMutation.isPending || regenerateSummaryMutation.isPending || !selectedRecording?.id}
            >
              {regenerateTranscriptMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="hidden lg:inline">
                {regenerateTranscriptMutation.isPending || regenerateSummaryMutation.isPending ? "Regenerating..." : "Regenerate Transcript & Summary"}
              </span>
              <span className="lg:hidden">
                {regenerateTranscriptMutation.isPending || regenerateSummaryMutation.isPending ? "Working..." : "Transcript"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Regenerates the transcript from audio and automatically creates a new summary</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRegenerateSummary}
              disabled={regenerateSummaryMutation.isPending || regenerateTranscriptMutation.isPending || !selectedRecording?.id || !selectedRecording?.transcript}
            >
              {regenerateSummaryMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="hidden lg:inline">
                {regenerateSummaryMutation.isPending ? "Regenerating..." : "Regenerate Summary"}
              </span>
              <span className="lg:hidden">
                {regenerateSummaryMutation.isPending ? "Working..." : "Summary"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Regenerates only the summary using the existing transcript</p>
          </TooltipContent>
        </Tooltip>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" />
          <span className="">Delete</span>
        </Button>
      </div>
    </div>
  );
};

export default TopComponent;
