import express from "express";
import multer from "multer";
import path from "path";
import os from "os";
import fs from "fs";
import { Readable } from "node:stream";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { UTApi, UTFile } from "uploadthing/server"; // server SDK
import { auth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { createRecording } from "../contollers/recordings.controller.js";
import { convertToWavOnDisk, transcribeFromAssemblyAI, googleSttTranscribe } from "../helpers/transcriptionHelpers.js";
// import { transcribeFromLocalPath, convertToWavOnDisk, transcribeFromAssemblyAI, googleSttTranscribe } from "../helpers/transcriptionHelpers.js";
import { regenerateTranscript, regenerateSummary } from "../helpers/transcriptionHelpers.js";
import { processGoogleMeetRecording } from "../helpers/googleMeetHelpers.js";

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
      include: {
        participants: true,
        transcriptEntries: {
          orderBy: { startTime: "asc" },
        },
      },
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

    // Start AssemblyAI transcription (now waits for completion)
    console.log("🔵 [ASSEMBLY-AI] Starting AssemblyAI transcription...");
    const result = await transcribeFromAssemblyAI(
      fileUrl,
      recordingRecord.id,
      true
    );
    console.log("🔵 [ASSEMBLY-AI] ✅ AssemblyAI transcription completed");

    // Cleanup local temp files
    cleanupFiles(uploadedFilePath, convertedWavPath);

    console.log("🔵 [ASSEMBLY-AI] ✅ All processing completed successfully");
    return res.status(201).json({
      message: "Recording uploaded and transcribed with AssemblyAI",
      fileUrl,
      transcript: result.transcriptText,
      summary: result.summary,
      recordingId: recordingRecord.id,
      transcriptionService: "assembly-ai"
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
      include: {
        participants: true,
        transcriptEntries: {
          orderBy: { startTime: "asc" },
        },
      },
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

// Fetch Google Meet participants and transcript entries for existing recording
recordingsRouter.post("/fetch-google-meet-data/:recordingId", async (req, res) => {
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

    if (recording.meetingPlatform !== "google-meet") {
      return res.status(400).json({ 
        error: "Recording is not from Google Meet" 
      });
    }

    if (!recording.meetingId) {
      return res.status(400).json({ 
        error: "No meeting ID available for this recording" 
      });
    }

    console.log(`🟢 [API] Fetching Google Meet data for recording: ${recordingId}`);
    console.log(`🟢 [API] Meeting ID: ${recording.meetingId}`);
    console.log(`🟢 [API] User ID: ${userSession.user.id}`);
    
    // Check if we already have participant data
    const existingParticipants = await prisma.participant.findMany({
      where: { recordingId },
    });

    if (existingParticipants.length > 0) {
      const existingTranscriptEntries = await prisma.transcriptEntry.findMany({
        where: { recordingId },
        orderBy: { startTime: "asc" },
      });

      return res.status(200).json({
        message: "Google Meet data already exists",
        participants: existingParticipants,
        transcriptEntries: existingTranscriptEntries,
        alreadyExists: true,
      });
    }

    // Process Google Meet data
    const googleMeetData = await processGoogleMeetRecording(
      recordingId,
      recording.meetingId,
      userSession.user.id
    );

    if (!googleMeetData) {
      return res.status(200).json({
        error: "Could not access Google Meet data for this meeting",
        message: "Google Meet data not available",
        details: `No Google Meet data found for meeting code: ${recording.meetingId}. This could happen if:
        • The meeting didn't have transcription enabled (most common reason)
        • The meeting is too old (Google Meet data has limited retention)
        • The meeting ID is incorrect or the meeting hasn't ended yet
        • You don't have access to the meeting
        • You need to re-authenticate with Google Meet permissions`,
        meetingId: recording.meetingId,
        suggestion: "💡 To get participant names and speech data in future meetings, enable transcription when starting your Google Meet sessions.",
        participants: [],
        transcriptEntries: [],
        hasTranscriptEntries: false,
        hasParticipants: false,
        isGoogleMeetError: true
      });
    }

    // Handle case where we found space but no participants/transcripts
    if (googleMeetData.participants.length === 0 && googleMeetData.transcriptEntries.length === 0) {
      return res.status(200).json({
        message: "Google Meet space found but no participant/transcript data available",
        details: "The meeting space was located but transcription was likely not enabled during the meeting. To get participant names and speech data, enable transcription in future Google Meet sessions.",
        participants: [],
        transcriptEntries: [],
        alreadyExists: false,
        hasTranscriptEntries: false,
        hasParticipants: false,
        spaceFound: true
      });
    }

    // Update recording transcript if we got a better one from Google Meet
    if (googleMeetData.fullTranscript && !recording.transcript) {
      await prisma.recording.update({
        where: { id: recordingId },
        data: { transcript: googleMeetData.fullTranscript },
      });
    }

    // Fetch the saved data
    const participants = await prisma.participant.findMany({
      where: { recordingId },
    });

    const transcriptEntries = await prisma.transcriptEntry.findMany({
      where: { recordingId },
      orderBy: { startTime: "asc" },
    });

    // Provide helpful feedback about what data was retrieved
    let message = "Google Meet data fetched successfully";
    let details = null;
    
    if (participants.length > 0 && transcriptEntries.length > 0) {
      details = `Found ${participants.length} participants and ${transcriptEntries.length} transcript entries with speaker attribution`;
    } else if (participants.length > 0 && transcriptEntries.length === 0) {
      message = "Google Meet participants fetched successfully";
      details = `Found ${participants.length} participants, but no transcript entries (transcription may not have been enabled during the meeting)`;
    } else if (participants.length === 0) {
      details = "No participants or transcript data found for this meeting";
    }

    return res.status(200).json({
      message,
      details,
      participants,
      transcriptEntries,
      alreadyExists: false,
      hasTranscriptEntries: transcriptEntries.length > 0,
      hasParticipants: participants.length > 0,
    });
  } catch (error) {
    console.error("Fetch Google Meet data error:", error);
    return res.status(500).json({
      error: "Failed to fetch Google Meet data",
      details: error?.message || String(error),
    });
  }
});

// Debug endpoint to list available Google Meet conferences
recordingsRouter.get("/debug/google-meet-conferences", async (req, res) => {
  try {
    const userSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!userSession)
      return res.status(401).json({ message: "User not logged in" });

    const { getGoogleAccessToken } = await import("../helpers/googleMeetHelpers.js");
    
    // Get user's Google access token
    const account = await prisma.account.findFirst({
      where: {
        userId: userSession.user.id,
        providerId: "google",
      },
    });

    if (!account?.accessToken) {
      return res.status(400).json({ error: "No Google access token found" });
    }

    // List conference records
    const listResponse = await fetch(
      "https://meet.googleapis.com/v2/conferenceRecords",
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
        },
      }
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      return res.status(listResponse.status).json({ 
        error: "Failed to fetch conference records",
        details: errorText 
      });
    }

    const listData = await listResponse.json();
    
    return res.status(200).json({
      message: "Available Google Meet conferences",
      conferences: listData.conferenceRecords || [],
      totalCount: listData.conferenceRecords?.length || 0
    });
  } catch (error) {
    console.error("Debug Google Meet conferences error:", error);
    return res.status(500).json({
      error: "Failed to fetch Google Meet conferences",
      details: error?.message || String(error),
    });
  }
});

