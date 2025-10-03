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
};
