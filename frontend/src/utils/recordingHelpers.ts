import type { recording } from "@/lib/types";

/**
 * Get the display title for a recording based on its processing status
 */
export function getRecordingDisplayTitle(recording: recording): string {
  // If transcription or summary is still processing
  if (
    recording.transcriptionStatus === "processing" ||
    recording.summaryStatus === "processing"
  ) {
    return "Transcribing & Summarizing...";
  }

  // If either failed
  if (
    recording.transcriptionStatus === "failed" ||
    recording.summaryStatus === "failed"
  ) {
    return "Processing Failed";
  }

  // If we have a user-provided or AI-generated title
  if (recording.title && recording.title.trim() !== "") {
    return recording.title;
  }

  // Default fallback
  return "Untitled Recording";
}

/**
 * Check if a recording is still being processed
 */
export function isRecordingProcessing(recording: recording): boolean {
  return (
    recording.transcriptionStatus === "processing" ||
    recording.transcriptionStatus === "pending" ||
    recording.summaryStatus === "processing"
  );
}

/**
 * Check if a recording processing has failed
 */
export function hasRecordingFailed(recording: recording): boolean {
  return (
    recording.transcriptionStatus === "failed" ||
    recording.summaryStatus === "failed"
  );
}

/**
 * Get a status message for a recording
 */
export function getRecordingStatusMessage(recording: recording): string | null {
  if (recording.transcriptionStatus === "processing") {
    return "Transcribing audio...";
  }

  if (recording.summaryStatus === "processing") {
    return "Generating summary...";
  }

  if (recording.transcriptionStatus === "failed") {
    return "Transcription failed. Try regenerating.";
  }

  if (recording.summaryStatus === "failed") {
    return "Summary generation failed. Try regenerating.";
  }

  if (
    recording.transcriptionStatus === "completed" &&
    recording.summaryStatus === "completed"
  ) {
    return null; // No status message needed
  }

  return "Processing...";
}
