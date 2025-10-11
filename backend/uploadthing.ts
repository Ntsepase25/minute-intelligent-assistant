import { createUploadthing, type FileRouter } from "uploadthing/express";
import { z } from "zod";
import { prisma } from "./lib/prisma.js";
import { transcribeFromAssemblyAI } from "./helpers/transcriptionHelpers.js";
import { processGoogleMeetRecording } from "./helpers/googleMeetHelpers.js";

const f = createUploadthing();

export const uploadRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  recordingUploader: f({
    audio: {
      maxFileSize: "128MB",
      maxFileCount: 1,
    },
    video: {
      maxFileSize: "256MB",
      maxFileCount: 1,
    },
  })
    .input(
      z.object({
        userId: z.string(),
        meetingTitle: z.string().optional(),
        meetingDate: z.string().optional(),
        meetingId: z.string().optional(),
        meetingPlatform: z.string().optional(),
        participants: z.array(z.string()).optional(),
      })
    )
    .middleware(async ({ input }) => {
      console.log("📤 [UPLOADTHING] Upload middleware - validating user");
      
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      console.log("📤 [UPLOADTHING] User validated:", user.email);
      return { userId: input.userId, metadata: input };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      console.log("📤 [UPLOADTHING] Upload completed for user:", metadata.userId);
      console.log("📤 [UPLOADTHING] File URL:", file.ufsUrl);
      console.log("📤 [UPLOADTHING] Metadata:", metadata.metadata);

      try {
        // Create recording in database
        const recording = await prisma.recording.create({
          data: {
            recordingUrl: file.ufsUrl,
            userId: metadata.userId,
            meetingId: metadata.metadata.meetingId || null,
            meetingPlatform: metadata.metadata.meetingPlatform || null,
            title: metadata.metadata.meetingTitle || null,
            transcriptionStatus: "processing",
            summaryStatus: "pending",
            createdAt: metadata.metadata.meetingDate 
              ? new Date(metadata.metadata.meetingDate) 
              : new Date(),
          },
        });

        console.log("📤 [UPLOADTHING] Recording created with ID:", recording.id);

        // Start transcription process asynchronously
        transcribeFromAssemblyAI(file.ufsUrl, recording.id, true)
          .then(() => {
            console.log("📤 [UPLOADTHING] Transcription completed for recording:", recording.id);
          })
          .catch((error) => {
            console.error("📤 [UPLOADTHING] Transcription error:", error);
            // Update status to failed
            prisma.recording.update({
              where: { id: recording.id },
              data: { 
                transcriptionStatus: "failed",
                summaryStatus: "failed"
              },
            }).catch(console.error);
          });

        // If Google Meet data is available, fetch it
        if (metadata.metadata.meetingId && metadata.metadata.meetingPlatform === "google-meet") {
          console.log("📤 [UPLOADTHING] Fetching Google Meet data for meeting:", metadata.metadata.meetingId);
          
          processGoogleMeetRecording(
            recording.id,
            metadata.metadata.meetingId,
            metadata.userId
          )
            .then((googleMeetData) => {
              if (googleMeetData) {
                console.log("📤 [UPLOADTHING] Google Meet data fetched successfully");
              }
            })
            .catch((error) => {
              console.warn("📤 [UPLOADTHING] Could not fetch Google Meet data:", error.message);
            });
        }

        return { 
          recordingId: recording.id,
          success: true 
        };
      } catch (error) {
        console.error("📤 [UPLOADTHING] Error in onUploadComplete:", error);
        throw error;
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
