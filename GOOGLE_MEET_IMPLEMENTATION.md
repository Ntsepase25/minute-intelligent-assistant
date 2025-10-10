# Google Meet Speaker Attribution Feature Implementation

## Overview
This implementation adds Google Meet API integration to fetch participant information and speaker-attributed transcripts, enhancing the existing meeting recording system with detailed speaker identification and timing.

## Features Implemented

### 1. **Database Schema Updates**
- Added `Participant` model to store Google Meet participant information
- Added `TranscriptEntry` model to store individual transcript segments with speaker attribution
- Extended `Recording` model with Google Meet specific fields

### 2. **Google Meet API Integration**
- **Conference Detection**: Find Google Meet conferences by meeting ID
- **Participant Fetching**: Get all meeting participants with join/leave times
- **Transcript Retrieval**: Fetch speaker-attributed transcript entries
- **Token Management**: Handle Google OAuth tokens with refresh capability

### 3. **Enhanced User Interface**
- **Speaker-Attributed Transcript Component**: New component showing who said what and when
- **Participant Filtering**: Filter transcript by specific speakers
- **Visual Speaker Identification**: Color-coded avatars for each participant
- **Search Functionality**: Search through transcript with speaker context
- **Export Options**: Download transcripts with speaker attribution

### 4. **Smart Regeneration**
- **Automatic Detection**: Detect Google Meet recordings and fetch participant data during regeneration
- **Fallback Handling**: Gracefully fall back to regular transcription if Google Meet data unavailable
- **Manual Fetch**: Dedicated button to fetch Google Meet data for existing recordings

## Technical Architecture

### Backend Components

#### 1. **Google Meet Helpers** (`/backend/helpers/googleMeetHelpers.ts`)
```typescript
// Core functions
- findGoogleMeetConference()     // Find conference by meeting ID
- getGoogleMeetParticipants()    // Fetch participant list
- getGoogleMeetTranscripts()     // Get available transcripts
- getGoogleMeetTranscriptEntries() // Get detailed transcript entries
- processGoogleMeetRecording()   // Complete processing workflow
```

#### 2. **API Endpoints** (`/backend/routes/recordings.js`)
```javascript
// New endpoints
POST /recordings/fetch-google-meet-data/:recordingId
  - Manually fetch Google Meet data for existing recordings
  - Returns participants and transcript entries

// Enhanced existing endpoints
POST /recordings/regenerate-transcript/:recordingId
  - Now attempts to fetch Google Meet data first
  - Falls back to regular transcription

POST /recordings/regenerate-summary/:recordingId
  - Optionally fetches Google Meet data for better context
```

#### 3. **Database Models** (`/backend/prisma/schema.prisma`)
```prisma
model Participant {
  googleParticipantId String  // Google's participant ID
  googleUserId        String? // For signed-in users
  displayName         String? // Participant's display name
  participantType     String  // "signedinUser", "anonymousUser", "phoneUser"
  earliestStartTime   DateTime?
  latestEndTime       DateTime?
}

model TranscriptEntry {
  googleEntryId      String   // Google's entry ID
  googleParticipantId String? // Links to participant
  text               String   // Spoken text
  languageCode       String?  // Language detected
  startTime          DateTime // When speaking started
  endTime            DateTime // When speaking ended
}
```

### Frontend Components

#### 1. **Speaker-Attributed Transcript** (`/frontend/src/components/dashboard/TranscriptWithSpeakers.tsx`)
- **Color-coded speakers**: Each participant gets a unique avatar color
- **Timeline view**: Shows when each person spoke
- **Speaker filtering**: Filter by specific participant
- **Search with context**: Search across all speakers or specific ones
- **Export functionality**: Download with speaker attribution

#### 2. **Enhanced Types** (`/frontend/src/lib/types.ts`)
```typescript
type Participant = {
  googleParticipantId: string;
  displayName: string | null;
  participantType: "signedinUser" | "anonymousUser" | "phoneUser";
  earliestStartTime: Date | null;
  latestEndTime: Date | null;
  // ... other fields
}

type TranscriptEntry = {
  googleParticipantId: string | null;
  text: string;
  startTime: Date;
  endTime: Date;
  // ... other fields
}
```

