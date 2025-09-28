import express from "express";
import multer from "multer";
import { UTApi } from "uploadthing/server";
import { auth } from "../lib/auth.ts";
import { prisma } from "../lib/prisma.ts";
import { createRecording } from "../contollers/recordings.controller.ts";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { Readable } from "node:stream";
import { whisper } from "whisper-node";

ffmpeg.setFfmpegPath(ffmpegStatic);

const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

// Helper function to transcribe audio from URL
const transcribeRecording = async (fileUrl, recordingId, saveToDb = true) => {
  console.log("Downloading audio file for transcription:", fileUrl);
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download audio file: ${response.statusText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const tempFileName = `temp_${recordingId}.wav`;
  const tempFilePath = `/tmp/${tempFileName}`;

  // Write to temporary file for whisper-node
  const fs = await import("fs");
  fs.writeFileSync(tempFilePath, Buffer.from(audioBuffer));

  try {
    // Transcribe the audio file
    const result = await whisper(tempFilePath, {
      modelName: "base",
    });

    console.log("Transcription completed:", result);
    console.log("Result type:", typeof result);
    console.log("Is array:", Array.isArray(result));

    // Handle undefined or null result
    if (!result) {
      throw new Error("Transcription returned no result - audio file may be invalid or too short");
    }

    // Extract text from result - whisper-node returns an array of objects with speech property
    let transcriptText;
    if (Array.isArray(result) && result.length > 0) {
      transcriptText = result.map(segment => segment.speech).join(' ');
    } else if (typeof result === 'string') {
      transcriptText = result;
    } else if (result.speech) {
      transcriptText = result.speech;
    } else {
      throw new Error(`Unexpected transcription result format: ${JSON.stringify(result)}`);
    }

    // Save transcript to database if requested
    if (saveToDb) {
      await prisma.recording.update({
        where: { id: recordingId },
        data: { transcript: transcriptText },
      });
      console.log("Transcript saved to database");
    }

    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    return transcriptText;
  } catch (transcriptionError) {
    // Clean up temporary file even if transcription fails
    try {
      fs.unlinkSync(tempFilePath);
    } catch (cleanupError) {
      console.error("Failed to clean up temp file:", cleanupError);
    }
    throw transcriptionError;
  }
};

const recordingsRouter = express.Router();

// Configure multer for handling multipart/form-data (file uploads)
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for processing
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("mimeType: ", file.mimetype);
    if (
      file.mimetype.startsWith("audio/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only audio and video files are allowed"), false);
    }
  },
});

// Initialize UploadThing API
const utapi = new UTApi({
  apiKey: process.env.UPLOADTHING_SECRET,
});

