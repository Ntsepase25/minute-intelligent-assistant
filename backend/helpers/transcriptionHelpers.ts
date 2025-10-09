import speech from "@google-cloud/speech";
import { prisma } from "../lib/prisma.ts";
import { GoogleGenAI } from "@google/genai";
// import { whisper } from "whisper-node";
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
    languageCode: "st-ZA", // Primary language: Sesotho (South Africa)
    alternativeLanguageCodes: ["en-US", "en-ZA"], // Alternative languages: English (US & South African)
    enableAutomaticPunctuation: true,
    model: "latest_long", // Better for longer audio files
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
  console.log("🤖 [SUMMARY] Starting comprehensive summary generation...");
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
      return {
        title: "Meeting Recording",
        minutes: "No summary available - unable to transcribe audio content.",
        actionItems: [],
        nextMeeting: null,
      };
    }

    const googleApiKey = process.env.GEMINI_API_KEY;
    if (!googleApiKey) {
      console.log("🤖 [SUMMARY] ❌ Google API key not configured");
      return {
        title: "Meeting Recording",
        minutes: "Google API key not configured",
        actionItems: [],
        nextMeeting: null,
      };
    }

    console.log("🤖 [SUMMARY] Sending request to Google Gemini API...");
    const content = `Analyze the following meeting transcript and extract:

Note: This transcript may contain both English and Sesotho text. Please analyze the content regardless of language and provide the summary in English.

1. MEETING TITLE: A concise, descriptive title based on the main topic/purpose of the meeting
2. MEETING MINUTES: A concise summary of key discussion points and decisions made
3. ACTION ITEMS: Specific tasks mentioned with assigned person (if mentioned) and deadlines (if mentioned)
4. NEXT MEETING: Any mention of when/where the next meeting will be held

Please format your response as JSON:
{
  "title": "Descriptive meeting title based on main topic discussed",
  "minutes": "Summary of the meeting discussion and key decisions...",
  "actionItems": [
    {
      "task": "Description of the task",
      "assignee": "Person assigned (or 'Unassigned' if not mentioned)",
      "deadline": "Deadline mentioned (or null if not specified)",
      "priority": "high/medium/low (based on context, or 'medium' as default)"
    }
  ],
  "nextMeeting": {
    "date": "Date/time mentioned (or null)",
    "location": "Location/platform mentioned (or null)",
    "notes": "Any additional details about next meeting"
  }
}

Transcript:
${transcript}`;

    const ai = new GoogleGenAI({ apiKey: googleApiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: content,
    });

    console.log("🤖 [SUMMARY] ✅ Summary generated successfully");

    let parsedResponse;
    try {
      // Try to parse the JSON response
      const responseText = response.text || "";
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.warn(
        "🤖 [SUMMARY] ⚠️ Failed to parse JSON response, using fallback format"
      );
      // Fallback to plain text format
      parsedResponse = {
        title: "Meeting Recording",
        minutes:
          response.text ||
          "Summary generation completed but no content returned.",
        actionItems: [],
        nextMeeting: null,
      };
    }

    console.log(
      "🤖 [SUMMARY] Action items found:",
      parsedResponse.actionItems?.length || 0
    );
    console.log(
      "🤖 [SUMMARY] Next meeting:",
      parsedResponse.nextMeeting?.date ? "Scheduled" : "Not mentioned"
    );

    return parsedResponse;
  } catch (error) {
    console.error("🤖 [SUMMARY] ❌ Summary generation error:", error);
    return {
      title: "Meeting Recording",
      minutes: "Failed to generate summary due to an error.",
      actionItems: [],
      nextMeeting: null,
    };
  }
}

// Transcribe a local WAV file path using whisper-node and optionally save to DB
// export async function transcribeFromLocalPath(
//   wavPath,
//   recordingId,
//   saveToDb = true
// ) {
//   console.log("🎤 [TRANSCRIBE] Starting transcription process...");
//   console.log("🎤 [TRANSCRIBE] WAV file path:", wavPath);
//   console.log("🎤 [TRANSCRIBE] Recording ID:", recordingId);

//   if (!fs.existsSync(wavPath))
//     throw new Error("WAV file not found: " + wavPath);

//   try {
//     console.log("🎤 [TRANSCRIBE] Calling whisper-node with base model...");
//     // whisper-node in your repo was previously called with a path
//     const result = await whisper(wavPath, { modelName: "base" });

