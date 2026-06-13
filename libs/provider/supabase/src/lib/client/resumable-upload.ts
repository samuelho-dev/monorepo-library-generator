'use client'

/**
 * Resumable (TUS) upload for large files.
 *
 * Supabase Storage implements the TUS protocol at
 * `/storage/v1/upload/resumable`. Resumable upload is the recommended path for
 * files >6MB: it chunks the file (6MB chunks, mandated by Supabase), survives
 * network interruptions by resuming from the last committed offset, and emits
 * real byte-level progress — unlike the single-PUT signed-URL path which has
 * no resume and no genuine progress.
 *
 * Auth is the user's Supabase session access token (NOT a signed-upload
 * token). We read it from the browser client, which `getSupabaseBrowserClient`
 * keeps in sync via `@supabase/ssr` cookies.
 *
 * @module @samuelho-dev/provider-supabase/client/resumable-upload
 */

import { env } from '@samuelho-dev/env/client'
import * as tus from 'tus-js-client'
import { getSupabaseBrowserClient } from './client'

export interface ResumableUploadOptions {
  /** Destination bucket (e.g. STORAGE_BUCKET.products). */
  readonly bucket: string
  /** Object path within the bucket. */
  readonly path: string
  /** File to upload. */
  readonly file: File
  /** Content type; defaults to the File's type or octet-stream. */
  readonly contentType?: string
  /** Overwrite an existing object at `path`. Defaults to false. */
  readonly upsert?: boolean
  /** Byte-level progress callback (0–100). */
  readonly onProgress?: (percentage: number) => void
  /** AbortSignal to cancel the upload. */
  readonly signal?: AbortSignal
}

// Supabase requires a fixed 6MB chunk size for resumable uploads.
const CHUNK_SIZE = 6 * 1024 * 1024

const buildEndpoint = (supabaseUrl: string) =>
  `${supabaseUrl.replace(/\/$/, '')}/storage/v1/upload/resumable`

/**
 * Upload `file` to Supabase Storage via TUS resumable upload.
 *
 * Resolves with the object's storage path on success. Rejects with the
 * underlying tus error on failure (after the configured retry delays are
 * exhausted) or with an AbortError if `signal` fires.
 */
export async function resumableUpload(options: ResumableUploadOptions): Promise<string> {
  const { bucket, path, file, contentType, upsert = false, onProgress, signal } = options

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for resumable uploads')
  }

  const client = getSupabaseBrowserClient()
  const {
    data: { session }
  } = await client.auth.getSession()
  if (!session) {
    throw new Error('No active Supabase session — sign in before uploading')
  }

  return new Promise<string>((resolve, reject) => {
    // tus callbacks (onSuccess/onError) and the abort handler can race — a late
    // onSuccess after an abort, or onError after abort, would settle the promise
    // twice. Guard so the first outcome wins and the rest are no-ops.
    let settled = false
    const succeed = () => {
      if (settled) return
      settled = true
      resolve(path)
    }
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      reject(error)
    }

    const upload = new tus.Upload(file, {
      endpoint: buildEndpoint(supabaseUrl),
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        ...(upsert ? { 'x-upsert': 'true' } : {})
      },
      uploadDataDuringCreation: true,
      // Allow re-uploading the same file in a later session.
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: contentType ?? file.type ?? 'application/octet-stream',
        cacheControl: '3600'
      },
      chunkSize: CHUNK_SIZE,
      onError: (error) => fail(error),
      onProgress: (bytesUploaded, bytesTotal) => {
        if (onProgress && bytesTotal > 0 && !settled) {
          onProgress(Math.round((bytesUploaded / bytesTotal) * 100))
        }
      },
      onSuccess: () => succeed()
    })

    // tus `abort()` returns a promise that can reject if no upload is in
    // flight; we don't care about that outcome, so swallow it.
    const abortQuietly = () => upload.abort().catch(() => undefined)

    if (signal) {
      if (signal.aborted) {
        abortQuietly()
        fail(new DOMException('Upload aborted', 'AbortError'))
        return
      }
      signal.addEventListener(
        'abort',
        () => {
          abortQuietly()
          fail(new DOMException('Upload aborted', 'AbortError'))
        },
        { once: true }
      )
    }

    // Resume a prior interrupted upload of the same file if one exists. A
    // rejection here (storage inaccessible, corrupted fingerprint) must reject
    // the promise — otherwise the await hangs forever.
    upload
      .findPreviousUploads()
      .then((previous) => {
        if (settled) return
        if (previous.length > 0 && previous[0]) {
          upload.resumeFromPreviousUpload(previous[0])
        }
        upload.start()
      })
      .catch((error) => fail(error))
  })
}
