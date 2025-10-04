import { create } from "zustand";

type recording = {
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  meetingId: string | null;
  meetingPlatform: string | null;
  transcript: string | null;
  summary: string | null;
  recordingUrl: string;
  id: string;
  selected: boolean;
  title: string;
};

interface SelectedRecordingState {
  selectedRecording: recording | null;
  setSelectedRecording: (recording: recording | null) => void;
}

export const useSelectedRecordingStore = create<SelectedRecordingState>((set) => ({
  selectedRecording: null,
  setSelectedRecording: (recording) => set({ selectedRecording: recording }),
}));
