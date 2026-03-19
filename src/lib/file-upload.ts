import type { ReferenceImage } from '@/types/studio';

/**
 * Convert file to base64 data URL for storage
 * Note: For production, consider using S3 or similar object storage
 * to avoid storing large amounts of binary data in SQLite
 */
export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Store uploaded reference image metadata
 * Returns a ReferenceImage object with base64-encoded data
 */
export async function storeReferenceImage(file: File): Promise<ReferenceImage> {
  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported');
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit');
  }

  // Convert to base64
  const base64 = await fileToBase64(file);
  const dataUrl = `data:${file.type};base64,${base64}`;

  return {
    url: dataUrl,
    fileName: file.name,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Parse stored reference images from JSON string
 */
export function parseReferenceImages(
  imageJson: string | null
): ReferenceImage[] | null {
  if (!imageJson) return null;
  try {
    return JSON.parse(imageJson) as ReferenceImage[];
  } catch {
    return null;
  }
}

/**
 * Serialize reference images to JSON string
 */
export function serializeReferenceImages(images: ReferenceImage[]): string {
  return JSON.stringify(images);
}
