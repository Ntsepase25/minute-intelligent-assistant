import express from "express";
import multer from "multer";
import { UTApi } from "uploadthing/server";
import { auth } from "../lib/auth.ts";
import { prisma } from "../lib/prisma.ts";

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
    if (typeof req.body.metadata === 'string') {
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
      return res.status(401).json({
        message: "User not logged in",
      });
    }

    // Upload to UploadThing
    const uploadResult = await utapi.uploadFiles([
      new File([req.file.buffer], req.file.originalname, {
        type: req.file.mimetype,
      }),
    ]);

    if (uploadResult[0].data) {
      const fileUrl = uploadResult[0].data.ufsUrl;
      console.log("File uploaded to UploadThing:", fileUrl);

     const recording = await prisma.recording.create({
        data: {
          recordingUrl: fileUrl,
          userId: userSession.user.id,
          meetingId: meetingId,
          meetingPlatform: meetingPlatform,
        },
      });

      console.log("Recording saved to DB:", recording);

      // Here you can save the recording info to your database
      const recordingData = {
        fileName: req.file.originalname,
        fileUrl: fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date(),
        userId: userSession.user.id,
        // Add user ID if you have authentication
      };

      res.status(201).json({
        message: "Recording uploaded successfully",
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

export default recordingsRouter;
