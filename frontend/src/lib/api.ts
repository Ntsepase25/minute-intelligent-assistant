import { recording } from "./types";

// Use proxy in production, direct backend in development
const BASE_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? window.location.origin  // Production: use same domain (proxied)
  : "http://localhost:8080"; // Development: direct backend

console.log('API BASE_URL:', BASE_URL);

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Always include cookies for auth
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    // Get response text first
    const responseText = await response.text();
    
    // Try to parse as JSON
    let data: T;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new ApiError(
        `Server returned invalid JSON. Response: ${responseText.substring(0, 200)}...`,
        response.status,
        responseText
      );
    }

    if (!response.ok) {
      throw new ApiError(
        (data as any)?.message || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      error
    );
  }
}

// Recordings API
export const recordingsApi = {
  // Get all recordings
  getRecordings: async (): Promise<{ recordings: recording[] }> => {
    return apiRequest<{ recordings: recording[] }>('/recordings');
  },

  // Get single recording by ID
  getRecording: async (id: string): Promise<{ recording: recording }> => {
    return apiRequest<{ recording: recording }>(`/recordings/${id}`);
  },

  // Upload recording with different services
  uploadRecording: async (
    file: File, 
    metadata: { meetingId?: string; meetingPlatform?: string },
    service: 'google-stt' | 'assembly-ai' = 'google-stt'
  ): Promise<any> => {
    const formData = new FormData();
    formData.append('recording', file);
    formData.append('metadata', JSON.stringify(metadata));

    return apiRequest(`/recordings/save/${service}`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },

  // Regenerate transcript
  regenerateTranscript: async (recordingId: string): Promise<{ message: string; transcript: string }> => {
    return apiRequest(`/recordings/regenerate-transcript/${recordingId}`, {
      method: 'POST',
    });
  },

  // Regenerate summary
  regenerateSummary: async (recordingId: string): Promise<{ message: string; summary: string }> => {
    return apiRequest(`/recordings/regenerate-summary/${recordingId}`, {
      method: 'POST',
    });
  },

  // Get Google STT status
  getGoogleSttStatus: async (operationName: string): Promise<{ status: any }> => {
    return apiRequest(`/recordings/google-stt-status/${operationName}`);
  },

  // Get AssemblyAI status
  getAssemblyAiStatus: async (transcriptId: string): Promise<{ status: any }> => {
    return apiRequest(`/recordings/assembly-ai-status/${transcriptId}`);
  },

  // Delete recording
  deleteRecording: async (recordingId: string): Promise<{ message: string }> => {
    return apiRequest(`/recordings/${recordingId}`, {
      method: 'DELETE',
    });
  },
};
