# Upload Recording Feature - Implementation Summary

## Overview
Implemented a comprehensive recording upload feature that allows users to manually upload audio/video files with automatic transcription and summarization with real-time status updates.

## Features Implemented

### 1. Upload Dialog Component (`upload-recording-dialog.tsx`)
- **File Upload**: Drag-and-drop interface using UploadThing's dropzone
- **Meeting Information Form**:
  - Meeting Title (optional)
  - Meeting Date/Time (optional)
  - Meeting Platform (Google Meet, Zoom, Microsoft Teams, Other)
  - Google Meet Code (for fetching participants/transcript if transcription was enabled)
  - Participants List (manual entry)
- **Upload Status Indicators**: Visual feedback for uploading, success, and error states
- **File Validation**: Accepts audio and video files up to 256MB

### 2. Backend UploadThing Integration
- **File Router** (`backend/uploadthing.ts`):
  - Configured to accept audio (up to 128MB) and video (up to 256MB)
  - Input validation using Zod schemas
  - User authentication check in middleware
  - Automatic recording creation in database
  - Asynchronous transcription initiation
  - Optional Google Meet data fetching

### 3. Processing Status System
- **Database Schema Updates**:
  - Added `transcriptionStatus` field (pending, processing, completed, failed)
  - Added `summaryStatus` field (pending, processing, completed, failed)
  
- **Status Flow**:
  1. **Upload**: Recording created with `transcriptionStatus: "processing"`, `summaryStatus: "pending"`
  2. **Transcription**: AssemblyAI transcribes audio → status updates to `transcriptionStatus: "completed"`
  3. **Summarization**: Gemini generates summary → status updates to `summaryStatus: "completed"`
  4. **Failure Handling**: Status updates to "failed" if any step fails

### 4. Real-Time UI Updates
- **Auto-Polling**: Recordings list automatically refetches every 5 seconds when processing recordings exist
- **Status Indicators**:
  - Sidebar shows "Transcribing & Summarizing..." with spinner for processing recordings
  - "Processing Failed" shown for failed recordings
  - Dynamic title updates based on status

### 5. Title Management
- **User-Provided Title**: If user provides a title during upload, it's preserved
- **AI-Generated Title**: If no title provided or upload fails initially:
  - Shows "Transcribing & Summarizing..." during processing
  - Shows "Processing Failed" if fails
  - Gemini generates title from transcript content once completed
  - Regenerate buttons update title if initially failed

### 6. Helper Utilities
Created `recordingHelpers.ts` with:
- `getRecordingDisplayTitle()`: Returns appropriate title based on status
- `isRecordingProcessing()`: Checks if recording is still processing
- `hasRecordingFailed()`: Checks if recording processing failed
- `getRecordingStatusMessage()`: Returns user-friendly status message

## File Changes

### Frontend
1. **New Files**:
   - `frontend/src/components/upload-recording-dialog.tsx` - Main upload dialog
   - `frontend/src/lib/uploadthing.ts` - UploadThing utilities
   - `frontend/src/utils/recordingHelpers.ts` - Status helper functions

2. **Modified Files**:
   - `frontend/src/components/app-sidebar.tsx` - Added upload button and dialog
   - `frontend/src/components/nav-main.tsx` - Added status indicators with spinner
   - `frontend/src/pages/dashboard.tsx` - Added refetch callback
   - `frontend/src/lib/types.ts` - Added status fields to recording type
   - `frontend/src/hooks/useRecordings.ts` - Added auto-polling logic

### Backend
1. **Modified Files**:
   - `backend/uploadthing.ts` - Complete rewrite with input validation and processing
   - `backend/helpers/transcriptionHelpers.ts` - Added status updates throughout
   - `backend/prisma/schema.prisma` - Added status fields

2. **Database Migration**:
   - Created migration: `add_processing_status_fields`
   - Adds `transcriptionStatus` and `summaryStatus` columns

## Technical Details

