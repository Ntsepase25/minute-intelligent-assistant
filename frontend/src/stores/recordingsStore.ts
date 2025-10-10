import { create } from "zustand";
import { recording } from "@/lib/types";

interface RecordingsState {
  selectedRecording: recording | null;
  setSelectedRecording: (recording: recording | null) => void;
  clearSelectedRecording: () => void;
  
  // UI state that doesn't need to be in React Query
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Filters and search (local UI state)
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  
  selectedFilter: string;
  setSelectedFilter: (filter: string) => void;
}

export const useRecordingsStore = create<RecordingsState>((set, get) => ({
  selectedRecording: null,
  sidebarCollapsed: false,
  searchTerm: "",
  selectedFilter: "all",

  setSelectedRecording: (recording) => {
    set({ selectedRecording: recording });
  },

  clearSelectedRecording: () => {
    set({ selectedRecording: null });
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term });
  },

  setSelectedFilter: (filter) => {
    set({ selectedFilter: filter });
  },
}));
