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
import { whisper } from "whisper-node";

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

// Transcribe a local WAV file path using whisper-node and optionally save to DB
async function transcribeFromLocalPath(wavPath, recordingId, saveToDb = true) {
  if (!fs.existsSync(wavPath))
    throw new Error("WAV file not found: " + wavPath);

  // whisper-node in your repo was previously called with a path
  const result = await whisper(wavPath, { modelName: "base" });

  if (!result) throw new Error("Transcription returned no result");

  let transcriptText;
  if (Array.isArray(result) && result.length > 0) {
    transcriptText = result
      .map((s) => s.speech || s.text || "")
      .join(" ")
      .trim();
  } else if (typeof result === "string") {
    transcriptText = result;
  } else if (result.speech) {
    transcriptText = result.speech;
  } else if (result.text) {
    transcriptText = result.text;
  } else {
    throw new Error(
      "Unexpected transcription result format: " + JSON.stringify(result)
    );
  }

  if (saveToDb && recordingId) {
    await prisma.recording.update({
      where: { id: recordingId },
      data: { transcript: transcriptText },
    });
  }

  return transcriptText;
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

// The patched /save route: accepts an uploaded file (saved to disk), converts to WAV on disk,
// transcribes from the WAV file, uploads the final WAV to UploadThing via server SDK (stream/formdata),
// and cleans up temporary files.
recordingsRouter.post("/save", upload.single("recording"), async (req, res) => {
  let uploadedFilePath;
  let convertedWavPath;
  let recordingRecord;

  try {
    if (!req.file)
      return res.status(400).json({ error: "No recording file provided" });

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

    // Auth
    const userSession = await auth.api.getSession({ headers: req.headers });
    if (!userSession)
      return res.status(403).json({ message: "User not logged in" });

    uploadedFilePath = req.file.path; // disk path

    // Convert to WAV on disk (if already WAV, convertToWavOnDisk will still run but ffmpeg will quickly copy)
    convertedWavPath = await convertToWavOnDisk(uploadedFilePath);

    // Create DB recording entry before doing heavy work so we have an id to reference
    recordingRecord = await createRecording(
      null,
      userSession.user,
      meetingId,
      meetingPlatform
    );
    // createRecording should return the saved recording object including id. Adjust if your controller differs.

    // Transcribe from the WAV file (this runs the heavy model in a separate process if whisper-node spawns it)
    const transcriptText = await transcribeFromLocalPath(
      convertedWavPath,
      recordingRecord.id,
      true
    );

    // Upload the WAV to UploadThing - prefer streaming via FormData if server SDK supports it.
    // Approach A: use UTApi.uploadFiles with FormData containing a ReadStream (Node 18+ supports FormData)
    // Approach B (fallback): use UTFile + fs.readFileSync (may buffer file into memory)

    let uploadResp;
    try {
      // Try FormData + utapi.uploadFiles(formData.getAll('files')) pattern
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
    } catch (err) {
      console.warn(
        "Streamed upload to UTApi failed, falling back to buffered upload:",
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
    }

    // uploadResp should be an array with metadata including ufsUrl
    const fileUrl =
      Array.isArray(uploadResp) &&
      uploadResp[0] &&
      uploadResp[0].data &&
      uploadResp[0].data.ufsUrl
        ? uploadResp[0].data.ufsUrl
        : (uploadResp && uploadResp[0] && uploadResp[0].url) || null;

    // Update the recording entry with fileUrl if needed
    if (fileUrl) {
      await prisma.recording.update({
        where: { id: recordingRecord.id },
        data: { recordingUrl: fileUrl },
      });
    }

    // Cleanup local temp files
    try {
      if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
    } catch (e) {
      console.error("cleanup uploadedFilePath", e);
    }
    try {
      if (fs.existsSync(convertedWavPath)) fs.unlinkSync(convertedWavPath);
    } catch (e) {
      console.error("cleanup convertedWavPath", e);
    }

    return res
      .status(201)
      .json({
        message: "Recording uploaded, converted and transcribed",
        fileUrl,
        transcript: transcriptText,
        recordingId: recordingRecord.id,
      });
  } catch (error) {
    console.error("Save endpoint error:", error);

    // Attempt cleanup on error
    try {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath))
        fs.unlinkSync(uploadedFilePath);
    } catch (e) {}
    try {
      if (convertedWavPath && fs.existsSync(convertedWavPath))
        fs.unlinkSync(convertedWavPath);
    } catch (e) {}

    return res
      .status(500)
      .json({
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
    const userSession = await auth.api.getSession({ headers: req.headers });
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
      return res.status(400).json({ message: "No recording file available for transcription" });
    }

    // Download the file from UploadThing to a temporary location
    const response = await fetch(recording.recordingUrl);
    if (!response.ok) {
      throw new Error(`Failed to download recording: ${response.statusText}`);
    }

    // Save downloaded file to temp directory
    const fileExtension = path.extname(recording.recordingUrl) || '.wav';
    const tempFileName = `download-${Date.now()}-${Math.floor(Math.random() * 1e6)}${fileExtension}`;
    downloadedFilePath = path.join(tmpDir, tempFileName);
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(downloadedFilePath, Buffer.from(buffer));

    // Convert to WAV format for transcription
    convertedWavPath = await convertToWavOnDisk(downloadedFilePath);

    // Transcribe the WAV file and save to database
    const transcriptText = await transcribeFromLocalPath(
      convertedWavPath,
      recordingId,
      true
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
      message: "Recording transcribed successfully"
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
      details: err?.message || String(err)
    });
  }
});

export default recordingsRouter;
