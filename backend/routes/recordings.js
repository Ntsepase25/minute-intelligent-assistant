import express from "express";
import multer from "multer";
import path from "path";
import os from "os";
import fs from "fs";
import { Readable } from "node:stream";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { UTApi, UTFile } from "uploadthing/server"; // server SDK
import { auth } from "../lib/auth.ts";
import { prisma } from "../lib/prisma.ts";
import { createRecording } from "../contollers/recordings.controller.ts";
import { GoogleGenAI } from "@google/genai";
import { whisper } from "whisper-node";
import { fromNodeHeaders } from "better-auth/node";
import { googleSttTranscribe } from "../helpers/transcriptionHelpers.ts";

ffmpeg.setFfmpegPath(ffmpegStatic);

// --- Helpers ---
const tmpDir = path.join(os.tmpdir(), "uploads");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// Use disk storage for multer (no in-memory buffers)
const upload = multer({
  storage: multer.diskStorage({
    destination: tmpDir,
    filename: (req, file, cb) => {
      const unique = Date.now() + "-" + Math.floor(Math.random() * 1e6);
      // keep original extension
      cb(null, `${unique}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("audio/") ||
      file.mimetype.startsWith("video/")
    )
      cb(null, true);
    else cb(new Error("Only audio and video files are allowed"), false);
  },
});

const utapi = new UTApi({ apiKey: process.env.UPLOADTHING_SECRET });

async function generateSummary(transcript) {
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
async function transcribeFromLocalPath(wavPath, recordingId, saveToDb = true) {
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
async function convertToWavOnDisk(inputPath) {
  const id = Date.now() + "-" + Math.floor(Math.random() * 1e6);
  const outName = `conv-${id}.wav`;
  const outPath = path.join(tmpDir, outName);

  await new Promise((resolve, reject) => {
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

const recordingsRouter = express.Router();

recordingsRouter.get("/", async (req, res) => {
  try {
    const userSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    console.log("User session:", userSession);
    if (!userSession)
      return res.status(403).json({ message: "User not logged in" });

    const recordings = await prisma.recording.findMany({
      where: { userId: userSession.user.id },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ recordings });
  } catch (error) {
    console.error("Fetch recordings error:", error);
    return res.status(500).json({ error: "Failed to fetch recordings" });
  }
});

// The patched /save route: accepts an uploaded file (saved to disk), converts to WAV on disk,
// transcribes from the WAV file, uploads the final WAV to UploadThing via server SDK (stream/formdata),
// and cleans up temporary files.
recordingsRouter.post("/save", upload.single("recording"), async (req, res) => {
  console.log("💾 [SAVE] Starting /save endpoint processing...");
  let uploadedFilePath;
  let convertedWavPath;
  let recordingRecord;

  try {
    if (!req.file) {
      console.log("💾 [SAVE] ❌ No recording file provided");
      return res.status(400).json({ error: "No recording file provided" });
    }

    console.log("💾 [SAVE] File received:", {
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    });

    // Parse metadata
    let metadata = {};
    if (typeof req.body.metadata === "string") {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch (e) {
        metadata = {};
      }
    } else {
      metadata = req.body.metadata || {};
    }

    const meetingId = metadata.meetingId || null;
    const meetingPlatform = metadata.meetingPlatform || null;
    console.log("💾 [SAVE] Metadata parsed:", { meetingId, meetingPlatform });

    // Auth
    console.log("💾 [SAVE] Checking user authentication...");
    const userSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!userSession) {
      console.log("💾 [SAVE] ❌ User not authenticated");
      return res.status(403).json({ message: "User not logged in" });
    }
    console.log("💾 [SAVE] ✅ User authenticated:", userSession.user.id);

    uploadedFilePath = req.file.path; // disk path

    // Convert to WAV on disk (if already WAV, convertToWavOnDisk will still run but ffmpeg will quickly copy)
    console.log("💾 [SAVE] Starting audio conversion to WAV...");
    convertedWavPath = await convertToWavOnDisk(uploadedFilePath);
    console.log("💾 [SAVE] ✅ Audio conversion completed:", convertedWavPath);

    // Create DB recording entry before doing heavy work so we have an id to reference
    console.log("💾 [SAVE] Creating recording entry in database...");
    recordingRecord = await createRecording(
      null,
      userSession.user,
      meetingId,
      meetingPlatform
    );
    console.log(
      "💾 [SAVE] ✅ Recording entry created with ID:",
      recordingRecord.id
    );

    // Transcribe from the WAV file (this runs the heavy model in a separate process if whisper-node spawns it)
    console.log("💾 [SAVE] Starting transcription and summary generation...");
    const { transcriptText, summary } = await transcribeFromLocalPath(
      convertedWavPath,
      recordingRecord.id,
      true
    );
    console.log("💾 [SAVE] ✅ Transcription and summary completed");

    // Upload the WAV to UploadThing - prefer streaming via FormData if server SDK supports it.
    console.log("💾 [SAVE] Starting file upload to UploadThing...");
    let uploadResp;
    let operation;
    try {
      // Try FormData + utapi.uploadFiles(formData.getAll('files')) pattern
      console.log("💾 [SAVE] Attempting streamed upload to UploadThing...");
      const FormDataImpl =
        globalThis.FormData || (await import("form-data")).default;
      const form = new FormDataImpl();
      form.append("files", fs.createReadStream(convertedWavPath), {
        filename: path.basename(convertedWavPath),
        contentType: "audio/wav",
      });

      // Some UTApi versions expect the array of files (formData.getAll('files'))
      let filesForUpload;
      if (typeof form.getAll === "function") {
        filesForUpload = form.getAll("files");
      } else {
        // node-form-data doesn't implement getAll; instead many SDKs accept the form instance directly.
        filesForUpload = form;
      }

      uploadResp = await utapi.uploadFiles(filesForUpload);
      console.log("💾 [SAVE] ✅ Streamed upload successful");
      // operation = await googleSttTranscribe(
      //   uploadResp[0].data.ufsUrl,
      //   recordingRecord.id
      // );
    } catch (err) {
      console.warn(
        "💾 [SAVE] ⚠️ Streamed upload failed, falling back to buffered upload:",
        err?.message || err
      );

      // Fallback: read file into buffer and use UTFile helper. This WILL buffer file into memory but is safe for small files.
      const fileBuffer = fs.readFileSync(convertedWavPath);
      // UTFile accepts BlobPart[] (Buffer is acceptable in most environments)
      const utFile = new UTFile([fileBuffer], path.basename(convertedWavPath), {
        type: "audio/wav",
        customId: recordingRecord.id,
      });
      uploadResp = await utapi.uploadFiles([utFile]);
      console.log("💾 [SAVE] ✅ Buffered upload successful");
      // operation = await googleSttTranscribe(
      //   uploadResp[0].data.ufsUrl,
      //   recordingRecord.id
      // );
    }

    // uploadResp should be an array with metadata including ufsUrl
    const fileUrl =
      Array.isArray(uploadResp) &&
      uploadResp[0] &&
      uploadResp[0].data &&
      uploadResp[0].data.ufsUrl
        ? uploadResp[0].data.ufsUrl
        : (uploadResp && uploadResp[0] && uploadResp[0].url) || null;

    console.log("💾 [SAVE] File URL received:", fileUrl);

    // Update the recording entry with fileUrl if needed
    if (fileUrl) {
      console.log("💾 [SAVE] Updating recording with file URL...");
      await prisma.recording.update({
        where: { id: recordingRecord.id },
        data: { recordingUrl: fileUrl },
      });
      console.log("💾 [SAVE] ✅ Recording updated with file URL");
    }

    // Cleanup local temp files
    console.log("💾 [SAVE] Starting cleanup of temporary files...");
    try {
      if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
      console.log("💾 [SAVE] ✅ Cleaned up uploaded file");
    } catch (e) {
      console.error("💾 [SAVE] ❌ Cleanup uploadedFilePath error:", e);
    }
    try {
      if (fs.existsSync(convertedWavPath)) fs.unlinkSync(convertedWavPath);
      console.log("💾 [SAVE] ✅ Cleaned up converted WAV file");
    } catch (e) {
      console.error("💾 [SAVE] ❌ Cleanup convertedWavPath error:", e);
    }

    console.log("💾 [SAVE] ✅ All processing completed successfully");
    return res.status(201).json({
      message: "Recording uploaded, converted and transcribed",
      fileUrl,
      transcript: transcriptText,
      summary,
      // googleOperationName: operation.name,
      recordingId: recordingRecord.id,
    });
  } catch (error) {
    console.error("💾 [SAVE] ❌ Save endpoint error:", error);
    console.error("💾 [SAVE] ❌ Error stack:", error.stack);

    // Attempt cleanup on error
    console.log("💾 [SAVE] Starting error cleanup...");
    try {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
        console.log("💾 [SAVE] ✅ Cleaned up uploaded file after error");
      }
    } catch (e) {
      console.error("💾 [SAVE] ❌ Error cleanup uploadedFilePath failed:", e);
    }
    try {
      if (convertedWavPath && fs.existsSync(convertedWavPath)) {
        fs.unlinkSync(convertedWavPath);
        console.log("💾 [SAVE] ✅ Cleaned up converted WAV file after error");
      }
    } catch (e) {
      console.error("💾 [SAVE] ❌ Error cleanup convertedWavPath failed:", e);
    }

    return res.status(500).json({
      error: "Failed to upload recording",
      details: error?.message || String(error),
    });
  }
});

recordingsRouter.get("/transcribe/:recordingId", async (req, res) => {
  let downloadedFilePath;
  let convertedWavPath;

  try {
    const { recordingId } = req.params;
    const userSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!userSession)
      return res.status(401).json({ message: "User not logged in" });

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
    });
    if (!recording)
      return res.status(404).json({ message: "Recording not found" });
    if (recording.userId !== userSession.user.id)
      return res.status(403).json({ message: "Access denied" });

    if (recording.transcript)
      return res.status(200).json({ transcripts: recording.transcript });

    // If no transcript saved, attempt to transcribe from the stored file
    if (!recording.recordingUrl) {
      return res
        .status(400)
        .json({ message: "No recording file available for transcription" });
    }

    // Download the file from UploadThing to a temporary location
    const response = await fetch(recording.recordingUrl);
    if (!response.ok) {
      throw new Error(`Failed to download recording: ${response.statusText}`);
    }

    // Save downloaded file to temp directory
    const fileExtension = path.extname(recording.recordingUrl) || ".wav";
    const tempFileName = `download-${Date.now()}-${Math.floor(
      Math.random() * 1e6
    )}${fileExtension}`;
    downloadedFilePath = path.join(tmpDir, tempFileName);

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(downloadedFilePath, Buffer.from(buffer));

    // Convert to WAV format for transcription
    convertedWavPath = await convertToWavOnDisk(downloadedFilePath);

    // Transcribe the WAV file and save to database
    // const { transcriptText, summary } = await transcribeFromLocalPath(
    //   convertedWavPath,
    //   recordingId,
    //   true
    // );

    const operation = await googleSttTranscribe(
      uploadResp[0].data.ufsUrl,
      recording.recordingUrl
    );

    // Cleanup temporary files
    try {
      if (fs.existsSync(downloadedFilePath)) fs.unlinkSync(downloadedFilePath);
    } catch (e) {
      console.error("cleanup downloadedFilePath", e);
    }
    try {
      if (fs.existsSync(convertedWavPath)) fs.unlinkSync(convertedWavPath);
    } catch (e) {
      console.error("cleanup convertedWavPath", e);
    }

    return res.status(200).json({
      transcripts: transcriptText,
      // googleOperationName: operation.name,
      summary,
      message: "Recording transcription via google initialized successfully",
    });
  } catch (err) {
    console.error("Transcription error:", err);

    // Cleanup on error
    try {
      if (downloadedFilePath && fs.existsSync(downloadedFilePath))
        fs.unlinkSync(downloadedFilePath);
    } catch (e) {}
    try {
      if (convertedWavPath && fs.existsSync(convertedWavPath))
        fs.unlinkSync(convertedWavPath);
    } catch (e) {}

    return res.status(500).json({
      error: "Failed to transcribe recording",
      details: err?.message || String(err),
    });
  }
});

recordingsRouter.get("/summary/:recordingId", async (req, res) => {
  try {
    const { recordingId } = req.params;
    const userSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!userSession)
      return res.status(401).json({ message: "User not logged in" });

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
    });
    if (!recording)
      return res.status(404).json({ message: "Recording not found" });
    if (recording.userId !== userSession.user.id)
      return res.status(403).json({ message: "Access denied" });

    if (recording.summary)
      return res.status(200).json({ summary: recording.summary });
    if (!recording.transcript)
      return res
        .status(400)
        .json({ message: "No transcript available to generate summary" });

    // Generate summary from existing transcript
    const summary = await generateSummary(recording.transcript);

    // Save summary to DB
    await prisma.recording.update({
      where: { id: recordingId },
      data: { summary },
    });

    return res
      .status(200)
      .json({ summary, message: "Summary generated successfully" });
  } catch (err) {
    console.error("Summary generation error:", err);
    return res.status(500).json({
      error: "Failed to generate summary",
      details: err?.message || String(err),
    });
  }
});

recordingsRouter.get("/:recordingId", async (req, res) => {
  try {
    const { recordingId } = req.params;
    const userSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!userSession)
      return res.status(401).json({ message: "User not logged in" });

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
    });
    if (!recording)
      return res.status(404).json({ message: "Recording not found" });
    if (recording.userId !== userSession.user.id)
      return res.status(403).json({ message: "Access denied" });

    return res.status(200).json({ recording });
  } catch (error) {
    console.error("Fetch recording error:", error);
    return res.status(500).json({ error: "Failed to fetch recording" });
  }
});

// api to get google STT operation status by operation name

recordingsRouter.get("/google-stt-status/:operationName", async (req, res) => {
  try {
    const { operationName } = req.params;
    const userSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!userSession)
      return res.status(401).json({ message: "User not logged in" });

    if (!operationName)
      return res.status(400).json({ message: "Operation name is required" });

    const googleApiKey = process.env.GEMINI_API_KEY;
    if (!googleApiKey)
      return res.status(500).json({ message: "Google API key not configured" });

    const googleResponse = await fetch(
      `https://speech.googleapis.com/v1/operations/${operationName}`,
      {
        headers: {
          Authorization: `Bearer ${googleApiKey}`,
        },
      }
    );

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error(
        "Google STT status fetch error:",
        googleResponse.status,
        errorText
      );
      return res.status(500).json({
        message: "Failed to fetch operation status from Google",
        details: errorText,
      });
    }

    const statusData = await googleResponse.json();
    return res.status(200).json({ status: statusData });
  } catch (error) {
    console.error("Google STT status endpoint error:", error);
    return res.status(500).json({
      error: "Failed to fetch Google STT operation status",
      details: error?.message || String(error),
    });
  }
});

export default recordingsRouter;
