import { create } from "zustand";
import { recording } from "@/lib/types";

interface RecordingsState {
  selectedRecording: recording | null;
  recordings: recording[];
  loading: boolean;
  setSelectedRecording: (recording: recording | null) => void;
  setRecordings: (recordings: recording[]) => void;
  setLoading: (loading: boolean) => void;
  updateRecording: (updatedRecording: recording) => void;
  fetchRecordings: () => Promise<void>;
}

export const useRecordingsStore = create<RecordingsState>((set, get) => ({
  selectedRecording: null,
  recordings: [],
  loading: true,

  setSelectedRecording: (recording) => {
    set({ selectedRecording: recording });
  },

  setRecordings: (recordings) => set({ recordings }),

  setLoading: (loading) => set({ loading }),

  updateRecording: (updatedRecording) => {
    const currentRecordings = get().recordings;
    const updatedRecordings = currentRecordings.map((recording) =>
      recording.id === updatedRecording.id ? updatedRecording : recording
    );

    const newSelectedRecording =
      get().selectedRecording?.id === updatedRecording.id
        ? updatedRecording
        : get().selectedRecording;

    set({
      recordings: updatedRecordings,
      selectedRecording: newSelectedRecording,
    });
  },

  fetchRecordings: async () => {
    set({ loading: true });
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/recordings`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch recordings");
      }

      if (!data.recordings || data.recordings.length === 0) {
        set({ recordings: [], loading: false });
        return;
      }

      const recordings = data.recordings.map((recording: recording) => ({
        ...recording,
        title: recording.title || recording.meetingId || "Untitled Meeting",
        selected: recording.id === data.recordings[0].id,
      }));

      // Set the first recording as selected by default
      const firstRecording = recordings[0];

      set({
        recordings,
        selectedRecording: firstRecording,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching recordings:", error);
      set({ loading: false });
      throw error;
    }
  },
}));
