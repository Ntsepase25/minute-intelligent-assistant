# Upload Recording Feature Implementation

## Overview
Implemented a comprehensive upload feature that allows users to manually upload audio/video recordings from their devices (e.g., phone recordings) with automatic transcription and optional Google Meet integration.

## Features Implemented

### 1. Backend Changes

#### Updated `backend/uploadthing.ts`
- Enhanced file router to accept audio files up to 128MB and video files up to 256MB
- Added input validation using Zod schema for:
  - `userId` (required)
  - `meetingTitle` (optional)
  - `meetingDate` (optional)
  - `meetingId` (optional - for Google Meet code)
  - `meetingPlatform` (optional - google-meet, zoom, teams, etc.)
  - `participants` (optional - array of participant names)
- Implemented middleware to validate user exists in database
- Enhanced `onUploadComplete` callback to:
  - Create recording in database with metadata
  - Automatically trigger AssemblyAI transcription
  - Fetch Google Meet data if meetingId and platform are provided
  - Return recording ID and success status

#### Dependencies Added
- `zod` - for input validation

### 2. Frontend Changes

#### New File: `frontend/src/lib/uploadthing.ts`
- Generated typed UploadButton and UploadDropzone components
- Generated useUploadThing hook for programmatic uploads
- Exported useDropzone for custom dropzone UI
- Configured to point to backend API endpoint

#### New File: `frontend/src/components/upload-recording-dialog.tsx`
- Comprehensive upload dialog component with:
  - **Meeting Information Form:**
    - Meeting Title (optional)
    - Meeting Date with datetime picker (optional)
    - Meeting Platform selector (Google Meet, Zoom, Teams, Other)
    - Google Meet Code field (shown when Google Meet is selected)
    - Participants textarea (optional, one name per line)
  
  - **Drag & Drop Upload Zone:**
    - Custom-styled dropzone using react-dropzone
    - Displays selected file with size
    - Visual feedback for drag state
    - Supports audio and video files
  
  - **Upload Status Indicators:**
    - Idle state: Shows dropzone
    - Uploading state: Loading spinner with message
    - Success state: Success icon with message
    - Error state: Error icon with retry option
  
  - **Smart Features:**
    - Automatic dialog close after successful upload
    - Toast notifications for all states
    - Form validation
    - Disabled state during upload
    - Reset functionality

#### Updated `frontend/src/components/app-sidebar.tsx`
- Added useState for dialog open/close
- Updated "Upload New Recording" button to open dialog
- Added UploadRecordingDialog component
- Passed onUploadComplete callback prop
- Integrated with parent component's refetch logic

#### Updated `frontend/src/pages/dashboard.tsx`
- Added onUploadComplete callback to AppSidebar
- Triggers recordings refetch when upload completes
- Shows success toast notification

#### Dependencies Added
- `@uploadthing/react` - React bindings for UploadThing
- `uploadthing` - Client library for UploadThing
- Added textarea component from shadcn/ui

### 3. Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User clicks "Upload New Recording" button                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Upload Dialog Opens                                              │
│ - User fills in meeting details (optional)                       │
│ - User selects meeting platform                                  │
│ - If Google Meet: User can enter meeting code                    │
│ - User enters participants (optional)                            │
│ - User drags/drops or selects audio/video file                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ User clicks "Upload Recording" button                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend sends file + metadata to UploadThing                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend (uploadthing.ts) receives upload                         │
│ 1. Validates user exists                                         │
│ 2. Uploads file to UploadThing storage                           │
│ 3. Creates recording in database                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Post-Upload Processing (Async)                                   │
│ 1. Triggers AssemblyAI transcription                             │
│ 2. If Google Meet ID provided:                                   │
│    - Fetches participants from Google Meet API                   │
│    - Fetches transcript entries (if transcription was enabled)   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend receives success                                        │
│ 1. Shows success toast                                           │
│ 2. Closes dialog after 2 seconds                                 │
│ 3. Refetches recordings list                                     │
│ 4. New recording appears in sidebar                              │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Google Meet Integration

When a user provides a Google Meet code (e.g., "abc-defg-hij"):
- The backend attempts to fetch participant data from Google Meet API
- If the meeting had transcription enabled, it fetches transcript entries
- This provides speaker attribution (who said what)
- Falls back gracefully if data is not available