recordingsRouter.post("/save", upload.single("recording"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No recording file provided" });
    }

    console.log("data received: ", req.body.metadata);

    // Parse metadata if it's a string
    let metadata;
    if (typeof req.body.metadata === "string") {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch (e) {
        console.error("Failed to parse metadata:", e);
        metadata = {};
      }
    } else {
      metadata = req.body.metadata || {};
    }

    const meetingId = metadata.meetingId || null;
    const meetingPlatform = metadata.meetingPlatform || null;

    console.log("Received recording file:", req.file.originalname);
    console.log("File size:", req.file.size);
    console.log("File type:", req.file.mimetype);

    const userSession = await auth.api.getSession({ headers: req.headers });

    if (!userSession) {
      return res.status(403).json({
        message: "User not logged in",
      });
    }

    // Prepare file for upload; convert to WAV if not already WAV
    let fileBuffer = req.file.buffer;
    let fileName = req.file.originalname;
    let mimeType = req.file.mimetype;

    if (
      req.file.mimetype !== "audio/wav" &&
      req.file.mimetype !== "audio/x-wav"
    ) {
      console.log(`Converting ${req.file.mimetype} to WAV format...`);

      const input = bufferToStream(req.file.buffer);
      const wavBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        let resolved = false;

        let ffmpegCommand = ffmpeg(input)
          .audioCodec("pcm_s16le")
          .audioFrequency(16000)  // Set to 16kHz as required by whisper-node
          .audioChannels(1)       // Mono audio
          .format("wav");

        // Handle video files by removing video track
        if (req.file.mimetype.startsWith("video/")) {
          ffmpegCommand = ffmpegCommand.outputOptions("-vn");
        }

        const stream = ffmpegCommand
          .on("error", (err) => {
            if (!resolved) {
              resolved = true;
              console.error("FFmpeg conversion error:", err);
              reject(err);
            }
          })
          .on("end", () => {
            if (!resolved) {
              resolved = true;
              console.log("Conversion to WAV completed successfully");
              resolve(Buffer.concat(chunks));
            }
          })
          .pipe();

        stream.on("data", (chunk) => {
          chunks.push(chunk);
        });

        stream.on("end", () => {
          if (!resolved) {
            resolved = true;
            console.log("Conversion to WAV completed successfully");
            resolve(Buffer.concat(chunks));
          }
        });

        stream.on("error", (err) => {
          if (!resolved) {
            resolved = true;
            console.error("Stream error:", err);
            reject(err);
          }
        });
      });

      fileBuffer = wavBuffer;
      fileName = fileName.replace(/\.[^/.]+$/, "") + ".wav";
      mimeType = "audio/wav";

      console.log(
        `File converted to WAV. New size: ${fileBuffer.length} bytes`
      );
    } else {
      console.log("File is already in WAV format, no conversion needed");
    }

    // Upload to UploadThing
    const uploadResult = await utapi.uploadFiles([
      new File([fileBuffer], fileName, { type: mimeType }),
    ]);

    if (uploadResult[0].data) {
      const fileUrl = uploadResult[0].data.ufsUrl;
      console.log("File uploaded to UploadThing:", fileUrl);

      const recording = await createRecording(
        fileUrl,
        userSession.user,
        meetingId,
        meetingPlatform
      );

      if (typeof recording === "string" || recording instanceof String) {
        return res
          .status(500)
          .json({ error: "Failed to save recording to DB" });
      }

      console.log("Recording saved to DB:", recording);

      // Automatically transcribe the recording
      console.log("Starting transcription for uploaded recording...");
      try {
        await transcribeRecording(fileUrl, recording.id, true);
      } catch (transcriptionError) {
        console.error("Failed to transcribe recording:", transcriptionError);
        // Don't throw the error - we still want to return success for the upload
      }

      // Here you can save the recording info to your database
      const recordingData = {
        fileName: req.file.originalname,
        fileUrl: fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date(),
        userId: userSession.user.id,
        recordingId: recording.id,
        // Add user ID if you have authentication
      };

      return res.status(201).json({
        message: "Recording uploaded and transcription started successfully",
        fileUrl: fileUrl,
        data: recordingData,
      });
    } else {
      throw new Error("Upload failed");
    }
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: "Failed to upload recording",
      details: error.message,
    });
  }
});

recordingsRouter.get("/transcripts/:recordingId", async (req, res) => {
  const { recordingId } = req.params;
  const query = req.query;

  console.log("Fetching transcripts for recordingId:", recordingId);
  console.log("Query params:", query);

  try {
    const userSession = await auth.api.getSession({ headers: req.headers });

    if (!userSession) {
      return res.status(401).json({
        message: "User not logged in",
      });
    }

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
    });

    if (typeof recording === "string" || recording instanceof String) {
      return res.status(500).json({ error: "Failed to fetch recording" });
    }

    if (!recording) {
      return res.status(404).json({ message: "Recording not found" });
    }

    if (recording.userId !== userSession.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if transcript already exists
    if (recording.transcript) {
      return res.status(200).json({ transcripts: recording.transcript });
    }

    // Transcribe the recording and save to database
    const transcriptText = await transcribeRecording(
      recording.fileUrl,
      recordingId,
      true
    );

    res.status(200).json({ transcripts: transcriptText });
  } catch (error) {
    console.error("Error fetching transcripts:", error);
    res.status(500).json({ error: "Failed to fetch transcripts" });
  }
});

export default recordingsRouter;
