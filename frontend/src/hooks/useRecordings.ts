import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recordingsApi } from '../lib/api';
import { recording } from '../lib/types';
import { toast } from 'sonner';

// Query Keys - centralized for easy cache invalidation
export const queryKeys = {
  recordings: ['recordings'] as const,
  recording: (id: string) => ['recordings', id] as const,
  googleSttStatus: (operationName: string) => ['google-stt-status', operationName] as const,
  assemblyAiStatus: (transcriptId: string) => ['assembly-ai-status', transcriptId] as const,
};

// QUERIES

/**
 * Hook to fetch all recordings
 */
export function useRecordings() {
  return useQuery({
    queryKey: queryKeys.recordings,
    queryFn: recordingsApi.getRecordings,
    select: (data: { recordings: recording[] }) => data.recordings, // Extract just the recordings array
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

/**
 * Hook to fetch a single recording by ID
 */
export function useRecording(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.recording(id || ''),
    queryFn: () => recordingsApi.getRecording(id!),
    select: (data: { recording: recording }) => data.recording,
    enabled: !!id, // Only run query if ID exists
    staleTime: 5 * 60 * 1000, // Individual recordings can be cached longer
  });
}

/**
 * Hook to get Google STT operation status
 */
export function useGoogleSttStatus(operationName: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.googleSttStatus(operationName || ''),
    queryFn: () => recordingsApi.getGoogleSttStatus(operationName!),
    enabled: !!operationName && enabled,
    refetchInterval: (query) => {
      // The data before select transform is { status: any }
      // We need to check the original data structure
      const rawData = query.state.data as { status: any } | undefined;
      if (rawData?.status?.done) return false;
      return 3000; // Poll every 3 seconds
    },
    select: (data: { status: any }) => data.status,
  });
}

/**
 * Hook to get AssemblyAI transcript status
 */
export function useAssemblyAiStatus(transcriptId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.assemblyAiStatus(transcriptId || ''),
    queryFn: () => recordingsApi.getAssemblyAiStatus(transcriptId!),
    enabled: !!transcriptId && enabled,
    refetchInterval: (query) => {
      // The data before select transform is { status: any }
      const rawData = query.state.data as { status: any } | undefined;
      if (rawData?.status?.status === 'completed' || rawData?.status?.status === 'error') {
        return false;
      }
      return 5000; // Poll every 5 seconds
    },
    select: (data: { status: any }) => data.status,
  });
}

// MUTATIONS

/**
 * Hook to upload a recording
 */
export function useUploadRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, metadata, service }: {
      file: File;
      metadata: { meetingId?: string; meetingPlatform?: string };
      service?: 'google-stt' | 'assembly-ai';
    }) => recordingsApi.uploadRecording(file, metadata, service),
    
    onSuccess: (data) => {
      // Invalidate recordings list to show new recording
      queryClient.invalidateQueries({ queryKey: queryKeys.recordings });
      
      toast.success('Recording uploaded successfully!');
      console.log('Upload successful:', data);
    },
    
    onError: (error: any) => {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Failed to upload recording');
    },
  });
}

/**
 * Hook to regenerate transcript
 */
