"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Pin } from "lucide-react";
import { useSelectedRecordingStore } from "@/stores/recordingsStore";
import MeetingSummary from "@/components/dashboard/MeetingSummary";
import ActionItems from "@/components/dashboard/ActionItems";
import NextMeeting from "@/components/dashboard/NextMeeting";
import Transcript from "@/components/dashboard/Transcript";

export default function BentoGrid() {
  const selectedRecording = useSelectedRecordingStore(
    (state) => state.selectedRecording
  );

  if (!selectedRecording) {
    return (
      <section className="relative overflow-hidden pb-12 pt-2">
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

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-3">
        {/* Meeting Summary - Takes 2 columns */}
        <div className="col-span-1 md:col-span-2 min-h-60">
          <MeetingSummary
            title={selectedRecording.title}
            minutes={selectedRecording.minutes}
            summary={selectedRecording.summary}
            createdAt={selectedRecording.createdAt}
          />
        </div>

        {/* Action Items */}
        <div className="col-span-1 min-h-60">
          <ActionItems actionItems={selectedRecording.actionItems} />
        </div>

        {/* Next Meeting */}
        <div className="col-span-1 min-h-60">
          <NextMeeting nextMeeting={selectedRecording.nextMeeting} />
        </div>

        {/* Transcript - Takes 2 columns */}
        <div className="col-span-1 md:col-span-2 min-h-60">
          <Transcript transcript={selectedRecording.transcript} />
        </div>
      </div>
    </section>
  );
}
