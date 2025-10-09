import speech from "@google-cloud/speech";
import { prisma } from "../lib/prisma.ts";
import { GoogleGenAI } from "@google/genai";
import { whisper } from "whisper-node";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import os from "os";
import fs from "fs";
import { AssemblyAI } from "assemblyai";

import path from "path";

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const tmpDir = path.join(os.tmpdir(), "uploads");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

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

export async function generateSummary(transcript) {
  console.log("🤖 [SUMMARY] Starting summary generation...");
  console.log(
    "🤖 [SUMMARY] Transcript length:",
    transcript?.length || 0,
    "characters"
  );

  try {
    // Handle cases where transcript is empty or indicates an error
    if (
      !transcript ||
      transcript.trim().length === 0 ||
      transcript.includes("No audio content detected") ||
      transcript.includes("No speech detected") ||
      transcript.includes("Transcription failed")
    ) {
      console.log(
        "🤖 [SUMMARY] Skipping summary - invalid transcript detected"
      );
      return "No summary available - unable to transcribe audio content.";
    }

    const googleApiKey = process.env.GEMINI_API_KEY;
    if (!googleApiKey) {
      console.log("🤖 [SUMMARY] ❌ Google API key not configured");
      return "Google API key not configured";
    }

    // console.log("api key: ", googleApiKey);

    console.log("🤖 [SUMMARY] Sending request to Google Gemini API...");
    const content = `Summarize the following meeting transcript in a concise manner, highlighting key points and action items:\n\n${transcript}\n\nSummary:`;

    const ai = new GoogleGenAI({ apiKey: googleApiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: content,
    });

    console.log("🤖 [SUMMARY] ✅ Summary generated successfully");
    console.log(
      "🤖 [SUMMARY] Summary length:",
      response.text?.length || 0,
      "characters"
    );
    return (
      response.text || "Summary generation completed but no content returned."
    );
  } catch (error) {
    console.error("🤖 [SUMMARY] ❌ Summary generation error:", error);
    return "Failed to generate summary due to an error.";
  }
}