export function useRegenerateTranscript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordingsApi.regenerateTranscript,
    
    onMutate: async (recordingId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.recording(recordingId) });
      
      // Snapshot the previous value
      const previousRecording = queryClient.getQueryData(queryKeys.recording(recordingId));
      
      // Optimistically update to show loading state
      queryClient.setQueryData(queryKeys.recording(recordingId), (old: any) => {
        if (old?.recording) {
          return {
            ...old,
            recording: {
              ...old.recording,
              isRegeneratingTranscript: true,
            }
          };
        }
        return old;
      });
      
      return { previousRecording };
    },
    
    onSuccess: (data: { transcript: string }, recordingId) => {
      // Update the specific recording in cache
      queryClient.setQueryData(queryKeys.recording(recordingId), (old: any) => {
        if (old?.recording) {
          return {
            ...old,
            recording: {
              ...old.recording,
              transcript: data.transcript,
              isRegeneratingTranscript: false,
            }
          };
        }
        return old;
      });
      
      // Also update the recording in the recordings list
      queryClient.setQueryData(queryKeys.recordings, (old: { recordings: recording[] } | undefined) => {
        if (!old || !old.recordings) return old;
        return {
          ...old,
          recordings: old.recordings.map(recording => 
            recording.id === recordingId 
              ? { ...recording, transcript: data.transcript }
              : recording
          )
        };
      });
      
      toast.success('Transcript regenerated successfully!');
    },
    
    onError: (error: any, recordingId, context) => {
      // Rollback optimistic update
      if (context?.previousRecording) {
        queryClient.setQueryData(queryKeys.recording(recordingId), context.previousRecording);
      }
      
      console.error('Transcript regeneration failed:', error);
      toast.error(error.message || 'Failed to regenerate transcript');
    },
  });
}

/**
 * Hook to regenerate summary
 */
export function useRegenerateSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordingsApi.regenerateSummary,
    
    onMutate: async (recordingId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recording(recordingId) });
      
      const previousRecording = queryClient.getQueryData(queryKeys.recording(recordingId));
      
      // Optimistically update to show loading state
      queryClient.setQueryData(queryKeys.recording(recordingId), (old: any) => {
        if (old?.recording) {
          return {
            ...old,
            recording: {
              ...old.recording,
              isRegeneratingSummary: true,
            }
          };
        }
        return old;
      });
      
      return { previousRecording };
    },
    
    onSuccess: (data: { summary: string }, recordingId) => {
      // Update the specific recording in cache
      queryClient.setQueryData(queryKeys.recording(recordingId), (old: any) => {
        if (old?.recording) {
          return {
            ...old,
            recording: {
              ...old.recording,
              summary: data.summary,
              isRegeneratingSummary: false,
            }
          };
        }
        return old;
      });
      
      // Also update the recording in the recordings list
      queryClient.setQueryData(queryKeys.recordings, (old: { recordings: recording[] } | undefined) => {
        if (!old || !old.recordings) return old;
        return {
          ...old,
          recordings: old.recordings.map(recording => 
            recording.id === recordingId 
              ? { ...recording, summary: data.summary }
              : recording
          )
        };
      });
      
      toast.success('Summary regenerated successfully!');
    },
    
    onError: (error: any, recordingId, context) => {
      // Rollback optimistic update
      if (context?.previousRecording) {
        queryClient.setQueryData(queryKeys.recording(recordingId), context.previousRecording);
      }
      
      console.error('Summary regeneration failed:', error);
      toast.error(error.message || 'Failed to regenerate summary');
    },
  });
}

/**
 * Hook to delete a recording
 */
export function useDeleteRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordingsApi.deleteRecording,
    
    onMutate: async (recordingId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.recordings });
      
      // Snapshot the previous value
      const previousRecordings = queryClient.getQueryData(queryKeys.recordings);
      
      // Optimistically remove from recordings list
      // Note: The recordings query uses select to extract just the array, 
      // but the raw data is { recordings: recording[] }
      queryClient.setQueryData(queryKeys.recordings, (old: { recordings: recording[] } | undefined) => {
        if (!old || !old.recordings) return old;
        return {
          ...old,
          recordings: old.recordings.filter(recording => recording.id !== recordingId)
        };
      });
      
      return { previousRecordings };
    },
    
    onSuccess: (data, recordingId) => {
      // Remove the individual recording query from cache
      queryClient.removeQueries({ queryKey: queryKeys.recording(recordingId) });
      
      toast.success('Recording deleted successfully!');
    },
    
    onError: (error: any, recordingId, context) => {
      // Rollback optimistic update
      if (context?.previousRecordings) {
        queryClient.setQueryData(queryKeys.recordings, context.previousRecordings);
      }
      
      console.error('Delete failed:', error);
      toast.error(error.message || 'Failed to delete recording');
    },
  });
}
