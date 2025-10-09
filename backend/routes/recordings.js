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
import { convertToWavOnDisk, transcribeFromAssemblyAI, googleSttTranscribe } from "../helpers/transcriptionHelpers.ts";
// import { transcribeFromLocalPath, convertToWavOnDisk, transcribeFromAssemblyAI, googleSttTranscribe } from "../helpers/transcriptionHelpers.ts";
import { generateSummary } from "../helpers/transcriptionHelpers.ts";

import { fromNodeHeaders } from "better-auth/node";

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

const recordingsRouter = express.Router();

/*
 * RECORDINGS API ENDPOINTS
 * 
 * This file provides three separate endpoints for audio transcription using different services:
 * 
 * 1. POST /recordings/save/whisper
 *    - Uses Whisper-node for local transcription
 *    - Processes file locally and returns immediate results
 *    - Returns: transcript, summary, fileUrl, recordingId
 * 
 * 2. POST /recordings/save/google-stt  
 *    - Uses Google Speech-to-Text API for cloud transcription
 *    - Initiates async transcription operation
 *    - Returns: googleOperationName (use with /google-stt-status endpoint)
 * 
 * 3. POST /recordings/save/assembly-ai
 *    - Uses AssemblyAI for cloud transcription  
 *    - Initiates async transcription operation
 *    - Returns: assemblyTranscriptId (use with /assembly-ai-status endpoint)
 * 
 * Status check endpoints:
 * - GET /recordings/google-stt-status/:operationName
 * - GET /recordings/assembly-ai-status/:transcriptId
 */

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

// Common helper function for file upload and basic processing
async function processUploadedFile(req, res) {
  if (!req.file) {
    return { error: "No recording file provided", status: 400 };
  }

  console.log("💾 File received:", {
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
  console.log("💾 Metadata parsed:", { meetingId, meetingPlatform });

  // Auth
  console.log("💾 Checking user authentication...");
  const userSession = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!userSession) {
    return { error: "User not logged in", status: 403 };
  }
  console.log("💾 ✅ User authenticated:", userSession.user.id);

  return {
    userSession,
    meetingId,
    meetingPlatform,
    uploadedFilePath: req.file.path
  };
}

// Common helper function for file upload to UploadThing
async function uploadToUploadThing(convertedWavPath) {
  console.log("💾 Starting file upload to UploadThing...");
  let uploadResp;
  
  try {
    // Try FormData + utapi.uploadFiles(formData.getAll('files')) pattern
    console.log("💾 Attempting streamed upload to UploadThing...");
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
    console.log("💾 ✅ Streamed upload successful");
  } catch (err) {
    console.warn(
      "💾 ⚠️ Streamed upload failed, falling back to buffered upload:",
      err?.message || err
    );

    // Fallback: read file into buffer and use UTFile helper
    const fileBuffer = fs.readFileSync(convertedWavPath);
    const utFile = new UTFile([fileBuffer], path.basename(convertedWavPath), {
      type: "audio/wav",
    });
    uploadResp = await utapi.uploadFiles([utFile]);
    console.log("💾 ✅ Buffered upload successful");
  }

  // Extract file URL
  const fileUrl =
    Array.isArray(uploadResp) &&
    uploadResp[0] &&
    uploadResp[0].data &&
    uploadResp[0].data.ufsUrl
      ? uploadResp[0].data.ufsUrl
      : (uploadResp && uploadResp[0] && uploadResp[0].url) || null;

  console.log("💾 File URL received:", fileUrl);
  return fileUrl;
}

// Common cleanup function
function cleanupFiles(uploadedFilePath, convertedWavPath) {
  console.log("💾 Starting cleanup of temporary files...");
  try {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
      console.log("💾 ✅ Cleaned up uploaded file");
    }
  } catch (e) {
    console.error("💾 ❌ Cleanup uploadedFilePath error:", e);
  }
  try {
    if (convertedWavPath && fs.existsSync(convertedWavPath)) {
      fs.unlinkSync(convertedWavPath);
      console.log("💾 ✅ Cleaned up converted WAV file");
    }
  } catch (e) {
    console.error("💾 ❌ Cleanup convertedWavPath error:", e);
  }
}

// Endpoint for Whisper-node transcription
// recordingsRouter.post("/save/whisper", upload.single("recording"), async (req, res) => {
//   console.log("🎵 [WHISPER] Starting /save/whisper endpoint processing...");
//   let uploadedFilePath;
//   let convertedWavPath;
//   let recordingRecord;

//   try {
//     // Process uploaded file and auth
//     const processResult = await processUploadedFile(req, res);
//     if (processResult.error) {
//       return res.status(processResult.status).json({ error: processResult.error });
//     }

//     const { userSession, meetingId, meetingPlatform, uploadedFilePath: filePath } = processResult;
//     uploadedFilePath = filePath;