//     console.log("🎤 [TRANSCRIBE] Whisper result received:", result);

//     // Handle case where result is null or undefined
//     if (!result) {
//       console.warn(
//         "🎤 [TRANSCRIBE] ⚠️ Whisper returned null/undefined - audio might be silent or too short"
//       );
//       const transcriptText = "No audio content detected";
//       const summary =
//         "No content to summarize - audio appears to be silent or empty.";

//       if (saveToDb && recordingId) {
//         console.log(
//           "🎤 [TRANSCRIBE] Saving fallback transcript to database..."
//         );
//         await prisma.recording.update({
//           where: { id: recordingId },
//           data: { transcript: transcriptText, summary },
//         });
//       }

//       return { transcriptText, summary };
//     }

//     console.log("🎤 [TRANSCRIBE] Processing whisper result format...");
//     let transcriptText = "";

//     // Handle various result formats
//     if (Array.isArray(result) && result.length > 0) {
//       console.log(
//         "🎤 [TRANSCRIBE] Result is array with",
//         result.length,
//         "items"
//       );
//       transcriptText = result
//         .map((s) => s.speech || s.text || "")
//         .join(" ")
//         .trim();
//     } else if (typeof result === "string") {
//       console.log("🎤 [TRANSCRIBE] Result is string");
//       transcriptText = result.trim();
//     } else if (result.speech) {
//       console.log("🎤 [TRANSCRIBE] Result has speech property");
//       transcriptText = result.speech.trim();
//     } else if (result.text) {
//       console.log("🎤 [TRANSCRIBE] Result has text property");
//       transcriptText = result.text.trim();
//     } else {
//       console.warn(
//         "🎤 [TRANSCRIBE] ⚠️ Unexpected transcription result format:",
//         JSON.stringify(result)
//       );
//       transcriptText = "Unable to parse transcription result";
//     }

//     // Handle empty transcription
//     if (!transcriptText || transcriptText.length === 0) {
//       console.log("🎤 [TRANSCRIBE] ⚠️ Empty transcription detected");
//       transcriptText = "No speech detected in audio";
//     }

//     console.log("🎤 [TRANSCRIBE] ✅ Transcription completed successfully");
//     console.log(
//       "🎤 [TRANSCRIBE] Transcript length:",
//       transcriptText.length,
//       "characters"
//     );
//     console.log(
//       "🎤 [TRANSCRIBE] Transcript preview:",
//       transcriptText.substring(0, 100) + "..."
//     );

//     console.log("🎤 [TRANSCRIBE] Starting summary generation...");
//     const summary = await generateSummary(transcriptText);

//     if (saveToDb && recordingId) {
//       console.log(
//         "🎤 [TRANSCRIBE] Saving transcript and summary to database..."
//       );
//       await prisma.recording.update({
//         where: { id: recordingId },
//         data: { 
//           transcript: transcriptText, 
//           summary: typeof summary === 'string' ? summary : summary.minutes,
//           title: typeof summary === 'object' ? summary.title : null,
//           minutes: typeof summary === 'object' ? summary.minutes : null,
//           actionItems: typeof summary === 'object' ? summary.actionItems : null,
//           nextMeeting: typeof summary === 'object' ? summary.nextMeeting : null,
//           summaryData: typeof summary === 'object' ? summary : null,
//         },
//       });
//       console.log("🎤 [TRANSCRIBE] ✅ Database updated successfully");
//     }

//     return { transcriptText, summary };
//   } catch (error) {
//     console.error("🎤 [TRANSCRIBE] ❌ Whisper transcription error:", error);

//     // Provide fallback response instead of throwing
//     const transcriptText = "Transcription failed - error processing audio";
//     const summary = "Unable to generate summary due to transcription error.";

//     if (saveToDb && recordingId) {
//       console.log("🎤 [TRANSCRIBE] Saving error fallback to database...");
//       await prisma.recording.update({
//         where: { id: recordingId },
//         data: { transcript: transcriptText, summary },
//       });
//     }

