import { put, del } from "@vercel/blob";

const USE_VERCEL_BLOB = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL;

/**
 * Save an image buffer to storage.
 * Uses Vercel Blob in production, local filesystem in development.
 */
export async function saveImage(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  if (USE_VERCEL_BLOB) {
    const blob = await put(`images/${safeFilename}`, buffer, {
      access: "public",
      contentType: "image/png",
    });
    return blob.url;
  }

  // Local fallback for development
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.resolve(process.cwd(), "public/uploads/images");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, safeFilename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/images/${safeFilename}`;
}

/**
 * Get the public URL for a stored image.
 */
export function getImageUrl(filePath: string): string {
  // Vercel Blob URLs are already absolute
  if (filePath.startsWith("http")) return filePath;
  if (filePath.startsWith("/")) return filePath;
  return `/${filePath}`;
}

/**
 * Delete an image from storage.
 */
export async function deleteImage(filePath: string): Promise<void> {
  if (filePath.startsWith("http") && USE_VERCEL_BLOB) {
    try {
      await del(filePath);
    } catch {
      // Ignore deletion errors
    }
    return;
  }

  const fs = await import("fs/promises");
  const path = await import("path");
  const fullPath = path.resolve(process.cwd(), "public", filePath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }
}
