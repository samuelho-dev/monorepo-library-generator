/**
 * Storage Validation Utilities
 *
 * Helper functions for file validation before upload.
 * These are pure functions with no Effect dependencies for maximum reusability.
 *
 * @module @samuelho-dev/infra-storage/validation
 */
import { env } from '@samuelho-dev/env/client'

// ============================================================================
// File Size Validation
// ============================================================================

/**
 * Validate file size against maximum allowed size
 *
 * @param file - The file to validate
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @returns true if file size is within limit
 *
 * @example
 * ```typescript
 * const isValid = validateFileSize(file, 10 * 1024 * 1024) // 10MB limit
 * if (!isValid) {
 *   throw new Error('File too large')
 * }
 * ```
 */
export const validateFileSize = (file: File, maxSizeBytes: number) => file.size <= maxSizeBytes

/**
 * Validate file size with size object
 *
 * @param sizeBytes - The file size in bytes
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @returns true if size is within limit
 */
export const validateFileSizeBytes = (sizeBytes: number, maxSizeBytes: number) =>
  sizeBytes <= maxSizeBytes

// ============================================================================
// MIME Type Validation
// ============================================================================

/**
 * Validate file MIME type against allowed types
 *
 * @param file - The file to validate
 * @param allowedTypes - Array of allowed MIME types (e.g., ['image/jpeg', 'image/png'])
 * @returns true if file type is allowed
 *
 * @example
 * ```typescript
 * const allowedImages = ['image/jpeg', 'image/png', 'image/webp']
 * const isValid = validateMimeType(file, allowedImages)
 * ```
 */
export const validateMimeType = (file: File, allowedTypes: readonly string[]) =>
  allowedTypes.includes(file.type)

/**
 * Validate MIME type string against allowed types
 *
 * @param mimeType - The MIME type string
 * @param allowedTypes - Array of allowed MIME types
 * @returns true if type is allowed
 */
export const validateMimeTypeString = (mimeType: string, allowedTypes: readonly string[]) =>
  allowedTypes.includes(mimeType)

/**
 * Check if MIME type matches a pattern (e.g., 'image/*')
 *
 * @param mimeType - The MIME type to check
 * @param pattern - Pattern with optional wildcard (e.g., 'image/*', 'application/pdf')
 * @returns true if type matches pattern
 */
export const matchesMimePattern = (mimeType: string, pattern: string) => {
  if (pattern === '*/*') return true

  const [patternType, patternSubtype] = pattern.split('/')
  const [fileType, fileSubtype] = mimeType.split('/')

  if (patternSubtype === '*') {
    return patternType === fileType
  }

  return patternType === fileType && patternSubtype === fileSubtype
}

// ============================================================================
// Filename Sanitization
// ============================================================================

/**
 * Sanitize filename to remove unsafe characters
 *
 * Removes or replaces:
 * - Path traversal sequences (../)
 * - Special characters that could cause issues
 * - Leading/trailing whitespace
 * - Multiple consecutive dots/spaces
 *
 * @param filename - The original filename
 * @returns Sanitized filename safe for storage
 *
 * @example
 * ```typescript
 * sanitizeFilename('../../../etc/passwd') // 'etc-passwd'
 * sanitizeFilename('my file (1).jpg')     // 'my-file-1.jpg'
 * sanitizeFilename('image...test.png')    // 'image.test.png'
 * ```
 */
/**
 * Replace control characters (U+0000 to U+001F) with dashes
 * Uses character code comparison to avoid regex control character warnings
 */
const replaceControlChars = (str: string) => {
  let result = ''
  for (const char of str) {
    const code = char.charCodeAt(0)
    // Control characters are 0x00 to 0x1F (0 to 31)
    result += code <= 31 ? '-' : char
  }
  return result
}

