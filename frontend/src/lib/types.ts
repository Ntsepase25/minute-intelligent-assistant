export type ActionItem = {
  task: string;
  assignee: string;
  deadline: string | null;
  priority: "high" | "medium" | "low";
};

export type NextMeeting = {
  date: string | null;
  location: string | null;
  notes: string | null;
};

export type MeetingSummaryData = {
  title: string;
  minutes: string;
  actionItems: ActionItem[];
  nextMeeting: NextMeeting | null;
};

export type Participant = {
  id: string;
  recordingId: string;
  googleParticipantId: string;
  googleUserId: string | null;
  displayName: string | null;
  participantType: "signedinUser" | "anonymousUser" | "phoneUser";
  earliestStartTime: Date | null;
  latestEndTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TranscriptEntry = {
  id: string;
  recordingId: string;
  googleEntryId: string;
  googleParticipantId: string | null;
  text: string;
  languageCode: string | null;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type recording = {
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  meetingId: string | null;
  meetingPlatform: string | null;
  transcript: string | null;
  summary: string | null;
  title: string | null;
  minutes: string | null;
  actionItems: ActionItem[] | null;
  nextMeeting: NextMeeting | null;
  summaryData: MeetingSummaryData | null;
  recordingUrl: string;
  id: string;
  selected: boolean;
  url: string;
  
  // Google Meet specific fields
  googleMeetConferenceId: string | null;
  googleMeetSpace: string | null;
  participants: Participant[] | null;
  transcriptEntries: TranscriptEntry[] | null;
};

export type sidebarItem = {
  title: string;
  url: string;
  selected: boolean;
  id: string;
};
