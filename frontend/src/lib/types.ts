export type recording = {
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  meetingId: string | null;
  meetingPlatform: string | null;
  transcript: string | null;
  summary: string | null;
  recordingUrl: string;
  id: string;
  selected: boolean
  title: string;
  url: string;
};

export type sidebarItem = {
  title: string;
  url: string;
  selected: boolean;
  id: string;
};
