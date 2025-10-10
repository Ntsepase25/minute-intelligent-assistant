import { auth } from "../lib/auth.ts";
import { prisma } from "../lib/prisma.ts";

interface GoogleMeetConferenceRecord {
  name: string;
  startTime: string;
  endTime?: string;
  expireTime: string;
  space: string;
}

interface GoogleMeetParticipant {
  name: string;
  earliestStartTime?: string;
  latestEndTime?: string;
  signedinUser?: {
    user: string;
    displayName: string;
  };
  anonymousUser?: {
    displayName: string;
  };
  phoneUser?: {
    displayName: string;
  };
}

interface GoogleMeetTranscriptEntry {
  name: string;
  participant: string;
  text: string;
  languageCode: string;
  startTime: string;
  endTime: string;
}

interface GoogleMeetTranscript {
  name: string;
  startTime: string;
  endTime: string;
  state: string;
}

/**
 * Get Google Access Token from user session
 */
async function getGoogleAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: {
      userId: userId,
      providerId: "google",
    },
  });

  if (!account?.accessToken) {
    throw new Error("No Google access token found for user");
  }

  // Check if token is expired and refresh if needed
  if (account.accessTokenExpiresAt && new Date() >= account.accessTokenExpiresAt) {
    if (!account.refreshToken) {
      throw new Error("Google access token expired and no refresh token available");
    }
    
    // Refresh the token
    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: account.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!refreshResponse.ok) {
      throw new Error("Failed to refresh Google access token");
    }

    const refreshData = await refreshResponse.json();
    
    // Update the account with new token
    await prisma.account.update({
      where: { id: account.id },
      data: {
        accessToken: refreshData.access_token,
        accessTokenExpiresAt: new Date(Date.now() + refreshData.expires_in * 1000),
      },
    });

    return refreshData.access_token;
  }

  return account.accessToken;
}

/**
 * Find Google Meet conference record by meeting ID or space
 */
export async function findGoogleMeetConference(
  meetingIdOrSpace: string,
  userId: string
): Promise<GoogleMeetConferenceRecord | null> {
  try {
    const accessToken = await getGoogleAccessToken(userId);
    
    // First, try to get conference records and find by space
    const listResponse = await fetch(
      "https://meet.googleapis.com/v2/conferenceRecords",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!listResponse.ok) {
      console.error("Failed to list conference records:", await listResponse.text());
      return null;
    }

    const listData = await listResponse.json();
    
    // Look for conference that matches the meeting ID/space
    const conference = listData.conferenceRecords?.find((record: GoogleMeetConferenceRecord) => {
      // Check if the space contains the meeting ID or if it's an exact match
      return record.space.includes(meetingIdOrSpace) || 
             record.name.includes(meetingIdOrSpace) ||
             record.space === meetingIdOrSpace;
    });

    return conference || null;
  } catch (error) {
    console.error("Error finding Google Meet conference:", error);
    return null;
  }
}

/**
 * Get participants for a Google Meet conference
 */