### 5. Automatic Transcription

- All uploaded recordings are automatically transcribed using AssemblyAI
- Transcription runs asynchronously in the background
- Summary is generated from the transcript
- User can view results once processing completes

## File Structure

```
backend/
├── uploadthing.ts                     # UploadThing configuration (UPDATED)
└── package.json                       # Added: zod

frontend/
├── src/
│   ├── components/
│   │   ├── upload-recording-dialog.tsx  # NEW: Upload dialog component
│   │   └── app-sidebar.tsx              # UPDATED: Added upload button
│   ├── lib/
│   │   └── uploadthing.ts              # NEW: UploadThing utilities
│   └── pages/
│       └── dashboard.tsx               # UPDATED: Added refetch callback
└── package.json                        # Added: @uploadthing/react, uploadthing
```

## Testing Checklist

- [ ] Click "Upload New Recording" button opens dialog
- [ ] Can enter meeting details
- [ ] Platform selector works
- [ ] Google Meet code field appears when Google Meet is selected
- [ ] Can drag and drop files
- [ ] Can click to select files
- [ ] File preview shows name and size
- [ ] Upload button disabled when no file selected
- [ ] Upload progress shows loading state
- [ ] Success message appears after upload
- [ ] Dialog closes automatically after success
- [ ] New recording appears in sidebar
- [ ] Transcription processes in background
- [ ] Google Meet data fetched if code provided
- [ ] Error handling works (network errors, file too large, etc.)

## Environment Variables Required

### Backend
```env
UPLOADTHING_SECRET=your_uploadthing_secret_key
UPLOADTHING_TOKEN=your_uploadthing_token
ASSEMBLY_AI_API_KEY=your_assembly_ai_key
GEMINI_API_KEY=your_google_api_key
```

### Frontend
```env
VITE_BACKEND_BASE_URL=http://localhost:3000
```

## API Endpoints Used

- `POST /api/uploadthing` - UploadThing file upload endpoint
- Backend automatically calls:
  - AssemblyAI transcription API
  - Google Meet API (if meeting ID provided)
  - Database (Prisma) for recording creation

## UI Components Used (shadcn/ui)

- AlertDialog
- Button
- Input
- Label
- Select
- Textarea
- Toast (sonner)

## Best Practices Followed

1. **Type Safety**: Full TypeScript typing throughout
2. **Error Handling**: Comprehensive error handling with user feedback
3. **Loading States**: Clear UI feedback for all states
4. **Accessibility**: Proper labels and ARIA attributes
5. **Responsive Design**: Works on all screen sizes
6. **User Experience**: 
   - Auto-close after success
   - Toast notifications
   - Drag & drop support
   - File size display
   - Optional fields clearly marked
7. **Code Organization**: Modular components, separate concerns
8. **Async Operations**: Non-blocking transcription and Google Meet fetching

## Known Limitations

1. TypeScript shows import.meta.env warnings (can be ignored - app builds successfully)
2. Google Meet data only available if:
   - Meeting transcription was enabled during the meeting
   - User has proper Google Meet API access
   - Meeting is recent (Google Meet data retention limits)

## Future Enhancements

1. Add upload progress percentage
2. Support for multiple file uploads
3. Batch upload for multiple recordings
4. Upload history/queue
5. Cancel upload functionality
6. Resume interrupted uploads
7. Client-side file validation before upload
8. Preview audio/video before upload
9. Trim/edit recording before upload
10. Support for more meeting platforms

## Troubleshooting

### Upload fails with "User not found"
- Ensure user is logged in
- Check database connection
- Verify userId is being passed correctly

### Google Meet data not fetched
- Verify meeting code is correct format (abc-defg-hij)
- Check if transcription was enabled during the meeting
- Verify Google Meet API credentials
- Check API rate limits

### Transcription not working
- Verify AssemblyAI API key is set
- Check file format is supported
- Ensure file is not too large
- Check backend logs for errors

### CORS errors
- Verify CORS settings in backend/server.js
- Check FRONTEND_BASE_URL environment variable
- Ensure credentials: 'include' is set in fetch options