//     // Convert to WAV on disk
//     console.log("🎵 [WHISPER] Starting audio conversion to WAV...");
//     convertedWavPath = await convertToWavOnDisk(uploadedFilePath);
//     console.log("🎵 [WHISPER] ✅ Audio conversion completed:", convertedWavPath);

//     // Create DB recording entry
//     console.log("🎵 [WHISPER] Creating recording entry in database...");
//     recordingRecord = await createRecording(
//       null,
//       userSession.user,
//       meetingId,
//       meetingPlatform
//     );
//     console.log("🎵 [WHISPER] ✅ Recording entry created with ID:", recordingRecord.id);

//     // Transcribe using Whisper-node (local processing)
//     console.log("🎵 [WHISPER] Starting transcription and summary generation...");
//     const { transcriptText, summary } = await transcribeFromLocalPath(
//       convertedWavPath,
//       recordingRecord.id,
//       true
//     );
//     console.log("🎵 [WHISPER] ✅ Transcription and summary completed");

//     // Upload the WAV to UploadThing
//     const fileUrl = await uploadToUploadThing(convertedWavPath);

//     // Update the recording entry with fileUrl
//     if (fileUrl) {
//       console.log("🎵 [WHISPER] Updating recording with file URL...");
//       await prisma.recording.update({
//         where: { id: recordingRecord.id },
//         data: { recordingUrl: fileUrl },
//       });
//       console.log("🎵 [WHISPER] ✅ Recording updated with file URL");
//     }

//     // Cleanup local temp files
//     cleanupFiles(uploadedFilePath, convertedWavPath);

//     console.log("🎵 [WHISPER] ✅ All processing completed successfully");
//     return res.status(201).json({
//       message: "Recording uploaded, converted and transcribed with Whisper",
//       fileUrl,
//       transcript: transcriptText,
//       summary,
//       recordingId: recordingRecord.id,
//       transcriptionService: "whisper"
//     });
//   } catch (error) {
//     console.error("🎵 [WHISPER] ❌ Save endpoint error:", error);
//     cleanupFiles(uploadedFilePath, convertedWavPath);
//     return res.status(500).json({
//       error: "Failed to upload recording with Whisper",
//       details: error?.message || String(error),
//     });
//   }
// });

// Endpoint for Google STT transcription
recordingsRouter.post("/save/google-stt", upload.single("recording"), async (req, res) => {
  console.log("🟢 [GOOGLE-STT] Starting /save/google-stt endpoint processing...");
  let uploadedFilePath;
  let convertedWavPath;
  let recordingRecord;

  try {
    // Process uploaded file and auth
    const processResult = await processUploadedFile(req, res);
    if (processResult.error) {
      return res.status(processResult.status).json({ error: processResult.error });
    }

    const { userSession, meetingId, meetingPlatform, uploadedFilePath: filePath } = processResult;
    uploadedFilePath = filePath;

    // Convert to WAV on disk
    console.log("🟢 [GOOGLE-STT] Starting audio conversion to WAV...");
    convertedWavPath = await convertToWavOnDisk(uploadedFilePath);
    console.log("🟢 [GOOGLE-STT] ✅ Audio conversion completed:", convertedWavPath);

    // Upload the WAV to UploadThing first (needed for Google STT)
    const fileUrl = await uploadToUploadThing(convertedWavPath);
    if (!fileUrl) {
      throw new Error("Failed to upload file to UploadThing");
    }

    // Create DB recording entry
    console.log("🟢 [GOOGLE-STT] Creating recording entry in database...");
    recordingRecord = await createRecording(
      null,
      userSession.user,
      meetingId,
      meetingPlatform
    );
    console.log("🟢 [GOOGLE-STT] ✅ Recording entry created with ID:", recordingRecord.id);

    // Update recording with file URL
    await prisma.recording.update({
      where: { id: recordingRecord.id },
      data: { recordingUrl: fileUrl },
    });

    // Start Google STT transcription (async operation)
    console.log("🟢 [GOOGLE-STT] Starting Google STT transcription...");
    const operation = await googleSttTranscribe(
      fileUrl,
      recordingRecord.id,
      true
    );
    console.log("🟢 [GOOGLE-STT] ✅ Google STT operation started:", operation.name);

    // Cleanup local temp files
    cleanupFiles(uploadedFilePath, convertedWavPath);

    console.log("🟢 [GOOGLE-STT] ✅ All processing completed successfully");
    return res.status(201).json({
      message: "Recording uploaded and Google STT transcription initiated",
      fileUrl,
      googleOperationName: operation.name,
      recordingId: recordingRecord.id,
      transcriptionService: "google-stt",
      note: "Transcription is processing. Use /google-stt-status endpoint to check progress."
    });
  } catch (error) {
    console.error("🟢 [GOOGLE-STT] ❌ Save endpoint error:", error);
    cleanupFiles(uploadedFilePath, convertedWavPath);
    return res.status(500).json({
      error: "Failed to upload recording with Google STT",
      details: error?.message || String(error),
    });
  }
});