//     return { transcriptText, summary };
//   }
// }

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
    `🔵 [ASSEMBLY-AI] Transcribing ${fileUrl} for recording ID: ${recordingId}`
  );

  const client = new AssemblyAI({
    apiKey: assemblyApiKey,
  });

  // Start transcription with automatic language detection for multilingual content
  const transcript = await client.transcripts.transcribe({
    audio_url: fileUrl,
    speech_model: "universal",
    format_text: true,
    punctuate: true,
    language_detection: true, // Enable automatic language detection
    // Remove fixed language_code since AssemblyAI doesn't support Sesotho
    // This will auto-detect English and other supported languages
  });

  console.log("🔵 [ASSEMBLY-AI] Transcription completed:", transcript.status);

  if (transcript.status === "error") {
    throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
  }

  const transcriptText = transcript.text || "No transcript available";
  
  console.log("🔵 [ASSEMBLY-AI] ✅ Transcript received, generating summary...");
  const summary = await generateSummary(transcriptText);

  if (saveToDb) {
    console.log("🔵 [ASSEMBLY-AI] Saving transcript and summary to database...");
    await prisma.recording.update({
      where: { id: recordingId },
      data: { 
        transcript: transcriptText,
        summary: typeof summary === 'string' ? summary : summary.minutes,
        title: typeof summary === 'object' ? summary.title : null,
        minutes: typeof summary === 'object' ? summary.minutes : null,
        actionItems: typeof summary === 'object' ? summary.actionItems : null,
        nextMeeting: typeof summary === 'object' ? summary.nextMeeting : null,
        summaryData: typeof summary === 'object' ? summary : null,
        assemblyOperationId: transcript.id,
      },
    });
    console.log("🔵 [ASSEMBLY-AI] ✅ Database updated successfully");
  }

  console.log(
    `🔵 [ASSEMBLY-AI] ✅ Complete processing finished for recording ID: ${recordingId}`
  );
  
  return { transcriptText, summary };
}

// Regenerate transcript only for a recording
export async function regenerateTranscript(recordingId: string) {
  console.log(`🔄 [REGENERATE] Starting transcript regeneration for recording: ${recordingId}`);
  
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId }
  });

  if (!recording) {
    throw new Error("Recording not found");
  }

  if (!recording.recordingUrl) {
    throw new Error("No recording URL found for this recording");
  }

  console.log(`🔄 [REGENERATE] Transcribing audio without auto-summary...`);
  
  const assemblyApiKey = process.env.ASSEMBLY_AI_API_KEY;
  if (!assemblyApiKey) throw new Error("AssemblyAI API key not configured");

  const client = new AssemblyAI({
    apiKey: assemblyApiKey,
  });

  // Start transcription with automatic language detection for multilingual content
  const transcript = await client.transcripts.transcribe({
    audio_url: recording.recordingUrl,
    speech_model: "universal",
    format_text: true,
    punctuate: true,
    language_detection: true, // Enable automatic language detection
  });

  if (transcript.status === "error") {
    throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
  }

  const transcriptText = transcript.text || "No transcript available";
  
  // Save only the transcript first (without summary)
  await prisma.recording.update({
    where: { id: recordingId },
    data: { 
      transcript: transcriptText,
      assemblyOperationId: transcript.id,
    },
  });
  
  console.log(`🔄 [REGENERATE] ✅ Transcript regenerated for recording: ${recordingId}`);
  return { transcriptText };
}

// Regenerate summary only for a recording (requires existing transcript)
export async function regenerateSummary(recordingId: string) {
  console.log(`🔄 [REGENERATE] Starting summary regeneration for recording: ${recordingId}`);
  
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId }
  });

  if (!recording) {
    throw new Error("Recording not found");
  }

  if (!recording.transcript) {
    throw new Error("No transcript found for this recording. Please regenerate transcript first.");
  }

  console.log(`🔄 [REGENERATE] Generating summary from existing transcript...`);
  const summary = await generateSummary(recording.transcript);

  // Save updated summary to database
  await prisma.recording.update({
    where: { id: recordingId },
    data: { 
      summary: typeof summary === 'string' ? summary : summary.minutes,
      title: typeof summary === 'object' ? summary.title : null,
      minutes: typeof summary === 'object' ? summary.minutes : null,
      actionItems: typeof summary === 'object' ? summary.actionItems : null,
      nextMeeting: typeof summary === 'object' ? summary.nextMeeting : null,
      summaryData: typeof summary === 'object' ? summary : null,
    },
  });

  console.log(`🔄 [REGENERATE] ✅ Summary regenerated for recording: ${recordingId}`);
  return summary;
}
