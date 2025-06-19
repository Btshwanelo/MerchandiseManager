/**
 * File Storage Service
 * Handles file uploads, storage in database, and retrieval
 */
import fs from "fs";
import path from "path";
import { db } from "./db";
import {
  base64Images,
  stockTakes,
  competitorMerchandising,
  merchandisingPromotions,
  orders,
} from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import sharp from "sharp";

export interface FileMetadata {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  base64Data: string;
  createdAt: Date;
  createdBy?: number;
}

export interface FileUploadResult {
  id: number;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

/**
 * Convert file buffer to base64
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

/**
 * Convert base64 to buffer
 */
export function base64ToBuffer(base64Data: string): Buffer {
  return Buffer.from(base64Data, "base64");
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  return `${timestamp}-${random}-${name}${ext}`;
}

/**
 * Store file in database
 */
export async function storeFile(
  buffer: Buffer,
  originalName: string,
  createdBy?: number
): Promise<FileUploadResult> {
  const filename = generateUniqueFilename(originalName);
  const mimeType = getMimeType(originalName);
  let base64Data: string;
  let size: number;
  let processedBuffer = buffer;

  // Only compress images (jpeg, png, webp, gif)
  if (
    [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ].includes(mimeType)
  ) {
    try {
      let sharpInstance = sharp(buffer);
      if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
        sharpInstance = sharpInstance.jpeg({ quality: 80 });
      } else if (mimeType === "image/png") {
        sharpInstance = sharpInstance.png({ compressionLevel: 8 });
      } else if (mimeType === "image/webp") {
        sharpInstance = sharpInstance.webp({ quality: 80 });
      } // gif: sharp can read but not write, so keep as is
      processedBuffer = await sharpInstance.toBuffer();
    } catch (err) {
      console.error("Image compression failed, storing original:", err);
      processedBuffer = buffer;
    }
  }

  base64Data = bufferToBase64(processedBuffer);
  size = processedBuffer.length;

  const [result] = await db
    .insert(base64Images)
    .values({
      filename,
      mimeType,
      base64Data,
      size,
      createdBy,
    })
    .returning();

  return {
    id: result.id,
    filename: result.filename,
    url: `/api/files/${result.id}`,
    size: result.size,
    mimeType: result.mimeType,
  };
}

/**
 * Get file by ID
 */
export async function getFile(id: number): Promise<FileMetadata | null> {
  const [file] = await db
    .select()
    .from(base64Images)
    .where(eq(base64Images.id, id));
  return file || null;
}

/**
 * Get file by filename
 */
export async function getFileByFilename(
  filename: string
): Promise<FileMetadata | null> {
  const [file] = await db
    .select()
    .from(base64Images)
    .where(eq(base64Images.filename, filename));
  return file || null;
}

/**
 * Delete file by ID
 */