#### 3. **Smart UI Switching** (`/frontend/src/components/mvpblocks/bento-grid-2.tsx`)
```tsx
// Automatically chooses the right transcript component
{selectedRecording.meetingPlatform === "google-meet" && 
 selectedRecording.transcriptEntries?.length > 0 ? (
  <TranscriptWithSpeakers 
    transcriptEntries={selectedRecording.transcriptEntries}
    participants={selectedRecording.participants}
  />
) : (
  <Transcript transcript={selectedRecording.transcript} />
)}
```

## Google OAuth Configuration

### Better Auth Setup (`/backend/lib/auth.ts`)
```typescript
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    prompt: "select_account consent",
    accessType: "offline",
    scope: [
      "openid",
      "email", 
      "profile",
      "https://www.googleapis.com/auth/meetings.space.readonly",
      "https://www.googleapis.com/auth/meetings.space.transcripts.readonly"
    ],
  },
}
```

### Required Google Cloud Setup
1. **Enable Google Meet API** in Google Cloud Console
2. **Add OAuth scopes** to consent screen
3. **Configure redirect URIs** for your application
4. **Ensure Google Workspace** account (required for Meet API)

## User Experience Enhancements

### 1. **Automatic Enhancement**
- When regenerating transcripts for Google Meet recordings, the system automatically attempts to fetch speaker data
- No additional user action required for enhanced experience

### 2. **Manual Control**
- "Fetch Participants" button appears for Google Meet recordings
- Allows users to manually retrieve speaker data for existing recordings
- Provides clear feedback on success/failure

### 3. **Graceful Degradation**
- If Google Meet data is unavailable, falls back to regular transcript
- No functionality is lost for non-Google Meet recordings
- Clear error messages guide users when issues occur

### 4. **Enhanced Regeneration Flow**
```
1. User clicks "Regenerate Transcript"
2. System detects Google Meet recording
3. Attempts to fetch participant data from Google Meet API
4. If successful: Updates transcript with speaker attribution
5. If failed: Falls back to regular audio transcription
6. Auto-regenerates summary with enhanced context
```

## Data Flow

### Google Meet Data Processing
```
Meeting ID → Conference Record → Participants + Transcripts → Database
                ↓                      ↓              ↓
        Conference metadata    Participant info   Transcript entries
                ↓                      ↓              ↓
           Recording table      Participant table  TranscriptEntry table
```

### Frontend Data Consumption
```
API Response → Store Update → Component Re-render → Enhanced UI
     ↓              ↓               ↓                 ↓
Speaker data   Updated state   Speaker avatars   Attribution
Transcript     New entries     Timeline view     Search/Filter
```

## Benefits

### 1. **Enhanced Meeting Analytics**
- Know exactly who spoke when
- Analyze participation levels
- Track speaking time per participant

### 2. **Better Meeting Reviews**
- Quickly find specific speaker's contributions
- Context-aware meeting summaries
- Action item attribution

### 3. **Improved Accessibility**
- Clear speaker identification
- Timeline-based navigation
- Visual speaker distinction

### 4. **Seamless Integration**
- Works with existing recordings
- No breaking changes to current functionality
- Progressive enhancement approach

## Usage Instructions

### For New Google Meet Recordings
1. Upload recording with meeting platform set to "google-meet"
2. Include meeting ID in metadata
3. System automatically fetches participant data during processing

### For Existing Google Meet Recordings
1. Navigate to recording page
2. Click "Fetch Participants" button (visible for Google Meet recordings)
3. System retrieves and displays speaker-attributed transcript

### For Enhanced Summaries
1. Click "Regenerate Summary" on Google Meet recordings
2. System automatically includes speaker context in summary generation
3. Results in more detailed, speaker-aware meeting summaries

## Error Handling

### OAuth Issues
- **invalid_scope**: Check Google Cloud Console API enablement
- **access_denied**: User needs to grant Google Meet permissions
- **token_expired**: Automatic refresh token handling

### API Failures
- **Conference not found**: Meeting may be too old or ID incorrect
- **No transcripts available**: Google Meet transcription wasn't enabled
- **Permission denied**: User lacks access to the meeting

### Graceful Fallbacks
- Falls back to regular transcription if Google Meet data unavailable
- Maintains existing functionality for non-Google Meet recordings
- Clear user feedback for all error conditions

This implementation provides a comprehensive speaker attribution system that enhances meeting analysis while maintaining backward compatibility and providing graceful degradation when Google Meet data is unavailable.
