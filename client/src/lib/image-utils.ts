/**
 * Utility functions for handling image paths and display
 */

/**
 * Converts a stored image path to the correct API endpoint URL
 * Handles various path formats that might be stored in the database
 */
export function getImageUrl(imagePath: string): string {
  if (!imagePath || typeof imagePath !== 'string') {
    return '';
  }

  // If it's already a complete URL, use as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Extract just the filename from any path format
  let filename: string;
  if (imagePath.includes('/')) {
    // If it has path separators, extract the filename
    filename = imagePath.split('/').pop() || imagePath;
  } else {
    // It's already just a filename
    filename = imagePath;
  }

  // Use the API endpoint for serving images with proper encoding
  return `/api/images/${encodeURIComponent(filename)}`;
}

/**
 * Processes an array of image paths from various possible formats
 * (string, array, JSON string, object) and returns clean array of paths
 */
export function processImagePaths(pictures: any): string[] {
  if (!pictures) {
    return [];
  }

  let picturesToProcess: string[] = [];

  if (typeof pictures === 'string') {
    // Try to parse if it's a JSON string
    try {
      const parsed = JSON.parse(pictures);
      picturesToProcess = Array.isArray(parsed) ? parsed : [pictures];
    } catch (e) {
      // If parsing fails, assume it's a single path
      picturesToProcess = [pictures];
    }
  } else if (Array.isArray(pictures)) {
    picturesToProcess = pictures;
  } else if (pictures && typeof pictures === 'object') {
    // If it's a non-null object but not an array, might be empty object from database
    picturesToProcess = Object.keys(pictures).length > 0 
      ? Object.values(pictures).map(v => String(v))
      : [];
  }

  // Filter out falsy values and empty strings, ensure all are strings
  return picturesToProcess
    .filter(Boolean)
    .filter(p => typeof p === 'string' && p.trim && p.trim() !== '')
    .map(p => String(p));
}

/**
 * Creates a data URI for a placeholder image when real images fail to load
 */
export function getPlaceholderImageUrl(): string {
  return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
}