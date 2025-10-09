import { RefreshCcw, Trash2, Loader2, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { recording } from "@/lib/types";
import { useRecordingsStore } from "@/stores/recordingsStore";
import AudioPlayer from "./audioPlayer";
import { AudioPlayerLoadingSkeleton } from "./audioPlayerSkeleton";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  loading: boolean;
};

const TopComponent = ({ loading }: Props) => {
  const { selectedRecording, setSelectedRecording, updateRecording } = useRecordingsStore();
  const [regeneratingTranscript, setRegeneratingTranscript] = useState(false);
  const [regeneratingSummary, setRegeneratingSummary] = useState(false);

  const handleRegenerateTranscript = async () => {
    if (!selectedRecording?.id) return;

    setRegeneratingTranscript(true);
    try {
      // Step 1: Regenerate transcript
      toast.loading("Regenerating transcript...", { id: "transcript-regen" });
      
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/recordings/regenerate-transcript/${selectedRecording.id}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to regenerate transcript");
      }

      const data = await response.json();
      
      // Update the selected recording with new transcript
      const updatedRecording = {
        ...selectedRecording,
        transcript: data.transcript,
      };
      
      setSelectedRecording(updatedRecording);
      updateRecording(updatedRecording); // Update global recordings state
      toast.success("Transcript regenerated successfully", { id: "transcript-regen" });
      
      // Step 2: Automatically regenerate summary
      setRegeneratingSummary(true);
      toast.loading("Auto-regenerating summary from new transcript...", { id: "summary-auto-regen" });
      
      try {
        const summaryResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_BASE_URL}/recordings/regenerate-summary/${selectedRecording.id}`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (!summaryResponse.ok) {
          const errorData = await summaryResponse.json();
          throw new Error(errorData.details || "Failed to regenerate summary");
        }

        const summaryData = await summaryResponse.json();
        
        // Update the selected recording with new summary data
        const finalUpdatedRecording = {
          ...updatedRecording,
          summary: typeof summaryData.summary === 'string' ? summaryData.summary : summaryData.summary?.minutes,
          title: typeof summaryData.summary === 'object' ? summaryData.summary?.title : updatedRecording.title,
          minutes: typeof summaryData.summary === 'object' ? summaryData.summary?.minutes : null,
          actionItems: typeof summaryData.summary === 'object' ? summaryData.summary?.actionItems : null,
          nextMeeting: typeof summaryData.summary === 'object' ? summaryData.summary?.nextMeeting : null,
          summaryData: typeof summaryData.summary === 'object' ? summaryData.summary : null,
        };
        
        setSelectedRecording(finalUpdatedRecording);
        updateRecording(finalUpdatedRecording); // Update global recordings state
        toast.success("Summary auto-regenerated successfully!", { id: "summary-auto-regen" });
      } catch (summaryError) {
        console.error("Error regenerating summary:", summaryError);
        toast.error(`Failed to auto-regenerate summary: ${summaryError.message}`, { id: "summary-auto-regen" });
      } finally {
        setRegeneratingSummary(false);
      }
      
    } catch (error) {
      console.error("Error regenerating transcript:", error);
      toast.error(`Failed to regenerate transcript: ${error.message}`, { id: "transcript-regen" });
    } finally {
      setRegeneratingTranscript(false);
    }
  };

  const handleRegenerateSummary = async () => {
    if (!selectedRecording?.id) return;

    if (!selectedRecording.transcript) {
      toast.error("No transcript available. Please regenerate transcript first.");
      return;
    }

    setRegeneratingSummary(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/recordings/regenerate-summary/${selectedRecording.id}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to regenerate summary");
      }

      const data = await response.json();
      
      // Update the selected recording with new summary data
      const updatedRecording = {
        ...selectedRecording,
        summary: typeof data.summary === 'string' ? data.summary : data.summary?.minutes,
        title: typeof data.summary === 'object' ? data.summary?.title : selectedRecording.title,
        minutes: typeof data.summary === 'object' ? data.summary?.minutes : null,
        actionItems: typeof data.summary === 'object' ? data.summary?.actionItems : null,
        nextMeeting: typeof data.summary === 'object' ? data.summary?.nextMeeting : null,
        summaryData: typeof data.summary === 'object' ? data.summary : null,
      };
      
      setSelectedRecording(updatedRecording);
      updateRecording(updatedRecording); // Update global recordings state
      toast.success("Summary regenerated successfully");
    } catch (error) {
      console.error("Error regenerating summary:", error);
      toast.error(`Failed to regenerate summary: ${error.message}`);
    } finally {
      setRegeneratingSummary(false);
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
      <div className="flex gap-2 items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRegenerateTranscript}
              disabled={regeneratingTranscript || regeneratingSummary || !selectedRecording?.id}
            >
              {regeneratingTranscript ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="hidden lg:inline">
                {regeneratingTranscript || regeneratingSummary ? "Regenerating..." : "Regenerate Transcript & Summary"}
              </span>
              <span className="lg:hidden">
                {regeneratingTranscript || regeneratingSummary ? "Working..." : "Transcript"}
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
              disabled={regeneratingSummary || regeneratingTranscript || !selectedRecording?.id || !selectedRecording?.transcript}
            >
              {regeneratingSummary ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="hidden lg:inline">
                {regeneratingSummary ? "Regenerating..." : "Regenerate Summary"}
              </span>
              <span className="lg:hidden">
                {regeneratingSummary ? "Working..." : "Summary"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Regenerates only the summary using the existing transcript</p>
          </TooltipContent>
        </Tooltip>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" />
          <span className="hidden lg:inline">Delete</span>
        </Button>
      </div>
    </div>
  );
};

export default TopComponent;
