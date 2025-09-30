import speech from "@google-cloud/speech";
import { prisma } from "../lib/prisma.ts";

export const googleSttTranscribe = async (
  fileUrl: string,
  recordingId: string,
  saveToDb = true
) => {
  const client = new speech.SpeechClient();

  const audio = {
    uri: fileUrl,
  };

  const config = {
    encoding: "LINEAR16" as const,
    sampleRateHertz: 16000,
    languageCode: "en-US",
    alternativeLanguageCodes: ["st-ZA"],
  };

  const request = {
    config: config,
    audio: audio,
  };

  const [operation] = await client.longRunningRecognize(request);

  // Placeholder for Google STT transcription logic
  console.log(
    `Transcribing ${fileUrl} with Google STT for recording ID: ${recordingId}`
  );
  // Simulate transcription result
  if (saveToDb) {
    await prisma.recording.update({
      where: { id: recordingId },
      data: { googleOperationName: operation.name },
    });
  }

  return operation;
};
