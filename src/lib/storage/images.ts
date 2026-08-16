import * as fs from "fs/promises";
import * as path from "path";

const UPLOAD_DIR = process.env.IMAGE_STORAGE_PATH || "public/uploads/images";

/**
 * Ensure the upload directory exists.
 */
async function ensureDir(): Promise<string> {
  const dir = path.resolve(process.cwd(), UPLOAD_DIR);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Save an image buffer to local storage.
 * Returns the relative file path (suitable for storing in DB).
 */
export async function saveImage(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const dir = await ensureDir();

  // Add timestamp prefix to avoid collisions
  const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = path.join(dir, safeFilename);

  await fs.writeFile(filePath, buffer);

  // Return path relative to public/ for serving
  const relativePath = path.relative(
    path.resolve(process.cwd(), "public"),
    filePath
  );

  return relativePath;
}

/**
 * Get the public URL for a stored image.
 */
export function getImageUrl(filePath: string): string {
  // filePath is relative to public/, so prefix with /
  if (filePath.startsWith("/")) return filePath;
  return `/${filePath}`;
}

/**
 * Delete an image from storage.
 */
export async function deleteImage(filePath: string): Promise<void> {
  const fullPath = path.resolve(process.cwd(), "public", filePath);
  try {
    await fs.unlink(fullPath);
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
