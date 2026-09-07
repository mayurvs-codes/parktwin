# API Service Layer (`apps/web/services/`)

TypeScript service wrappers utilizing `axios` for backend REST communication.

---

## Long-Running Video Upload Configuration

Standard HTTP API calls timeout after 15 seconds (`NEXT_PUBLIC_API_TIMEOUT = 15000`).
For video pipeline uploads (`/api/v1/anpr/upload` and `/api/v1/journey/upload`), the timeout is explicitly disabled:

```typescript
// apps/web/services/anpr.ts
export async function uploadAnprVideo(
  file: File,
  onProgress?: (percent: number) => void
): Promise<AnprUploadResponse> {
  const formData = new FormData();
  formData.append('video', file);

  const response = await apiClient.post<AnprUploadResponse>(
    '/api/v1/anpr/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0, // Infinite timeout for long video processing on CPU
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      },
    }
  );
  return response.data;
}
```