### UploadThing Configuration
```typescript
// Backend route configuration
recordingUploader: f({
  audio: { maxFileSize: "128MB", maxFileCount: 1 },
  video: { maxFileSize: "256MB", maxFileCount: 1 },
})
.input(z.object({
  userId: z.string(),
  meetingTitle: z.string().optional(),
  meetingDate: z.string().optional(),
  meetingId: z.string().optional(),
  meetingPlatform: z.string().optional(),
  participants: z.array(z.string()).optional(),
}))
```

### Processing Workflow
1. User uploads file → UploadThing stores file → Returns file URL
2. Recording created in DB with `transcriptionStatus: "processing"`
3. AssemblyAI transcribes audio (async)
4. Once transcribed, `transcriptionStatus: "completed"`, `summaryStatus: "processing"`
5. Gemini generates summary with AI title
6. Final update: `summaryStatus: "completed"`, title updated if needed

### Auto-Refresh Strategy
```typescript
refetchInterval: (query) => {
  const recordings = query.state.data;
  const hasProcessing = recordings?.some(
    rec => rec.transcriptionStatus === "processing" || 
           rec.summaryStatus === "processing"
  );
  return hasProcessing ? 5000 : false; // Poll every 5s if processing
}
```

## User Experience Flow

1. **Upload**:
   - User clicks "Upload New Recording" button in sidebar
   - Fills in optional meeting details
   - Drags/selects audio/video file
   - Clicks "Upload Recording"

2. **Processing**:
   - Recording immediately appears in sidebar as "Transcribing & Summarizing..."
   - Spinner indicates active processing
   - UI automatically updates every 5 seconds

3. **Completion**:
   - Title updates to AI-generated title (or user-provided title)
   - Spinner disappears
   - Full transcript and summary available

4. **Failure Handling**:
   - Title shows "Processing Failed"
   - User can click regenerate buttons to retry
   - On successful regeneration, title updates to AI-generated title

## Google Meet Integration
- If user provides Google Meet code and platform is set to "google-meet"
- System attempts to fetch:
  - Participant list with join/leave times
  - Transcript entries with speaker attribution
- Only works if transcription was enabled during the meeting
- Gracefully handles cases where data is unavailable

## Error Handling
- Network errors during upload show error toast
- Transcription failures update status to "failed"
- Summary generation failures update status to "failed"
- Users can retry using regenerate buttons
- All errors logged for debugging

## Performance Considerations
- Auto-polling only active when processing recordings exist
- Polling interval set to 5 seconds (reasonable balance)
- Stops polling once all recordings are completed
- React Query caching reduces unnecessary API calls

## Dependencies Added
### Frontend
- `@uploadthing/react` - React components for UploadThing
- `uploadthing` - UploadThing client utilities

### Backend
- `zod` - Input validation for UploadThing

## Environment Variables Required
- `UPLOADTHING_SECRET` - UploadThing API key (backend)
- `ASSEMBLY_AI_API_KEY` - AssemblyAI API key (backend)
- `GEMINI_API_KEY` - Google Gemini API key (backend)
- `VITE_BACKEND_BASE_URL` - Backend URL (frontend)

## Testing Checklist
- [ ] Upload audio file without metadata
- [ ] Upload video file with all metadata filled
- [ ] Upload with Google Meet code (transcription enabled)
- [ ] Upload with Google Meet code (transcription not enabled)
- [ ] Verify title shows "Transcribing & Summarizing..." during processing
- [ ] Verify title updates to AI-generated title after completion
- [ ] Verify user-provided title is preserved
- [ ] Verify regenerate transcript updates status correctly
- [ ] Verify regenerate summary updates status and title correctly
- [ ] Verify failed upload shows "Processing Failed"
- [ ] Verify auto-polling stops when all recordings are completed
- [ ] Verify drag-and-drop file upload works
- [ ] Verify file size validation (over 256MB rejected)
- [ ] Verify file type validation (non-audio/video rejected)

## Future Enhancements
- Progress bar showing transcription percentage
- Estimated time remaining for processing
- Batch upload support
- Upload history/queue
- Pause/resume upload capability
- Webhook notifications when processing completes
- Support for more meeting platforms
- Custom transcription service selection
