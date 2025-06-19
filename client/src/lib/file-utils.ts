/**
 * File Utilities for Database-based File Storage
 */

export interface FileInfo {
  id: number;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a file to the server and get file info
 */
export async function uploadFile(file: File): Promise<FileInfo> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to upload file");
  }

  const result = await response.json();
  return {
    id: result.id,
    filename: result.filename,
    url: result.url,
    size: result.size,
    mimeType: result.mimeType,
  };
}

/**
 * Generates a URL for a file, handling both new file IDs and legacy file paths
 */
export function getFileUrl(fileIdOrPath: string): string {
  console.log("getFileUrl called with:", {
    input: fileIdOrPath,
    type: typeof fileIdOrPath,
    isNumeric: !isNaN(parseInt(fileIdOrPath)),
  });

  if (!fileIdOrPath || typeof fileIdOrPath !== "string") {
    console.log("getFileUrl: Invalid input, returning empty string");
    return "";
  }

  // If it's a file ID (numeric), use the new file endpoint
  if (!isNaN(parseInt(fileIdOrPath))) {
    const url = `/api/files/${fileIdOrPath}`;
    console.log("getFileUrl: File ID detected, returning:", url);
    return url;
  }

  // If it's already a complete URL, use as-is
  if (
    fileIdOrPath.startsWith("http://") ||
    fileIdOrPath.startsWith("https://")
  ) {
    console.log(
      "getFileUrl: Complete URL detected, returning as-is:",
      fileIdOrPath
    );
    return fileIdOrPath;
  }

  // Legacy file path handling
  let filename: string;
  if (fileIdOrPath.includes("/")) {
    // If it has path separators, extract the filename
    filename = fileIdOrPath.split("/").pop() || fileIdOrPath;
  } else {
    // It's already just a filename
    filename = fileIdOrPath;
  }

  const url = `/api/images/${encodeURIComponent(filename)}`;
  console.log("getFileUrl: Legacy path detected, returning:", url);
  return url;
}

/**
 * Get file URL by filename (legacy support)
 */
export function getLegacyFileUrl(filename: string): string {
  return `/api/images/${encodeURIComponent(filename)}`;
}

/**
 * Process image paths to handle both new file IDs and legacy filenames
 */
export function processImagePaths(
  pictures: string[] | null | undefined
): string[] {
  if (!pictures || !Array.isArray(pictures)) {
    return [];
  }

  return pictures
    .filter(Boolean)
    .map((pic) => {
      if (typeof pic === "string") {
        // If it's a number (file ID), use new URL format
        if (!isNaN(parseInt(pic))) {
          return getFileUrl(pic);
        }
        // If it's a filename, use legacy URL format
        return getLegacyFileUrl(pic);
      }
      return "";
    })
    .filter(Boolean);
}

/**
 * Convert file paths to file IDs for storage
 */
export function convertPathsToIds(
  pictures: string[] | null | undefined
): string[] {
  if (!pictures || !Array.isArray(pictures)) {
    return [];
  }

  return pictures
    .filter(Boolean)
    .map((pic) => {
      if (typeof pic === "string") {
        // If it's already a number (file ID), return as is
        if (!isNaN(parseInt(pic))) {
          return pic;
        }
        // If it's a URL, extract the ID
        const match = pic.match(/\/api\/files\/(\d+)/);
        if (match) {
          return match[1];
        }
        // If it's a legacy path, we'll need to handle this during migration
        return pic;
      }
      return "";
    })
    .filter(Boolean);
}

/**
 * Create a preview URL for a file
 */
export function createPreviewUrl(file: File | FileInfo): string {
  if (file instanceof File) {
    return URL.createObjectURL(file);
  }

  if ("url" in file) {
    return file.url;
  }

  return "";
}

/**
 * Clean up object URLs to prevent memory leaks
 */
export function revokePreviewUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File | FileInfo): boolean {
  if (file instanceof File) {
    return file.type.startsWith("image/");
  }

  if ("mimeType" in file) {
    return file.mimeType.startsWith("image/");
  }

  return false;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 4 * 1024 * 1024, // 4MB default
    allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ],
    allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${formatFileSize(maxSize)}`,
    };
  }

  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  // Check file extension
  const extension = getFileExtension(file.name);
  if (
    allowedExtensions.length > 0 &&
    !allowedExtensions.includes(`.${extension}`)
  ) {
    return {
      valid: false,
      error: `File extension .${extension} is not allowed`,
    };
  }

  return { valid: true };
}
