/**
 * Base64 Image Conversion and Storage Utilities
 */
import fs from 'fs';
import path from 'path';
import { db } from './db';
import { base64Images } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Convert an image file to base64 string
 */
export async function convertImageToBase64(filePath: string): Promise<{
  base64Data: string;
  mimeType: string;
  size: number;
  filename: string;
}> {
  const buffer = fs.readFileSync(filePath);
  const base64Data = buffer.toString('base64');
  const filename = path.basename(filePath);
  const extension = path.extname(filename).toLowerCase();
  
  // Determine MIME type based on file extension
  let mimeType = 'application/octet-stream';
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      mimeType = 'image/jpeg';
      break;
    case '.png':
      mimeType = 'image/png';
      break;
    case '.gif':
      mimeType = 'image/gif';
      break;
    case '.webp':
      mimeType = 'image/webp';
      break;
    case '.svg':
      mimeType = 'image/svg+xml';
      break;
  }

  return {
    base64Data,
    mimeType,
    size: buffer.length,
    filename
  };
}

/**
 * Store image as base64 in database
 */
export async function storeImageAsBase64(
  filePath: string, 
  createdBy?: number
): Promise<number> {
  const imageData = await convertImageToBase64(filePath);
  
  const [result] = await db.insert(base64Images).values({
    filename: imageData.filename,
    mimeType: imageData.mimeType,
    base64Data: imageData.base64Data,
    size: imageData.size,
    createdBy
  }).returning({ id: base64Images.id });

  return result.id;
}

/**
 * Retrieve base64 image by ID
 */
export async function getBase64ImageById(id: number) {
  const [image] = await db
    .select()
    .from(base64Images)
    .where(eq(base64Images.id, id));
  
  return image;
}

/**
 * Retrieve base64 image by filename
 */
export async function getBase64ImageByFilename(filename: string) {
  const [image] = await db
    .select()
    .from(base64Images)
    .where(eq(base64Images.filename, filename));
  
  return image;
}

/**
 * Convert existing file system images to base64 and store in database
 */
export async function migrateExistingImagesToBase64(uploadsDir: string = './uploads'): Promise<{
  converted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let converted = 0;

  try {
    if (!fs.existsSync(uploadsDir)) {
      throw new Error(`Uploads directory does not exist: ${uploadsDir}`);
    }

    const files = fs.readdirSync(uploadsDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
    });

    console.log(`Found ${imageFiles.length} image files to convert`);

    for (const file of imageFiles) {
      try {
        const filePath = path.join(uploadsDir, file);
        
        // Check if this image is already stored in base64 format
        const existing = await getBase64ImageByFilename(file);
        if (existing) {
          console.log(`Image ${file} already exists in base64 format, skipping`);
          continue;
        }

        await storeImageAsBase64(filePath);
        converted++;
        console.log(`Converted ${file} to base64 (${converted}/${imageFiles.length})`);
      } catch (error) {
        const errorMsg = `Failed to convert ${file}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Migration failed: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
  }

  return { converted, errors };
}

/**
 * Create data URI from base64 image
 */
export function createDataUri(base64Data: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64Data}`;
}