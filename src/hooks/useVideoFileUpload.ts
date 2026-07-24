import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  MAX_VIDEO_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE_DISPLAY,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_VIDEO_EXTENSIONS,
} from '../lib/video/constants';
import type { VideoUploadResponse } from '../lib/video/types';

const VIDEO_CHUNK_SIZE = 20 * 1024 * 1024;

async function uploadErrorMessage(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  if (res.headers.get('content-type')?.includes('application/json')) {
    try { return JSON.parse(text).error || fallback; } catch { return fallback; }
  }
  if (res.headers.get('content-type')?.includes('text/html')) {
    return `Server error (${res.status}): ${res.statusText}`;
  }
  return text || fallback;
}

interface UseVideoFileUploadOptions {
  /** Callback invoked when a file is successfully uploaded */
  onUploadComplete?: (url: string, fileName: string) => void;
  /** Callback invoked when the current unsaved upload is discarded */
  onUploadRemoved?: () => void;
}

/**
 * Custom hook for handling video file uploads with validation and progress tracking.
 * Validates file size and type before uploading, and provides UI state and callbacks.
 *
 * @param options - Optional configuration
 * @returns Object containing upload state and handlers
 * @returns file - The selected file (if valid), or null
 * @returns uploading - Whether an upload is in progress
 * @returns uploadedUrl - The URL of the uploaded file, or null
 * @returns inputRef - Ref to the hidden file input element
 * @returns handleFileChange - Handler for file input change events
 * @returns uploadFile - Function to manually trigger an upload
 * @returns removeUploaded - Function to clear the uploaded file
 * @returns triggerFileSelect - Function to open the file picker
 *
 * @example
 * ```tsx
 * function VideoUploadForm() {
 *   const {
 *     uploading,
 *     uploadedUrl,
 *     inputRef,
 *     triggerFileSelect,
 *     removeUploaded,
 *   } = useVideoFileUpload({
 *     onUploadComplete: (url) => setValue('videoUrl', url),
 *   });
 *
 *   return (
 *     <>
 *       <Button onClick={triggerFileSelect} disabled={uploading}>
 *         {uploading ? 'Uploading...' : 'Choose Video File'}
 *       </Button>
 *       {uploadedUrl && (
 *         <Button onClick={removeUploaded}>Remove</Button>
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useVideoFileUpload({ onUploadComplete, onUploadRemoved }: UseVideoFileUploadOptions = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Validates a video file against size and type constraints.
   * Checks file size (max 2GB) and valid video file extensions.
   * @param file - The file to validate
   * @returns Object with valid flag and optional error message
   */
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Validate file size
    if (file.size > MAX_VIDEO_FILE_SIZE) {
      return {
        valid: false,
        error: `Video file must be ${MAX_VIDEO_FILE_SIZE_DISPLAY} or smaller`,
      };
    }

    // Validate file type
    if (
      !ALLOWED_VIDEO_TYPES.includes(file.type as any) &&
      !ALLOWED_VIDEO_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    ) {
      return {
        valid: false,
        error: `Only video files (${ALLOWED_VIDEO_EXTENSIONS.map((e) => e.replace('.', '')).join(', ')}) are allowed`,
      };
    }

    return { valid: true };
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      toast.error(validation.error!);
      event.target.value = '';
      return;
    }

    setFile(selectedFile);
    try {
      await uploadFile(selectedFile);
    } catch {
      // uploadFile already reports the actionable error to the user.
    }
  };

  const uploadFile = async (fileToUpload: File) => {
    const token = sessionStorage.getItem('auth_token');
    let chunkUploadId: string | null = null;

    setUploading(true);
    setUploadProgress(0);
    try {
      let res: Response;
      if (fileToUpload.size > VIDEO_CHUNK_SIZE) {
        chunkUploadId = crypto.randomUUID();
        const totalChunks = Math.ceil(fileToUpload.size / VIDEO_CHUNK_SIZE);

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
          const start = chunkIndex * VIDEO_CHUNK_SIZE;
          const chunk = fileToUpload.slice(start, Math.min(start + VIDEO_CHUNK_SIZE, fileToUpload.size));
          const chunkBody = new FormData();
          chunkBody.append('uploadId', chunkUploadId);
          chunkBody.append('originalName', fileToUpload.name);
          chunkBody.append('chunkIndex', String(chunkIndex));
          chunkBody.append('totalChunks', String(totalChunks));
          chunkBody.append('chunk', chunk, `${fileToUpload.name}.part`);

          const chunkRes = await fetch('/api/videos/files/chunks', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: chunkBody,
          });
          if (!chunkRes.ok) {
            throw new Error(await uploadErrorMessage(chunkRes, `Failed to upload part ${chunkIndex + 1}`));
          }
          setUploadProgress(Math.round(((chunkIndex + 1) / totalChunks) * 95));
        }

        res = await fetch('/api/videos/files/chunks/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ uploadId: chunkUploadId }),
        });
      } else {
        const formData = new FormData();
        formData.append('video', fileToUpload);
        res = await fetch('/api/videos/files', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      if (!res.ok) {
        throw new Error(await uploadErrorMessage(res, 'Failed to upload video file'));
      }

      const data: VideoUploadResponse = await res.json();
      setUploadProgress(100);
      setUploadedUrl(data.url);

      onUploadComplete?.(data.url, data.originalName);

      let processingLabel: string | null = null;
      if (data.processing) {
        processingLabel = data.converted
          ? `converting ${data.originalFormat || 'video'} to MP4`
          : 'compressing this large video';
        if (data.converted && data.compressed) {
          processingLabel = `converting and compressing ${data.originalFormat || 'video'}`;
        }
      }

      toast.success(
        processingLabel
          ? `Uploaded — ${processingLabel} in the background. It'll be playable shortly.`
          : 'Video file uploaded successfully'
      );
      return data;
    } catch (error: unknown) {
      if (chunkUploadId) {
        await fetch(`/api/videos/files/chunks/${chunkUploadId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      const message = error instanceof Error ? error.message : 'Failed to upload video file';
      toast.error(message);
      setFile(null);
      throw error;
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const removeUploaded = async () => {
    const urlToRemove = uploadedUrl;
    setFile(null);
    setUploadedUrl(null);
    onUploadRemoved?.();
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (!urlToRemove) return;

    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/videos/files?url=${encodeURIComponent(urlToRemove)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 404 && res.status !== 409) {
        toast.warning('The lesson was cleared, but the temporary upload could not be removed from the server');
      }
    } catch {
      toast.warning('The lesson was cleared, but the temporary upload could not be removed from the server');
    }
  };

  const triggerFileSelect = () => {
    inputRef.current?.click();
  };

  return {
    file,
    uploading,
    uploadProgress,
    uploadedUrl,
    inputRef,
    handleFileChange,
    uploadFile,
    removeUploaded,
    triggerFileSelect,
  };
}