export async function deleteFile(id: number): Promise<boolean> {
  try {
    await db.delete(base64Images).where(eq(base64Images.id, id));
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
}

/**
 * Update file references in database tables
 * This migrates from file paths to file IDs
 */
export async function updateFileReferences(): Promise<{
  stockTakes: number;
  competitorMerchandising: number;
  merchandisingPromotions: number;
  orders: number;
}> {
  let stockTakesUpdated = 0;
  let competitorMerchandisingUpdated = 0;
  let merchandisingPromotionsUpdated = 0;
  let ordersUpdated = 0;

  // Update stock takes
  const stockTakesData = await db.select().from(stockTakes);
  for (const stockTake of stockTakesData) {
    if (stockTake.pictures && Array.isArray(stockTake.pictures)) {
      const newPictureIds: number[] = [];

      for (const picturePath of stockTake.pictures) {
        if (typeof picturePath === "string") {
          // Extract filename from path
          const filename = path.basename(picturePath);
          const file = await getFileByFilename(filename);
          if (file) {
            newPictureIds.push(file.id);
          }
        }
      }

      if (newPictureIds.length > 0) {
        await db
          .update(stockTakes)
          .set({ pictures: newPictureIds.map((id) => id.toString()) })
          .where(eq(stockTakes.id, stockTake.id));
        stockTakesUpdated++;
      }
    }
  }

  // Update competitor merchandising
  const competitorData = await db.select().from(competitorMerchandising);
  for (const competitor of competitorData) {
    if (
      competitor.promotionPictures &&
      Array.isArray(competitor.promotionPictures)
    ) {
      const newPictureIds: number[] = [];

      for (const picturePath of competitor.promotionPictures) {
        if (typeof picturePath === "string") {
          const filename = path.basename(picturePath);
          const file = await getFileByFilename(filename);
          if (file) {
            newPictureIds.push(file.id);
          }
        }
      }

      if (newPictureIds.length > 0) {
        await db
          .update(competitorMerchandising)
          .set({ promotionPictures: newPictureIds.map((id) => id.toString()) })
          .where(eq(competitorMerchandising.id, competitor.id));
        competitorMerchandisingUpdated++;
      }
    }
  }

  // Update merchandising promotions
  const merchandisingData = await db.select().from(merchandisingPromotions);
  for (const promotion of merchandisingData) {
    if (
      promotion.promotionPictures &&
      Array.isArray(promotion.promotionPictures)
    ) {
      const newPictureIds: number[] = [];

      for (const picturePath of promotion.promotionPictures) {
        if (typeof picturePath === "string") {
          const filename = path.basename(picturePath);
          const file = await getFileByFilename(filename);
          if (file) {
            newPictureIds.push(file.id);
          }
        }
      }

      if (newPictureIds.length > 0) {
        await db
          .update(merchandisingPromotions)
          .set({ promotionPictures: newPictureIds.map((id) => id.toString()) })
          .where(eq(merchandisingPromotions.id, promotion.id));
        merchandisingPromotionsUpdated++;
      }
    }
  }

  // Update orders
  const ordersData = await db.select().from(orders);
  for (const order of ordersData) {
    if (order.pictures && Array.isArray(order.pictures)) {
      const newPictureIds: number[] = [];

      for (const picturePath of order.pictures) {
        if (typeof picturePath === "string") {
          const filename = path.basename(picturePath);
          const file = await getFileByFilename(filename);
          if (file) {
            newPictureIds.push(file.id);
          }
        }
      }

      if (newPictureIds.length > 0) {
        await db
          .update(orders)
          .set({ pictures: newPictureIds.map((id) => id.toString()) })
          .where(eq(orders.id, order.id));
        ordersUpdated++;
      }
    }
  }

  return {
    stockTakes: stockTakesUpdated,
    competitorMerchandising: competitorMerchandisingUpdated,
    merchandisingPromotions: merchandisingPromotionsUpdated,
    orders: ordersUpdated,
  };
}

/**
 * Migrate existing files from uploads directory to database
 */
export async function migrateFilesFromUploads(
  uploadsDir: string = "./uploads"
): Promise<{
  migrated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migrated = 0;

  try {
    if (!fs.existsSync(uploadsDir)) {
      throw new Error(`Uploads directory does not exist: ${uploadsDir}`);
    }

    const files = fs.readdirSync(uploadsDir);
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext);
    });

    console.log(`Found ${imageFiles.length} image files to migrate`);

    for (const file of imageFiles) {
      try {
        const filePath = path.join(uploadsDir, file);

        // Check if this file is already stored in the database
        const existing = await getFileByFilename(file);
        if (existing) {
          console.log(`File ${file} already exists in database, skipping`);
          continue;
        }

        // Read file and store in database
        const buffer = fs.readFileSync(filePath);
        await storeFile(buffer, file);
        migrated++;

        console.log(
          `Migrated ${file} to database (${migrated}/${imageFiles.length})`
        );
      } catch (error) {
        const errorMsg = `Failed to migrate ${file}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Migration failed: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
  }

  return { migrated, errors };
}

/**
 * Clean up orphaned files (files in database not referenced by any table)
 */
export async function cleanupOrphanedFiles(): Promise<{
  deleted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Get all file IDs from database
    const allFiles = await db
      .select({ id: base64Images.id })
      .from(base64Images);
    const allFileIds = new Set(allFiles.map((f) => f.id));

    // Get referenced file IDs from all tables
    const referencedIds = new Set<number>();

    // Check stock takes
    const stockTakesData = await db
      .select({ pictures: stockTakes.pictures })
      .from(stockTakes);
    for (const stockTake of stockTakesData) {
      if (stockTake.pictures && Array.isArray(stockTake.pictures)) {
        for (const pictureId of stockTake.pictures) {
          const id = parseInt(pictureId);
          if (!isNaN(id)) referencedIds.add(id);
        }
      }
    }

    // Check competitor merchandising
    const competitorData = await db
      .select({ promotionPictures: competitorMerchandising.promotionPictures })
      .from(competitorMerchandising);
    for (const competitor of competitorData) {
      if (
        competitor.promotionPictures &&
        Array.isArray(competitor.promotionPictures)
      ) {
        for (const pictureId of competitor.promotionPictures) {
          const id = parseInt(pictureId);
          if (!isNaN(id)) referencedIds.add(id);
        }
      }
    }

    // Check merchandising promotions
    const merchandisingData = await db
      .select({ promotionPictures: merchandisingPromotions.promotionPictures })
      .from(merchandisingPromotions);
    for (const promotion of merchandisingData) {
      if (
        promotion.promotionPictures &&
        Array.isArray(promotion.promotionPictures)
      ) {
        for (const pictureId of promotion.promotionPictures) {
          const id = parseInt(pictureId);
          if (!isNaN(id)) referencedIds.add(id);
        }
      }
    }

    // Check orders
    const ordersData = await db
      .select({ pictures: orders.pictures })
      .from(orders);
    for (const order of ordersData) {
      if (order.pictures && Array.isArray(order.pictures)) {
        for (const pictureId of order.pictures) {
          const id = parseInt(pictureId);
          if (!isNaN(id)) referencedIds.add(id);
        }
      }
    }

    // Find orphaned files
    const orphanedIds = Array.from(allFileIds).filter(
      (id) => !referencedIds.has(id)
    );

    console.log(
      `Found ${orphanedIds.length} orphaned files out of ${allFileIds.size} total files`
    );

    // Delete orphaned files
    for (const id of orphanedIds) {
      try {
        await deleteFile(id);
        deleted++;
        console.log(`Deleted orphaned file ID: ${id}`);
      } catch (error) {
        const errorMsg = `Failed to delete orphaned file ${id}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Cleanup failed: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
  }

  return { deleted, errors };
}