export const sanitizeFilename = (filename: string) => {
  return (
    replaceControlChars(filename)
      // Remove path traversal attempts
      .replace(/\.\.\//g, '')
      .replace(/\.\./g, '')
      // Replace unsafe characters with dashes
      .replace(/[<>:"/\\|?*]/g, '-')
      // Replace spaces and parentheses with dashes
      .replace(/[\s()[\]{}]/g, '-')
      // Collapse multiple dashes
      .replace(/-+/g, '-')
      // Collapse multiple dots (but keep extension)
      .replace(/\.+/g, '.')
      // Remove leading/trailing dashes and dots
      .replace(/^[-._]+|[-._]+$/g, '') ||
    // Ensure non-empty (fallback to 'file')
    'file'
  )
}

// ============================================================================
// Unique Filename Generation
// ============================================================================

/**
 * Generate a unique filename by appending a timestamp and random suffix
 *
 * @param originalFilename - The original filename
 * @returns Unique filename with timestamp
 *
 * @example
 * ```typescript
 * generateUniqueFilename('photo.jpg')
 * // Returns: 'photo-1704067200000-a1b2c3.jpg'
 * ```
 */
export const generateUniqueFilename = (originalFilename: string) => {
  const sanitized = sanitizeFilename(originalFilename)
  const lastDotIndex = sanitized.lastIndexOf('.')

  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)

  if (lastDotIndex === -1) {
    // No extension
    return `${sanitized}-${timestamp}-${randomSuffix}`
  }

  const name = sanitized.substring(0, lastDotIndex)
  const extension = sanitized.substring(lastDotIndex)

  return `${name}-${timestamp}-${randomSuffix}${extension}`
}

/**
 * Generate a unique filename with UUID prefix
 *
 * @param originalFilename - The original filename
 * @returns Unique filename with UUID
 *
 * @example
 * ```typescript
 * generateUuidFilename('photo.jpg')
 * // Returns: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890-photo.jpg'
 * ```
 */
export const generateUuidFilename = (originalFilename: string) => {
  const sanitized = sanitizeFilename(originalFilename)
  const uuid = crypto.randomUUID()
  return `${uuid}-${sanitized}`
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Extract file extension from filename
 *
 * @param filename - The filename
 * @returns Lowercase extension without dot, or empty string
 *
 * @example
 * ```typescript
 * getFileExtension('photo.JPG')  // 'jpg'
 * getFileExtension('document')   // ''
 * ```
 */
export const getFileExtension = (filename: string) => {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return ''
  }
  return filename.substring(lastDotIndex + 1).toLowerCase()
}

/**
 * Get filename without extension
 *
 * @param filename - The filename
 * @returns Filename without extension
 */
export const getBasename = (filename: string) => {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1) {
    return filename
  }
  return filename.substring(0, lastDotIndex)
}

/**
 * Join path segments safely
 *
 * @param segments - Path segments to join
 * @returns Joined path with forward slashes
 */
export const joinStoragePath = (...segments: string[]) => {
  return segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
    .filter((segment) => segment.length > 0)
    .join('/')
}

// ============================================================================
// Common MIME Type Sets
// ============================================================================

/**
 * Common image MIME types.
 *
 * `image/svg+xml` is intentionally excluded — SVG is XML and can carry
 * `<script>` elements + event handlers (`onload`, `onclick`, ...). Multiple
 * 2026 CVEs across Statamic, Langflow, FluentCMS, phpMyFAQ followed the
 * same pattern: accept SVG → serve as image/svg+xml → cookie-stealing XSS
 * for every visitor of the page that renders the image. Threat-model.md
 * §3.5 P0. Sellers who need vector graphics should export to PNG/WebP.
 */
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif'
] as const

/**
 * Common document MIME types
 */
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
] as const

/**
 * Common video MIME types
 */
export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo'
] as const

/**
 * Common audio MIME types
 */
export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/flac'
] as const

/**
 * Archive MIME types
 */
export const ARCHIVE_MIME_TYPES = [
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip'
] as const

// ============================================================================
// Size Constants
// ============================================================================

/**
 * Common file size limits in bytes
 */
export const FILE_SIZE_LIMITS = {
  /** 1 MB */
  MB_1: 1 * 1024 * 1024,
  /** 5 MB */
  MB_5: 5 * 1024 * 1024,
  /** 10 MB */
  MB_10: 10 * 1024 * 1024,
  /** 25 MB */
  MB_25: 25 * 1024 * 1024,
  /** 50 MB */
  MB_50: 50 * 1024 * 1024,
  /** 100 MB */
  MB_100: 100 * 1024 * 1024,
  /** 500 MB */
  MB_500: 500 * 1024 * 1024,
  /** 1 GB */
  GB_1: 1 * 1024 * 1024 * 1024
} as const

/**
 * Format bytes to human-readable string
 *
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., '1.5 MB')
 */
export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = Math.max(decimals, 0)
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
}

// ============================================================================
// Public URL Helper
// ============================================================================

/**
 * Get a public URL for a file stored in Supabase storage
 *
 * This is a pure synchronous function that constructs the URL directly
 * without requiring the Effect service. Useful in React Server Components
 * and other contexts where Effect isn't available.
 *
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @returns Public URL string
 *
 * @example
 * ```typescript
 * import { getPublicUrl } from '@samuelho-dev/infra-storage';
 *
 * const imageUrl = getPublicUrl('product-images', 'my-product/hero.jpg');
 * // Returns: 'https://<SUPABASE_URL>/storage/v1/object/public/product-images/my-product/hero.jpg'
 * ```
 */
export const getPublicUrl = (bucket: string, path: string) => {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return ''
  }
  // Handle empty path gracefully
  if (!path) {
    return ''
  }
  // If `path` is already an absolute URL (http(s)://, data:), return as-is.
  // Lets callers store either a storage-relative path OR an external image
  // URL (seed fixtures, future CDN-hosted assets) on the same column.
  if (/^(https?:|data:)/i.test(path)) {
    return path
  }
  // Construct the Supabase storage public URL
  // Format: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`
}
