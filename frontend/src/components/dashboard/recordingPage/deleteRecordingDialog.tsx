import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { recording } from "@/lib/types";

interface DeleteRecordingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recording: recording | null;
  onConfirmDelete: () => void;
  isDeleting: boolean;
}

export function DeleteRecordingDialog({
  isOpen,
  onOpenChange,
  recording,
  onConfirmDelete,
  isDeleting,
}: DeleteRecordingDialogProps) {
  if (!recording) return null;

  const recordingTitle = recording.title || recording.meetingId || "Untitled Recording";
  const createdDate = new Date(recording.createdAt).toLocaleDateString();

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Recording
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to permanently delete this recording? This action cannot be undone.
            </p>
            <div className="bg-muted p-3 rounded-md space-y-1">
              <p className="font-medium text-foreground">Recording Details:</p>
              <p className="text-sm">
                <span className="font-medium">Title:</span> {recordingTitle}
              </p>
              <p className="text-sm">
                <span className="font-medium">Created:</span> {createdDate}
              </p>
              {recording.meetingPlatform && (
                <p className="text-sm">
                  <span className="font-medium">Platform:</span> {recording.meetingPlatform}
                </p>
              )}
              {recording.minutes && (
                <p className="text-sm">
                  <span className="font-medium">Duration:</span> {recording.minutes} minutes
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              All associated data including transcript, summary, participants, and audio files will be permanently deleted.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Recording
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
