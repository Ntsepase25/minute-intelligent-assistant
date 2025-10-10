import { auth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

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
export async function getGoogleAccessToken(userId: string): Promise<string> {
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
    
    // The meetingId we store (like 'xis-zoem-tjd') is the meeting code from the URL
    // First, try to find the space using the meeting code
    let spaceResourceName: string | null = null;
    
    try {
      // Try to get the space directly using the meeting code
      const spaceResponse = await fetch(
        `https://meet.googleapis.com/v2/spaces/${meetingIdOrSpace}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      
      if (spaceResponse.ok) {
        const spaceData = await spaceResponse.json();
        spaceResourceName = spaceData.name;
        console.log(`🟢 [GOOGLE-MEET] Found space: ${spaceResourceName} for meeting code: ${meetingIdOrSpace}`);
      }
    } catch (spaceError) {
      console.log(`🟢 [GOOGLE-MEET] Could not get space directly for meeting code: ${meetingIdOrSpace}`);
    }
    
    // Get all conference records and find matching ones
    let listResponse = await fetch(
      "https://meet.googleapis.com/v2/conferenceRecords",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error("Failed to list conference records:", errorText);
      throw new Error(`Failed to list conference records: ${listResponse.status} ${errorText}`);
    }

    let listData = await listResponse.json();
    
    if (!listData.conferenceRecords || listData.conferenceRecords.length === 0) {
      console.log(`🟢 [GOOGLE-MEET] No conference records found in general list`);
      
      // If we found a space, try to get conference records for that specific space
      if (spaceResourceName) {
        console.log(`🟢 [GOOGLE-MEET] Trying to get conference records for specific space: ${spaceResourceName}`);
        
        try {
          const spaceConferencesResponse = await fetch(
            `https://meet.googleapis.com/v2/conferenceRecords?filter=space.name="${spaceResourceName}"`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          
          if (spaceConferencesResponse.ok) {
            const spaceConferencesData = await spaceConferencesResponse.json();
            if (spaceConferencesData.conferenceRecords && spaceConferencesData.conferenceRecords.length > 0) {
              console.log(`🟢 [GOOGLE-MEET] Found ${spaceConferencesData.conferenceRecords.length} conference records for space`);
              listData = spaceConferencesData;
            } else {
              console.log(`🟢 [GOOGLE-MEET] No conference records found for the specific space either`);
            }
          }
        } catch (spaceConfError) {
          console.log(`🟢 [GOOGLE-MEET] Error getting conference records for space:`, spaceConfError);
        }
      }
      
      // If still no conference records, return null but with more specific information
      if (!listData.conferenceRecords || listData.conferenceRecords.length === 0) {
        console.log(`🟢 [GOOGLE-MEET] ⚠️ No conference records available. This could mean:
        - The meeting didn't have transcription enabled
        - The meeting is too old (data retention limit)
        - The meeting hasn't ended yet
        - The user doesn't have transcript access for this meeting`);
        return null;
      }
    }

    console.log(`🟢 [GOOGLE-MEET] Found ${listData.conferenceRecords.length} conference records`);

    // Strategy 1: If we found a space, look for conferences in that space
    if (spaceResourceName) {
      const conference = listData.conferenceRecords.find((record: GoogleMeetConferenceRecord) => {
        return record.space === spaceResourceName;
      });
      
      if (conference) {
        console.log(`🟢 [GOOGLE-MEET] Found conference by space match: ${conference.name}`);
        return conference;
      }
    }

    // Strategy 2: Look for partial matches in space or name
    const conference = listData.conferenceRecords.find((record: GoogleMeetConferenceRecord) => {
      // The space field might contain the meeting code somewhere
      const spaceMatch = record.space && (
        record.space.includes(meetingIdOrSpace) ||
        record.space.toLowerCase().includes(meetingIdOrSpace.toLowerCase()) ||
        // Sometimes the meeting code might be transformed
        record.space.includes(meetingIdOrSpace.replace(/-/g, ''))
      );
      
      // Also check the conference record name
      const nameMatch = record.name && (
        record.name.includes(meetingIdOrSpace) ||
        record.name.toLowerCase().includes(meetingIdOrSpace.toLowerCase())
      );
      
      return spaceMatch || nameMatch;
    });

    if (conference) {
      console.log(`🟢 [GOOGLE-MEET] Found conference by partial match: ${conference.name}`);
      return conference;
    }

    // Strategy 3: Look for the most recent conference (fallback)
    // This is risky but might work if the user is looking for their latest meeting
    const sortedConferences = listData.conferenceRecords.sort((a: GoogleMeetConferenceRecord, b: GoogleMeetConferenceRecord) => {
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });

    console.log(`🟢 [GOOGLE-MEET] No exact match found for meeting code: ${meetingIdOrSpace}`);
    console.log(`🟢 [GOOGLE-MEET] Available conferences:`, listData.conferenceRecords.slice(0, 5).map((r: GoogleMeetConferenceRecord) => ({
      name: r.name,
      space: r.space,
      startTime: r.startTime
    })));

    // For now, don't use the fallback strategy as it might return wrong conference
    // Instead, return null and let the user know the specific meeting couldn't be found
    return null;

  } catch (error) {
    console.error("Error finding Google Meet conference:", error);
    throw error;
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
    console.log(`🟢 [GOOGLE-MEET] Saving data for recording ${recordingId}: ${participants.length} participants, ${transcriptEntries.length} transcript entries`);
    
    // Update recording with Google Meet conference info
    await prisma.recording.update({
      where: { id: recordingId },
      data: {
        googleMeetConferenceId: conferenceRecord.name,
        googleMeetSpace: conferenceRecord.space,
      },
    });

    // Always save participants (even if we don't have transcript data)
    console.log(`🟢 [GOOGLE-MEET] Saving ${participants.length} participants...`);
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

    // Save transcript entries if available
    if (transcriptEntries.length > 0) {
      console.log(`🟢 [GOOGLE-MEET] Saving ${transcriptEntries.length} transcript entries...`);
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
    } else {
      console.log(`🟢 [GOOGLE-MEET] No transcript entries to save (transcription may not have been enabled)`);
    }

    console.log(`🟢 [GOOGLE-MEET] ✅ Successfully saved all available data`);
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
    
    // First, try to find the conference record (this requires transcription to have been enabled)
    const conferenceRecord = await findGoogleMeetConference(meetingId, userId);
    
    if (conferenceRecord) {
      console.log(`🟢 [GOOGLE-MEET] Found conference: ${conferenceRecord.name}`);

      // Get participants from conference record
      const participants = await getGoogleMeetParticipants(conferenceRecord.name, userId);
      console.log(`🟢 [GOOGLE-MEET] Found ${participants.length} participants from conference record`);

      // Try to get transcripts
      let transcripts: GoogleMeetTranscript[] = [];
      let transcriptEntries: GoogleMeetTranscriptEntry[] = [];
      let fullTranscript = '';

      try {
        transcripts = await getGoogleMeetTranscripts(conferenceRecord.name, userId);
        console.log(`🟢 [GOOGLE-MEET] Found ${transcripts.length} transcripts`);

        if (transcripts.length > 0) {
          const transcript = transcripts[0];
          try {
            transcriptEntries = await getGoogleMeetTranscriptEntries(transcript.name, userId);
            console.log(`🟢 [GOOGLE-MEET] Found ${transcriptEntries.length} transcript entries`);

            if (transcriptEntries.length > 0) {
              fullTranscript = transcriptEntries
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map(entry => entry.text)
                .join(' ');
            }
          } catch (transcriptEntriesError) {
            console.log(`🟢 [GOOGLE-MEET] ⚠️ Could not get transcript entries:`, transcriptEntriesError);
          }
        } else {
          console.log(`🟢 [GOOGLE-MEET] ⚠️ No transcripts available - meeting likely didn't have transcription enabled`);
        }
      } catch (transcriptError) {
        console.log(`🟢 [GOOGLE-MEET] ⚠️ Could not get transcripts:`, transcriptError);
      }

      // Save to database
      await saveGoogleMeetData(recordingId, conferenceRecord, participants, transcriptEntries);

      console.log(`🟢 [GOOGLE-MEET] ✅ Successfully saved participant data${transcriptEntries.length > 0 ? ' with transcript entries' : ' (no transcript data available)'}`);

      return {
        participants,
        transcriptEntries,
        fullTranscript,
      };
    } else {
      // No conference record found - this happens when transcription wasn't enabled
      // But we might still be able to get basic meeting info from the space
      console.log(`🟢 [GOOGLE-MEET] No conference record found, trying alternative approach...`);
      
      try {
        const accessToken = await getGoogleAccessToken(userId);
        
        // Try to get space details
        const spaceResponse = await fetch(
          `https://meet.googleapis.com/v2/spaces/${meetingId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        
        if (spaceResponse.ok) {
          const spaceData = await spaceResponse.json();
          console.log(`🟢 [GOOGLE-MEET] Found space: ${spaceData.name}`);
          
          // Create a minimal conference record from space data
          const minimalConferenceRecord: GoogleMeetConferenceRecord = {
            name: `spaces/${meetingId}/conferenceRecords/minimal`,
            startTime: new Date().toISOString(), // We don't have the actual start time
            space: spaceData.name,
            expireTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
          };
          
          // Update recording with space info only
          await prisma.recording.update({
            where: { id: recordingId },
            data: {
              googleMeetSpace: spaceData.name,
            },
          });
          
          // Return minimal data indicating space was found but no participants/transcripts available
          console.log(`🟢 [GOOGLE-MEET] ✅ Saved space information (no participant/transcript data available without conference record)`);
          
          return {
            participants: [],
            transcriptEntries: [],
            fullTranscript: '',
          };
        } else {
          console.log(`🟢 [GOOGLE-MEET] ⚠️ Could not access space for meeting: ${meetingId}`);
        }
      } catch (spaceError) {
        console.log(`🟢 [GOOGLE-MEET] ⚠️ Error accessing space:`, spaceError);
      }
      
      // Complete failure - no space or conference record found
      console.log(`🟢 [GOOGLE-MEET] ⚠️ Conference not found for meeting: ${meetingId}`);
      return null;
    }
  } catch (error) {
    console.error("Error processing Google Meet recording:", error);
    throw error;
  }
}

/**
 * Get detailed information about a Google Meet space for debugging
 */
export async function getGoogleMeetSpaceDetails(
  meetingCode: string,
  userId: string
): Promise<any> {
  try {
    const accessToken = await getGoogleAccessToken(userId);
    
    console.log(`🟢 [GOOGLE-MEET] Getting space details for meeting code: ${meetingCode}`);
    
    // Try to get the space details
    const spaceResponse = await fetch(
      `https://meet.googleapis.com/v2/spaces/${meetingCode}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!spaceResponse.ok) {
      const errorText = await spaceResponse.text();
      console.log(`🟢 [GOOGLE-MEET] Could not get space details: ${errorText}`);
      return null;
    }
    
    const spaceData = await spaceResponse.json();
    console.log(`🟢 [GOOGLE-MEET] Space details:`, {
      name: spaceData.name,
      meetingUri: spaceData.meetingUri,
      meetingCode: spaceData.meetingCode,
      config: spaceData.config,
      activeConference: spaceData.activeConference
    });
    
    return spaceData;
  } catch (error) {
    console.error("Error getting Google Meet space details:", error);
    return null;
  }
}
