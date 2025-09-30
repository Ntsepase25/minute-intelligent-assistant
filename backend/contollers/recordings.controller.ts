import type { User } from "better-auth";
import { prisma } from "../lib/prisma.ts";

export const createRecording = async (
  fileUrl: string | null,
  user: User,
  meetingId: string | null,
  meetingPlatform: string | null,
  googleOperationName?: string
) => {
  const recording = await prisma.recording.create({
    data: {
      recordingUrl: fileUrl,
      meetingId: meetingId,
      meetingPlatform: meetingPlatform,
      user: {
        connect: { id: user.id }
      },
      googleOperationName: googleOperationName
    },
  });

  if (!recording) {
    return "Failed to create recording"
  }

  return recording;
};

export const getRecordingById = async (recordingId: string) => {
  const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      // include: { transcripts: true },
    });

    if (!recording) {
      return "Failed to get recording"
    }

    return recording
}