// Debug endpoint - Get Google Meet space details
recordingsRouter.get("/debug/google-meet-space/:meetingCode", async (req, res) => {
  try {
    const userSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!userSession)
      return res.status(401).json({ message: "User not logged in" });

    const { meetingCode } = req.params;
    
    console.log(`🟢 [API] Debug: Getting space details for meeting code: ${meetingCode}`);
    
    const { getGoogleMeetSpaceDetails } = await import("../helpers/googleMeetHelpers.js");
    const spaceDetails = await getGoogleMeetSpaceDetails(meetingCode, userSession.user.id);
    
    return res.status(200).json({
      meetingCode,
      spaceDetails,
      message: spaceDetails ? "Space details retrieved" : "Could not get space details"
    });

  } catch (error) {
    console.error("Error in debug space endpoint:", error);
    return res.status(500).json({ 
      error: "Failed to get space details",
      details: error?.message || String(error)
    });
  }
});

// Regenerate transcript endpoint
recordingsRouter.post("/regenerate-transcript/:recordingId", async (req, res) => {
  try {
    const { recordingId } = req.params;
    const userSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!userSession)
      return res.status(401).json({ message: "User not logged in" });

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        participants: true,
        transcriptEntries: true,
      },
    });
    if (!recording)
      return res.status(404).json({ message: "Recording not found" });
    if (recording.userId !== userSession.user.id)
      return res.status(403).json({ message: "Access denied" });

    console.log(`🔄 [API] Starting transcript regeneration for recording: ${recordingId}`);
    
    // If this is a Google Meet recording, try to fetch participant data first
    if (recording.meetingPlatform === "google-meet" && 
        recording.meetingId && 
        recording.participants.length === 0) {
      
      console.log(`🔄 [API] Fetching Google Meet data for Google Meet recording`);
      
      try {
        const googleMeetData = await processGoogleMeetRecording(
          recordingId,
          recording.meetingId,
          userSession.user.id
        );

        if (googleMeetData && googleMeetData.fullTranscript) {
          // Update with Google Meet transcript
          await prisma.recording.update({
            where: { id: recordingId },
            data: { transcript: googleMeetData.fullTranscript },
          });

          return res.status(200).json({
            message: "Transcript regenerated using Google Meet data",
            transcript: googleMeetData.fullTranscript,
            hasParticipantData: true,
          });
        }
      } catch (googleMeetError) {
        console.warn(`🔄 [API] Could not fetch Google Meet data, falling back to regular regeneration:`, googleMeetError);
      }
    }
    
    // Fall back to regular transcript regeneration
    const result = await regenerateTranscript(recordingId);

    return res.status(200).json({
      message: "Transcript regenerated successfully",
      transcript: result.transcriptText,
      hasParticipantData: recording.participants.length > 0,
    });
  } catch (error) {
    console.error("Regenerate transcript error:", error);
    return res.status(500).json({
      error: "Failed to regenerate transcript",
      details: error?.message || String(error),
    });
  }
});