export async function getGoogleMeetParticipants(
  conferenceRecordName: string,
  userId: string
): Promise<GoogleMeetParticipant[]> {
  try {
    const accessToken = await getGoogleAccessToken(userId);
    
    const response = await fetch(
      `https://meet.googleapis.com/v2/${conferenceRecordName}/participants`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get participants: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.participants || [];
  } catch (error) {
    console.error("Error getting Google Meet participants:", error);
    throw error;
  }
}

/**
 * Get transcripts for a Google Meet conference
 */
export async function getGoogleMeetTranscripts(
  conferenceRecordName: string,
  userId: string
): Promise<GoogleMeetTranscript[]> {
  try {
    const accessToken = await getGoogleAccessToken(userId);
    
    const response = await fetch(
      `https://meet.googleapis.com/v2/${conferenceRecordName}/transcripts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get transcripts: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.transcripts || [];
  } catch (error) {
    console.error("Error getting Google Meet transcripts:", error);
    throw error;
  }
}

/**
 * Get transcript entries with speaker attribution
 */
export async function getGoogleMeetTranscriptEntries(
  transcriptName: string,
  userId: string
): Promise<GoogleMeetTranscriptEntry[]> {
  try {
    const accessToken = await getGoogleAccessToken(userId);
    
    const response = await fetch(
      `https://meet.googleapis.com/v2/${transcriptName}/entries`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get transcript entries: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.entries || [];
  } catch (error) {
    console.error("Error getting Google Meet transcript entries:", error);
    throw error;
  }
}

/**
 * Save Google Meet participants and transcript entries to database
 */
export async function saveGoogleMeetData(
  recordingId: string,
  conferenceRecord: GoogleMeetConferenceRecord,
  participants: GoogleMeetParticipant[],
  transcriptEntries: GoogleMeetTranscriptEntry[]
): Promise<void> {
  try {
    console.log(`🟢 [GOOGLE-MEET] Saving data for recording ${recordingId}`);
    
    // Update recording with Google Meet conference info
    await prisma.recording.update({
      where: { id: recordingId },
      data: {
        googleMeetConferenceId: conferenceRecord.name,
        googleMeetSpace: conferenceRecord.space,
      },
    });

    // Save participants
    for (const participant of participants) {
      const participantType = participant.signedinUser 
        ? "signedinUser" 
        : participant.anonymousUser 
        ? "anonymousUser" 
        : "phoneUser";
      
      const displayName = participant.signedinUser?.displayName ||
                         participant.anonymousUser?.displayName ||
                         participant.phoneUser?.displayName ||
                         "Unknown";

      const googleUserId = participant.signedinUser?.user || null;

      await prisma.participant.create({
        data: {
          recordingId,
          googleParticipantId: participant.name,
          googleUserId,
          displayName,
          participantType,
          earliestStartTime: participant.earliestStartTime ? new Date(participant.earliestStartTime) : null,
          latestEndTime: participant.latestEndTime ? new Date(participant.latestEndTime) : null,
        },
      });
    }

    // Save transcript entries
    for (const entry of transcriptEntries) {
      await prisma.transcriptEntry.create({
        data: {
          recordingId,
          googleEntryId: entry.name,
          googleParticipantId: entry.participant,
          text: entry.text,
          languageCode: entry.languageCode,
          startTime: new Date(entry.startTime),
          endTime: new Date(entry.endTime),
        },
      });
    }

    console.log(`🟢 [GOOGLE-MEET] ✅ Saved ${participants.length} participants and ${transcriptEntries.length} transcript entries`);
  } catch (error) {
    console.error("Error saving Google Meet data:", error);
    throw error;
  }
}

/**
 * Process Google Meet meeting and extract all data
 */
export async function processGoogleMeetRecording(
  recordingId: string,
  meetingId: string,
  userId: string
): Promise<{
  participants: GoogleMeetParticipant[];
  transcriptEntries: GoogleMeetTranscriptEntry[];
  fullTranscript: string;
} | null> {
  try {
    console.log(`🟢 [GOOGLE-MEET] Processing meeting: ${meetingId}`);
    
    // Find the conference record
    const conferenceRecord = await findGoogleMeetConference(meetingId, userId);
    if (!conferenceRecord) {
      console.log(`🟢 [GOOGLE-MEET] ⚠️ Conference not found for meeting: ${meetingId}`);
      return null;
    }

    console.log(`🟢 [GOOGLE-MEET] Found conference: ${conferenceRecord.name}`);

    // Get participants
    const participants = await getGoogleMeetParticipants(conferenceRecord.name, userId);
    console.log(`🟢 [GOOGLE-MEET] Found ${participants.length} participants`);

    // Get transcripts
    const transcripts = await getGoogleMeetTranscripts(conferenceRecord.name, userId);
    console.log(`🟢 [GOOGLE-MEET] Found ${transcripts.length} transcripts`);

    if (transcripts.length === 0) {
      console.log(`🟢 [GOOGLE-MEET] ⚠️ No transcripts available for conference`);
      return null;
    }

    // Get transcript entries for the first available transcript
    const transcript = transcripts[0];
    const transcriptEntries = await getGoogleMeetTranscriptEntries(transcript.name, userId);
    console.log(`🟢 [GOOGLE-MEET] Found ${transcriptEntries.length} transcript entries`);

    // Create full transcript text
    const fullTranscript = transcriptEntries
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .map(entry => entry.text)
      .join(' ');

    // Save to database
    await saveGoogleMeetData(recordingId, conferenceRecord, participants, transcriptEntries);

    return {
      participants,
      transcriptEntries,
      fullTranscript,
    };
  } catch (error) {
    console.error("Error processing Google Meet recording:", error);
    throw error;
  }
}