// Endpoint for AssemblyAI transcription
recordingsRouter.post("/save/assembly-ai", upload.single("recording"), async (req, res) => {
  console.log("🔵 [ASSEMBLY-AI] Starting /save/assembly-ai endpoint processing...");
  let uploadedFilePath;
  let convertedWavPath;
  let recordingRecord;

  try {
    // Process uploaded file and auth
    const processResult = await processUploadedFile(req, res);
    if (processResult.error) {
      return res.status(processResult.status).json({ error: processResult.error });
    }

    const { userSession, meetingId, meetingPlatform, uploadedFilePath: filePath } = processResult;
    uploadedFilePath = filePath;

    // Convert to WAV on disk
    console.log("🔵 [ASSEMBLY-AI] Starting audio conversion to WAV...");
    convertedWavPath = await convertToWavOnDisk(uploadedFilePath);
    console.log("🔵 [ASSEMBLY-AI] ✅ Audio conversion completed:", convertedWavPath);

    // Upload the WAV to UploadThing first (needed for AssemblyAI)
    const fileUrl = await uploadToUploadThing(convertedWavPath);
    if (!fileUrl) {
      throw new Error("Failed to upload file to UploadThing");
    }

    // Create DB recording entry
    console.log("🔵 [ASSEMBLY-AI] Creating recording entry in database...");
    recordingRecord = await createRecording(
      null,
      userSession.user,
      meetingId,
      meetingPlatform
    );
    console.log("🔵 [ASSEMBLY-AI] ✅ Recording entry created with ID:", recordingRecord.id);

    // Update recording with file URL
    await prisma.recording.update({
      where: { id: recordingRecord.id },
      data: { recordingUrl: fileUrl },
    });

    // Start AssemblyAI transcription (async operation)
    console.log("🔵 [ASSEMBLY-AI] Starting AssemblyAI transcription...");
    const transcript = await transcribeFromAssemblyAI(
      fileUrl,
      recordingRecord.id,
      true
    );
    console.log("🔵 [ASSEMBLY-AI] ✅ AssemblyAI transcription started:", transcript.id);

    // Cleanup local temp files
    cleanupFiles(uploadedFilePath, convertedWavPath);

    console.log("🔵 [ASSEMBLY-AI] ✅ All processing completed successfully");
    return res.status(201).json({
      message: "Recording uploaded and AssemblyAI transcription initiated",
      fileUrl,
      assemblyTranscriptId: transcript.id,
      recordingId: recordingRecord.id,
      transcriptionService: "assembly-ai",
      note: "Transcription is processing. Use AssemblyAI API to check progress."
    });
  } catch (error) {
    console.error("🔵 [ASSEMBLY-AI] ❌ Save endpoint error:", error);
    cleanupFiles(uploadedFilePath, convertedWavPath);
    return res.status(500).json({
      error: "Failed to upload recording with AssemblyAI",
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
      recording.recordingUrl,
      recordingId
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
      googleOperationName: operation.name,
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

// api to get AssemblyAI transcript status by transcript id
recordingsRouter.get("/assembly-ai-status/:transcriptId", async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const userSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!userSession)
      return res.status(401).json({ message: "User not logged in" });

    if (!transcriptId)
      return res.status(400).json({ message: "Transcript ID is required" });

    const assemblyApiKey = process.env.ASSEMBLY_AI_API_KEY;
    if (!assemblyApiKey)
      return res.status(500).json({ message: "AssemblyAI API key not configured" });

    const assemblyResponse = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: {
          Authorization: assemblyApiKey,
        },
      }
    );

    if (!assemblyResponse.ok) {
      const errorText = await assemblyResponse.text();
      console.error(
        "AssemblyAI status fetch error:",
        assemblyResponse.status,
        errorText
      );
      return res.status(500).json({
        message: "Failed to fetch transcript status from AssemblyAI",
        details: errorText,
      });
    }

    const statusData = await assemblyResponse.json();
    
    // If transcription is completed, optionally save to database
    if (statusData.status === 'completed' && statusData.text) {
      const summary = await generateSummary(statusData.text);
      
      // Find recording by assembly operation ID and update
      const recording = await prisma.recording.findFirst({
        where: { assemblyOperationId: transcriptId },
      });
      
      if (recording) {
        await prisma.recording.update({
          where: { id: recording.id },
          data: { 
            transcript: statusData.text,
            summary: summary
          },
        });
      }
    }
    
    return res.status(200).json({ status: statusData });
  } catch (error) {
    console.error("AssemblyAI status endpoint error:", error);
    return res.status(500).json({
      error: "Failed to fetch AssemblyAI transcript status",
      details: error?.message || String(error),
    });
  }
});

export default recordingsRouter;
