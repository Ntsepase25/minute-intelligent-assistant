import * as React from "react";
import { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUploadThing, useDropzone } from "@/lib/uploadthing";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Upload } from "lucide-react";
import { generateClientDropzoneAccept } from "uploadthing/client";

interface UploadRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

export function UploadRecordingDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: UploadRecordingDialogProps) {
  const { data: session } = authClient.useSession();
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingPlatform, setMeetingPlatform] = useState<string>("");
  const [meetingId, setMeetingId] = useState("");
  const [participants, setParticipants] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");

  const { startUpload, routeConfig } = useUploadThing("recordingUploader", {
    onClientUploadComplete: async (res) => {
      console.log("Upload completed:", res);
      
      // Extract the file URL from UploadThing response
      const fileUrl = res?.[0]?.ufsUrl || res?.[0]?.url;
      
      if (!fileUrl) {
        console.error("No file URL in upload response:", res);
        setUploadStatus("error");
        toast.error("Upload failed", {
          description: "Could not get file URL from upload",
        });
        return;
      }

      console.log("File uploaded to:", fileUrl);
      
      // Now call our backend to start transcription
      try {
        const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_BASE_URL || "http://localhost:8080";
        
        const response = await fetch(`${BACKEND_URL}/recordings/process-upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            fileUrl,
            meetingTitle: meetingTitle || undefined,
            meetingDate: meetingDate || undefined,
            meetingId: meetingId || undefined,
            meetingPlatform: meetingPlatform || undefined,
            participants: participants
              ? participants.split("\n").filter((p) => p.trim())
              : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to start transcription");
        }

        const data = await response.json();
        console.log("Backend processing started:", data);

        setUploadStatus("success");
        toast.success("Recording uploaded successfully!", {
          description: "Transcription has started. This may take a few minutes.",
        });
        
        // Call the callback and close dialog after a short delay
        setTimeout(() => {
          onUploadComplete?.();
          handleClose();
        }, 2000);
      } catch (error) {
        console.error("Error starting transcription:", error);
        setUploadStatus("error");
        toast.error("Failed to start transcription", {
          description: error instanceof Error ? error.message : "Please try again",
        });
      }
    },
    onUploadError: (error: Error) => {
      console.error("Upload error:", error);
      setUploadStatus("error");
      toast.error("Upload failed", {
        description: error.message || "Please try again",
      });
      
      // Reset to idle after a delay
      setTimeout(() => {
        setUploadStatus("idle");
      }, 3000);
    },
    onUploadBegin: () => {
      setUploadStatus("uploading");
      toast.info("Upload started", {
        description: "Your recording is being uploaded...",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: routeConfig
      ? generateClientDropzoneAccept(
          Object.keys(routeConfig).map((key) => key)
        )
      : undefined,
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("No file selected", {
        description: "Please select a file to upload",
      });
      return;
    }

    if (!session?.user?.id) {
      toast.error("Not authenticated", {
        description: "Please sign in to upload recordings",
      });
      return;
    }

    try {
      // Start upload with input data
      await startUpload(files, {
        userId: session.user.id,
        meetingTitle: meetingTitle || undefined,
        meetingDate: meetingDate || undefined,
        meetingId: meetingId || undefined,
        meetingPlatform: meetingPlatform || undefined,
        participants: participants
          ? participants.split("\n").filter((p) => p.trim())
          : undefined,
      } as any); // Type assertion needed due to UploadThing's complex types
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const handleReset = () => {
    setMeetingTitle("");
    setMeetingDate("");
    setMeetingPlatform("");
    setMeetingId("");
    setParticipants("");
    setFiles([]);
    setUploadStatus("idle");
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  if (!session?.user) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Upload Recording</AlertDialogTitle>
          <AlertDialogDescription>
            Upload an audio or video recording from your device. The recording
            will be automatically transcribed and summarized.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {/* Meeting Information Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meetingTitle">
                Meeting Title <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="meetingTitle"
                placeholder="e.g., Team Standup Meeting"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                disabled={uploadStatus === "uploading"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingDate">
                Meeting Date <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="meetingDate"
                type="datetime-local"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                disabled={uploadStatus === "uploading"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingPlatform">
                Meeting Platform <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Select
                value={meetingPlatform}
                onValueChange={setMeetingPlatform}
                disabled={uploadStatus === "uploading"}
              >
                <SelectTrigger id="meetingPlatform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google-meet">Google Meet</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="microsoft-teams">Microsoft Teams</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {meetingPlatform === "google-meet" && (
              <div className="space-y-2">
                <Label htmlFor="meetingId">
                  Google Meet Code <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="meetingId"
                  placeholder="e.g., abc-defg-hij"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  disabled={uploadStatus === "uploading"}
                />
                <p className="text-xs text-muted-foreground">
                  If provided, we'll attempt to fetch participant data and
                  transcript from Google Meet (only if transcription was enabled
                  during the meeting)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="participants">
                Participants <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="participants"
                placeholder="Enter participant names, one per line"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                disabled={uploadStatus === "uploading"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                List the names of people who participated in the meeting
              </p>
            </div>
          </div>

          {/* Upload Status Indicator */}
          {uploadStatus === "uploading" && (
            <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-600">
                Uploading and processing...
              </span>
            </div>
          )}

          {uploadStatus === "success" && (
            <div className="flex items-center justify-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">
                Upload successful! Transcription in progress...
              </span>
            </div>
          )}

          {uploadStatus === "error" && (
            <div className="flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-600">
                Upload failed. Please try again.
              </span>
            </div>
          )}

          {/* Upload Dropzone */}
          {uploadStatus === "idle" && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  {files.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {files[0].name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(files[0].size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click or drag to replace
                      </p>
                    </div>
                  ) : (
                    <>
                      {isDragActive ? (
                        <p className="text-sm text-muted-foreground">
                          Drop the file here...
                        </p>
                      ) : (
                        <>
                          <p className="text-sm font-medium">
                            Choose a file or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Audio or video files (up to 256MB)
                          </p>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {files.length > 0 && (
                <Button
                  onClick={handleUpload}
                  className="w-full"
                  disabled={uploadStatus as any === "uploading"}
                >
                  {(uploadStatus as any) === "uploading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Recording
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploadStatus === "uploading"}
            >
              {uploadStatus === "success" ? "Close" : "Cancel"}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
