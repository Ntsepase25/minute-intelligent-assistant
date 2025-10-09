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
};

export type sidebarItem = {
  title: string;
  url: string;
  selected: boolean;
  id: string;
};
