import imageCompression from 'browser-image-compression'

const DEFAULT_MAX_SIZE_MB = 2
const DEFAULT_MAX_DIMENSION = 2048
// Skip compression for files already small enough to avoid unnecessary CPU work.
const SKIP_THRESHOLD_BYTES = 1.5 * 1024 * 1024

export interface CompressOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
}

/**
 * Compresses an image file for upload. Runs in the browser using a Web Worker.
 * Returns the original file unchanged if:
 * - The file is not an image
 * - The file is already under SKIP_THRESHOLD_BYTES
 * - Compression throws (falls back to original so upload still works)
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file
  }
  if (file.size <= SKIP_THRESHOLD_BYTES) {
    return file
  }

  try {
    return await imageCompression(file, {
      maxSizeMB: options.maxSizeMB ?? DEFAULT_MAX_SIZE_MB,
      maxWidthOrHeight: options.maxWidthOrHeight ?? DEFAULT_MAX_DIMENSION,
      useWebWorker: true,
      // Preserve the original MIME when possible so server-side magic-byte
      // validation still accepts the file.
      fileType: file.type,
    })
  } catch {
    return file
  }
}