// Transcribe a local WAV file path using whisper-node and optionally save to DB
export async function transcribeFromLocalPath(
  wavPath,
  recordingId,
  saveToDb = true
) {
  console.log("🎤 [TRANSCRIBE] Starting transcription process...");
  console.log("🎤 [TRANSCRIBE] WAV file path:", wavPath);
  console.log("🎤 [TRANSCRIBE] Recording ID:", recordingId);

  if (!fs.existsSync(wavPath))
    throw new Error("WAV file not found: " + wavPath);

  try {
    console.log("🎤 [TRANSCRIBE] Calling whisper-node with base model...");
    // whisper-node in your repo was previously called with a path
    const result = await whisper(wavPath, { modelName: "base" });

    console.log("🎤 [TRANSCRIBE] Whisper result received:", result);

    // Handle case where result is null or undefined
    if (!result) {
      console.warn(
        "🎤 [TRANSCRIBE] ⚠️ Whisper returned null/undefined - audio might be silent or too short"
      );
      const transcriptText = "No audio content detected";
      const summary =
        "No content to summarize - audio appears to be silent or empty.";

      if (saveToDb && recordingId) {
        console.log(
          "🎤 [TRANSCRIBE] Saving fallback transcript to database..."
        );
        await prisma.recording.update({
          where: { id: recordingId },
          data: { transcript: transcriptText, summary },
        });
      }

      return { transcriptText, summary };
    }

    console.log("🎤 [TRANSCRIBE] Processing whisper result format...");
    let transcriptText = "";

    // Handle various result formats
    if (Array.isArray(result) && result.length > 0) {
      console.log(
        "🎤 [TRANSCRIBE] Result is array with",
        result.length,
        "items"
      );
      transcriptText = result
        .map((s) => s.speech || s.text || "")
        .join(" ")
        .trim();
    } else if (typeof result === "string") {
      console.log("🎤 [TRANSCRIBE] Result is string");
      transcriptText = result.trim();
    } else if (result.speech) {
      console.log("🎤 [TRANSCRIBE] Result has speech property");
      transcriptText = result.speech.trim();
    } else if (result.text) {
      console.log("🎤 [TRANSCRIBE] Result has text property");
      transcriptText = result.text.trim();
    } else {
      console.warn(
        "🎤 [TRANSCRIBE] ⚠️ Unexpected transcription result format:",
        JSON.stringify(result)
      );
      transcriptText = "Unable to parse transcription result";
    }

    // Handle empty transcription
    if (!transcriptText || transcriptText.length === 0) {
      console.log("🎤 [TRANSCRIBE] ⚠️ Empty transcription detected");
      transcriptText = "No speech detected in audio";
    }

    console.log("🎤 [TRANSCRIBE] ✅ Transcription completed successfully");
    console.log(
      "🎤 [TRANSCRIBE] Transcript length:",
      transcriptText.length,
      "characters"
    );
    console.log(
      "🎤 [TRANSCRIBE] Transcript preview:",
      transcriptText.substring(0, 100) + "..."
    );

    console.log("🎤 [TRANSCRIBE] Starting summary generation...");
    const summary = await generateSummary(transcriptText);

    if (saveToDb && recordingId) {
      console.log(
        "🎤 [TRANSCRIBE] Saving transcript and summary to database..."
      );
      await prisma.recording.update({
        where: { id: recordingId },
        data: { transcript: transcriptText, summary },
      });
      console.log("🎤 [TRANSCRIBE] ✅ Database updated successfully");
    }

    return { transcriptText, summary };
  } catch (error) {
    console.error("🎤 [TRANSCRIBE] ❌ Whisper transcription error:", error);

    // Provide fallback response instead of throwing
    const transcriptText = "Transcription failed - error processing audio";
    const summary = "Unable to generate summary due to transcription error.";

    if (saveToDb && recordingId) {
      console.log("🎤 [TRANSCRIBE] Saving error fallback to database...");
      await prisma.recording.update({
        where: { id: recordingId },
        data: { transcript: transcriptText, summary },
      });
    }

    return { transcriptText, summary };
  }
}

// Convert any uploaded file on disk to a 16kHz mono WAV on disk (returns wav path)
export async function convertToWavOnDisk(inputPath) {
  const id = Date.now() + "-" + Math.floor(Math.random() * 1e6);
  const outName = `conv-${id}.wav`;
  const outPath = path.join(tmpDir, outName);

  await new Promise<void>((resolve, reject) => {
    // @ts-ignore
    ffmpeg(inputPath)
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .audioChannels(1)
      .format("wav")
      .on("error", (err) => reject(err))
      .on("end", () => resolve())
      .save(outPath);
  });

  return outPath;
}

export async function transcribeFromAssemblyAI(
  fileUrl: string,
  recordingId: string,
  saveToDb = true
) {
  const assemblyApiKey = process.env.ASSEMBLY_AI_API_KEY;
  if (!assemblyApiKey) throw new Error("AssemblyAI API key not configured");

  console.log(
    `Transcribing ${fileUrl} with AssemblyAI for recording ID: ${recordingId}`
  );

  const apiKey = process.env.ASSEMBLY_AI_API_KEY;
  if (!apiKey) throw new Error("AssemblyAI API key not configured");

  const client = new AssemblyAI({
    apiKey,
  });

  const params = {
    audio: fileUrl,
    speech_model: "universal",
  };

  const transcript = await client.transcripts.transcribe({
    audio_url: fileUrl,
    speech_model: "universal",
    format_text: true,
    punctuate: true,
  });

  console.log("AssemblyAI transcription initiated:", transcript);


  if (saveToDb) {
    await prisma.recording.update({
      where: { id: recordingId },
      data: { assemblyOperationId: transcript.id },
    });
  }

  console.log(
    `AssemblyAI transcription started with ID: ${transcript.id} for recording ID: ${recordingId}`
  );
  return transcript;
}
