# How to Use the Upload Recording Feature

## Quick Start

1. **Navigate to Dashboard**
   - Log in to your MIA account
   - You'll see the dashboard with the sidebar

2. **Click "Upload New Recording" Button**
   - Located at the top of the sidebar
   - Has a cloud upload icon

3. **Fill in Meeting Details (Optional)**
   - **Meeting Title**: Give your recording a descriptive name
   - **Meeting Date**: Select when the meeting took place
   - **Meeting Platform**: Choose from Google Meet, Zoom, Teams, or Other
   
4. **Add Google Meet Code (Optional)**
   - If you selected "Google Meet" as the platform
   - Enter the meeting code (e.g., abc-defg-hij)
   - This allows us to fetch participant names and transcript data
   - **Note**: Only works if transcription was enabled during the meeting

5. **Add Participants (Optional)**
   - Enter names of meeting participants
   - One name per line
   - Example:
     ```
     John Smith
     Jane Doe
     Bob Johnson
     ```

6. **Upload Your Recording**
   - Drag and drop your audio/video file into the dropzone
   - OR click the dropzone to browse and select a file
   - Supported formats: Most audio and video formats
   - Maximum size: 256MB for video, 128MB for audio

7. **Click "Upload Recording"**
   - Button appears after you select a file
   - Upload will begin immediately

8. **Wait for Processing**
   - Upload progress is shown
   - Once uploaded, transcription begins automatically
   - This may take a few minutes depending on file length
   - You'll see a success message when upload completes
   - Dialog closes automatically

9. **View Your Recording**
   - Your new recording appears in the sidebar
   - Click on it to view the transcript and summary
   - Summary and action items are generated automatically

## Tips for Best Results

### For Google Meet Recordings

If you recorded a Google Meet session and want to get participant names and speaker attribution:

1. **Enable Transcription During the Meeting**
   - Before or during your Google Meet
   - Click the three dots menu
   - Select "Record meeting" or "Turn on captions"
   - This ensures Google Meet saves the transcript

2. **Get the Meeting Code**
   - Find it in your meeting URL or the meeting details
   - Format: abc-defg-hij (three groups separated by hyphens)

3. **Upload Within a Reasonable Time**
   - Google Meet data has retention limits
   - Best to upload within a few days of the meeting

### For Other Platform Recordings

If you recorded on Zoom, Teams, or your phone:

1. Simply upload the file
2. Fill in participant names manually if you want them tracked
3. MIA will transcribe and summarize automatically

### File Preparation

- **Trim unnecessary parts**: Remove long silences or non-meeting content before uploading
- **Use good quality**: Higher quality audio = better transcription
- **Compress if needed**: Keep files under the size limit

## What Happens After Upload?

1. **Immediate**:
   - File is uploaded to secure cloud storage
   - Recording entry is created in your dashboard
   - You see a success notification

2. **Background Processing** (Takes a few minutes):
   - Audio is transcribed using AssemblyAI
   - Summary is generated using AI
   - Action items are extracted
   - Next meeting details are identified
   - If Google Meet code was provided:
     - Participant list is fetched
     - Transcript entries with speaker names are retrieved

3. **When Complete**:
   - Full transcript is available in the recording view
   - Summary, action items, and key points are displayed
   - You can regenerate transcript or summary if needed

## Troubleshooting

### "Upload failed" Error
- **Check file size**: Ensure it's under the limit
- **Check internet connection**: Stable connection required
- **Try different format**: Convert to MP3 or MP4 if issues persist
- **Check login status**: Make sure you're logged in

### "Google Meet data not available"
- Most common: Transcription wasn't enabled during the meeting
- Meeting code might be incorrect
- Meeting might be too old
- You might not have access to that meeting

### Transcription is Taking Too Long
- Normal for longer recordings (30+ minutes)
- Can take 5-10 minutes for a 1-hour meeting
- Refresh the page to see if it's complete
- Check back in a few minutes

### No Participant Names Showing
- If you didn't provide a Google Meet code, names won't be automatically detected
- You can manually add participant names when uploading
- Or use the regenerate transcript feature later

## Privacy & Security

- All recordings are stored securely on UploadThing's cloud storage
- Only you can access your recordings
- Transcription is processed by AssemblyAI with enterprise-grade security
- Your Google Meet data is fetched using your authenticated account
- We never store your Google Meet API credentials

## Supported File Formats

### Audio Formats
- MP3
- WAV
- M4A
- AAC
- OGG
- FLAC
- And more...

### Video Formats
- MP4
- MOV
- AVI
- MKV
- WebM
- And more...

## Need Help?

If you encounter any issues:
1. Check your internet connection
2. Verify file size and format
3. Try logging out and back in
4. Contact support if the problem persists

## Feature Requests

Have ideas for improvements? We'd love to hear:
- Support for more file formats
- Batch uploads
- Upload from cloud storage (Google Drive, Dropbox)
- Video playback in browser
- And more!
