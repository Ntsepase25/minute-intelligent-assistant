import { create } from "zustand";
import { recording } from "@/lib/types";

interface SelectedRecordingState {
  selectedRecording: recording | null;
  setSelectedRecording: (recording: recording | null) => void;
}

export const useSelectedRecordingStore = create<SelectedRecordingState>((set) => ({
  selectedRecording: null,
  setSelectedRecording: (recording) => set({ selectedRecording: recording }),
}));
