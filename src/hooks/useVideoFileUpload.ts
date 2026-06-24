import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { apiSend } from '../lib/api';
import {
  MAX_VIDEO_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE_DISPLAY,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_VIDEO_EXTENSIONS,
} from '../lib/video/constants';
import type { VideoUploadResponse } from '../lib/video/types';

interface UseVideoFileUploadOptions {
  /** Callback invoked when a file is successfully uploaded */
  onUploadComplete?: (url: string, fileName: string) => void;
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
export function useVideoFileUpload({ onUploadComplete }: UseVideoFileUploadOptions = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Validates a video file against size and type constraints.
   * Checks file size (max 500MB) and valid video file extensions.
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
    await uploadFile(selectedFile);
  };

  const uploadFile = async (fileToUpload: File) => {
    const token = sessionStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('video', fileToUpload);

    setUploading(true);
    try {
      const res = await fetch('/api/videos/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to upload video file');
      }

      const data: VideoUploadResponse = await res.json();
      setUploadedUrl(data.url);

      onUploadComplete?.(data.url, data.originalName);

      toast.success('Video file uploaded successfully');
      return data;
    } catch (error: unknown) {
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

  const removeUploaded = () => {
    setFile(null);
    setUploadedUrl(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    inputRef.current?.click();
  };

  return {
    file,
    uploading,
    uploadedUrl,
    inputRef,
    handleFileChange,
    uploadFile,
    removeUploaded,
    triggerFileSelect,
  };
}
