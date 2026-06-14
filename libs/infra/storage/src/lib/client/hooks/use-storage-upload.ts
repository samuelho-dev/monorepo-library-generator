'use client'

/**
 * useStorageUpload Hook
 *
 * React hook for uploading files to storage using presigned URLs.
 * This hook abstracts the presigned URL workflow for client-side uploads.
 *
 * @module @samuelho-dev/infra-storage/client/hooks/use-storage-upload
 */

import { env } from '@samuelho-dev/env/client'
import { useCallback, useState } from 'react'

/**
 * Configuration for the storage upload hook
 */
export interface UseStorageUploadOptions {
  /** Storage bucket to upload to */
  bucket: string
  /** Function to generate the storage path for a file */
  generatePath: (file: File) => string
  /** Callback for upload errors */
  onError?: (error: Error) => void
  /** Callback for upload progress (per file) */
  onProgress?: (file: File, progress: number) => void
  /** Function to get presigned URL - must be provided by the app */
  getPresignedUrl?: (params: {
    bucket: string
    path: string
  }) => Promise<{ token: string; path: string } | null>
  /** Supabase project URL for direct uploads */
  supabaseUrl?: string
}

/**
 * Return type for the storage upload hook
 */
export interface UseStorageUploadReturn {
  /** Upload a single file */
  uploadFile: (file: File) => Promise<string>
  /** Upload multiple files */
  uploadFiles: (files: File[]) => Promise<string[]>
  /** Current upload state */
  isUploading: boolean
  /** Upload errors by file name */
  errors: Record<string, string>
  /** Clear all errors */
  clearErrors: () => void
}

/**
 * Default Supabase URL from environment
 */
const getDefaultSupabaseUrl = () => env.NEXT_PUBLIC_SUPABASE_URL

/**
 * Hook for uploading files to storage
 *
 * Uses presigned URLs for secure client-side uploads.
 * The getPresignedUrl function must be provided by the consuming app
 * (typically via tRPC or a similar RPC mechanism).
 *
 * @example
 * ```typescript
 * import { useStorageUpload } from '@samuelho-dev/infra-storage/client';
 * import { trpc } from '@/lib/trpc/client';
 *
 * function MyComponent() {
 *   const getPresignedUrl = async (params) => {
 *     const result = await trpc.storage.getUploadPresignedUrl.mutate(params);
 *     return result;
 *   };
 *
 *   const upload = useStorageUpload({
 *     bucket: 'products',
 *     generatePath: (file) => `uploads/${Date.now()}-${file.name}`,
 *     getPresignedUrl,
 *     onError: (error) => console.error(error),
 *   });
 *
 *   const handleUpload = async (file: File) => {
 *     const url = await upload.uploadFile(file);
 *     console.log('Uploaded to:', url);
 *   };
 * }
 * ```
 */
export function useStorageUpload({
  bucket,
  generatePath,
  onError,
  onProgress,
  getPresignedUrl,
  supabaseUrl = getDefaultSupabaseUrl()
}: UseStorageUploadOptions) {
  const [isUploading, setIsUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  /**
   * Upload a file to the presigned URL
   */
  const uploadToPresignedUrl = useCallback(
    async (file: File, token: string, path: string) => {
      // Construct the upload URL
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}?token=${token}`

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${errorText}`)
      }

      // Return the public URL
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
    },
    [bucket, supabaseUrl]
  )

  /**
   * Upload a single file
   */
  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true)
      const path = generatePath(file)

      try {
        onProgress?.(file, 0)

        if (!getPresignedUrl) {
          throw new Error('getPresignedUrl function is required for useStorageUpload')
        }

        // Get presigned URL from the server
        const presigned = await getPresignedUrl({ bucket, path })

        if (!presigned) {
          throw new Error('Failed to get presigned URL')
        }

        onProgress?.(file, 50)

        // Upload the file
        const publicUrl = await uploadToPresignedUrl(file, presigned.token, presigned.path)

        onProgress?.(file, 100)
        return publicUrl
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        setErrors((prev) => ({ ...prev, [file.name]: errorMessage }))
        onError?.(error instanceof Error ? error : new Error(errorMessage))
        throw error
      } finally {
        setIsUploading(false)
      }
    },
    [bucket, generatePath, getPresignedUrl, onError, onProgress, uploadToPresignedUrl]
  )

  /**
   * Upload multiple files
   */
  const uploadFiles = useCallback(
    async (files: File[]) => {
      setIsUploading(true)
      const urls: string[] = []

      try {
        for (const file of files) {
          const url = await uploadFile(file)
          urls.push(url)
        }
        return urls
      } finally {
        setIsUploading(false)
      }
    },
    [uploadFile]
  )

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    uploadFile,
    uploadFiles,
    isUploading,
    errors,
    clearErrors
  }
}