// Regenerate summary endpoint
recordingsRouter.post("/regenerate-summary/:recordingId", async (req, res) => {
  try {
    const { recordingId } = req.params;
    const userSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!userSession)
      return res.status(401).json({ message: "User not logged in" });

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        participants: true,
        transcriptEntries: true,
      },
    });
    if (!recording)
      return res.status(404).json({ message: "Recording not found" });
    if (recording.userId !== userSession.user.id)
      return res.status(403).json({ message: "Access denied" });

    console.log(`🔄 [API] Starting summary regeneration for recording: ${recordingId}`);
    
    // If this is a Google Meet recording, try to fetch participant data first
    if (recording.meetingPlatform === "google-meet" && 
        recording.meetingId && 
        recording.participants.length === 0) {
      
      console.log(`🔄 [API] Fetching Google Meet data for Google Meet recording`);
      
      try {
        const googleMeetData = await processGoogleMeetRecording(
          recordingId,
          recording.meetingId,
          userSession.user.id
        );

        if (googleMeetData && googleMeetData.fullTranscript) {
          // Update with Google Meet transcript
          await prisma.recording.update({
            where: { id: recordingId },
            data: { transcript: googleMeetData.fullTranscript },
          });
        }
      } catch (googleMeetError) {
        console.warn(`🔄 [API] Could not fetch Google Meet data, proceeding with existing transcript:`, googleMeetError);
      }
    }
    
    const summary = await regenerateSummary(recordingId);

    return res.status(200).json({
      message: "Summary regenerated successfully",
      summary,
      hasParticipantData: recording.participants.length > 0,
    });
  } catch (error) {
    console.error("Regenerate summary error:", error);
    return res.status(500).json({
      error: "Failed to regenerate summary",
      details: error?.message || String(error),
    });
  }
});

// Delete recording endpoint
recordingsRouter.delete("/:recordingId", async (req, res) => {
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

    console.log(`🗑️ [DELETE] Starting deletion process for recording: ${recordingId}`);

    // Delete associated data in the correct order to respect foreign key constraints
    
    // 1. Delete transcript entries
    await prisma.transcriptEntry.deleteMany({
      where: { recordingId },
    });
    console.log(`🗑️ [DELETE] Deleted transcript entries for recording: ${recordingId}`);

    // 2. Delete participants
    await prisma.participant.deleteMany({
      where: { recordingId },
    });
    console.log(`🗑️ [DELETE] Deleted participants for recording: ${recordingId}`);

    // 3. Delete the recording itself
    await prisma.recording.delete({
      where: { id: recordingId },
    });
    console.log(`🗑️ [DELETE] ✅ Successfully deleted recording: ${recordingId}`);

    return res.status(200).json({
      message: "Recording and all associated data deleted successfully",
    });
  } catch (error) {
    console.error("Delete recording error:", error);
    return res.status(500).json({
      error: "Failed to delete recording",
      details: error?.message || String(error),
    });
  }
});

export default recordingsRouter;
