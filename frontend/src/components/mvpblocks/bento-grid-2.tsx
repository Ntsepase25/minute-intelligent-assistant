"use client";
import { Pin } from "lucide-react";
import { useRecordingsStore } from "@/stores/recordingsStore";
import MeetingSummary from "@/components/dashboard/MeetingSummary";
import ActionItems from "@/components/dashboard/ActionItems";
import NextMeeting from "@/components/dashboard/NextMeeting";
import Transcript from "@/components/dashboard/Transcript";
import TranscriptWithSpeakers from "@/components/dashboard/TranscriptWithSpeakers";
import { isRecordingProcessing } from "@/utils/recordingHelpers";

export default function BentoGrid() {
  const { selectedRecording } = useRecordingsStore();

  if (!selectedRecording) {
    return (
      <section className="w-full flex flex-col items-center justify-center py-20">
        <div className="w-full text-xl font-bold flex items-center gap-2">
          <Pin className="h-4 w-4 text-primary" />
          Notes & Key Points
        </div>
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-3">
          <div className="col-span-1 md:col-span-2 min-h-60">
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a recording to view details
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden pb-12 pt-2">
      <div className="w-full text-xl font-bold flex items-center gap-2">
        <Pin className="h-4 w-4 text-primary" />
        Notes & Key Points
      </div>
      
      {/* Decorative elements */}
      <div className="bg-primary/5 absolute top-20 -left-20 h-64 w-64 rounded-full blur-3xl" />
      <div className="bg-primary/5 absolute -right-20 bottom-20 h-64 w-64 rounded-full blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-4 p-4 lg:grid-cols-3">
        {/* Meeting Summary - Takes full width on mobile/tablet, 2 cols on desktop */}
        <div className="col-span-1 lg:col-span-2 min-h-60">
          <MeetingSummary
            title={selectedRecording.title}
            minutes={selectedRecording.minutes}
            summary={selectedRecording.summary}
            createdAt={selectedRecording.createdAt}
            isProcessing={isRecordingProcessing(selectedRecording)}
            transcriptionStatus={selectedRecording.transcriptionStatus}
            summaryStatus={selectedRecording.summaryStatus}
          />
        </div>

        {/* Action Items - Full width on mobile/tablet, 1 col on desktop */}
        <div className="col-span-1 min-h-60">
          <ActionItems actionItems={selectedRecording.actionItems} />
        </div>

        {/* Next Meeting - Full width on mobile/tablet, 1 col on desktop */}
        <div className="col-span-1 min-h-60">
          <NextMeeting nextMeeting={selectedRecording.nextMeeting} />
        </div>

        {/* Transcript - Full width on mobile/tablet, 2 cols on desktop */}
        <div className="col-span-1 lg:col-span-2 min-h-60">
          {selectedRecording.meetingPlatform === "google-meet" ? (
            <TranscriptWithSpeakers 
              transcriptEntries={selectedRecording.transcriptEntries}
              participants={selectedRecording.participants}
              meetingId={selectedRecording.meetingId}
              googleMeetError={!selectedRecording.transcriptEntries && !selectedRecording.participants}
            />
          ) : (
            <Transcript transcript={selectedRecording.transcript} />
          )}
        </div>

        {/* Regular Transcript - Full width on mobile/tablet, 3 cols on desktop */}
        <div className="col-span-1 lg:col-span-3 min-h-60">
          <Transcript transcript={selectedRecording.transcript} />
        </div>
      </div>
    </section>
  );
}
