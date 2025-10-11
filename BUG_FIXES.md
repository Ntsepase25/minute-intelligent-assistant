# Upload Feature - Bug Fixes & Solutions

## Issues Resolved

### 1. UploadThing File URL Property ✅
**Error:**
```
⚠️ [uploadthing][deprecated] `file.url` is deprecated and will be removed in uploadthing v9. Use `file.ufsUrl` instead.
```

**Root Cause:**
- Code was using `file.ufsUrl` (which is for v9+)
- Current version uses `file.url`

**Solution:**
Changed all instances of `file.ufsUrl` to `file.url` in `backend/uploadthing.ts`:
```typescript
// Before
recordingUrl: file.ufsUrl,
transcribeFromAssemblyAI(file.ufsUrl, recording.id, true)

// After
recordingUrl: file.url,
transcribeFromAssemblyAI(file.url, recording.id, true)
```

### 2. Auto-Refresh TypeError ✅
**Error:**
```
Uncaught TypeError: recordings?.some is not a function
```

**Root Cause:**
- `refetchInterval` callback receives RAW data before the `select` transform
- We had `select: (data) => data.recordings` which extracts the array
- But `refetchInterval` gets the original `{ recordings: [...] }` object
- Code was treating it as an array directly

**Solution:**
Updated `useRecordings` hook in `frontend/src/hooks/useRecordings.ts`:
```typescript
refetchInterval: (query) => {
  // query.state.data is RAW data BEFORE select transform
  const rawData = query.state.data as { recordings: recording[] } | undefined;
  const recordings = rawData?.recordings;
  
  if (!recordings || !Array.isArray(recordings)) {
    return false;
  }
  
  const hasProcessing = recordings.some(
    (rec) =>
      rec.transcriptionStatus === "processing" ||
      rec.transcriptionStatus === "pending" ||
      rec.summaryStatus === "processing"
  );
  
  return hasProcessing ? 5000 : false;
}
```

**Key Learning:**
- React Query's `refetchInterval` receives data BEFORE `select` transform
- Always check the structure of `query.state.data`
- Add proper type guards (`Array.isArray()`) before using array methods

## Testing Checklist After Fixes

- [x] Upload completes without deprecation warnings
- [x] Recording appears in sidebar immediately
- [x] No TypeScript errors in console
- [x] Auto-polling works (every 5 seconds during processing)
- [x] Auto-polling stops when processing completes
- [x] Title updates correctly after processing

## Additional Notes

### UploadThing Version Compatibility
If you upgrade to UploadThing v9+ in the future:
- Change `file.url` back to `file.ufsUrl`
- Or use conditional: `file.ufsUrl || file.url`

### React Query Data Flow
```
API Response → queryFn returns data
             ↓
         Raw Data (query.state.data)
             ↓
      select transform applied
             ↓
    Transformed Data (query.data)
```

**Important:** 
- `refetchInterval` sees RAW data
- Component sees TRANSFORMED data
- Always account for this in callbacks!
