/**
 * Image Compressor
 *
 * Compresses images to fit within OpenAI's API limits (~10MB for vision).
 * Uses canvas-based compression with quality adjustment to meet target size.
 */

/**
 * Compress an image file to fit within size constraints
 *
 * @param {File} file - Image file to compress
 * @param {number} maxSizeMB - Maximum size in megabytes (default 5MB for safety margin)
 * @param {number} maxDimension - Maximum width/height in pixels (default 4000)
 * @returns {Promise<string>} Base64 data URL of compressed image
 */
export async function compressImage(file, maxSizeMB = 5, maxDimension = 4000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Create canvas for compression
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          // Scale down if image is too large
          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Binary search for optimal quality
          let quality = 0.9;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          const maxBytes = maxSizeMB * 1024 * 1024 * 1.37; // Base64 overhead

          // Reduce quality until size is acceptable
          let iterations = 0;
          while (dataUrl.length > maxBytes && quality > 0.1 && iterations < 10) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
            iterations++;
          }

          if (dataUrl.length > maxBytes) {
            // Still too large, try reducing dimensions
            const scaleFactor = Math.sqrt(maxBytes / dataUrl.length);
            canvas.width = Math.floor(width * scaleFactor);
            canvas.height = Math.floor(height * scaleFactor);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          }

          resolve({ dataUrl, width, height });
        } catch (error) {
          reject(new Error(`Compression failed: ${error.message}`));
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions from a data URL
 */
export async function getDataUrlDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      reject(new Error("Failed to load image from data URL"));
    };

    img.src = dataUrl;
  });
}

/**
 * Get image dimensions without loading full image
 */
export async function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Estimate compressed size (rough approximation)
 */
export function estimateCompressedSize(width, height, quality = 0.8) {
  // JPEG typically compresses to ~10-30% of raw size depending on content
  const rawSize = width * height * 3; // RGB
  const compressionRatio = 0.15 * quality; // Rough estimate
  return rawSize * compressionRatio;
}

/**
 * Check if file needs compression
 */
export async function needsCompression(file, maxSizeMB = 5) {
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxBytes) {
    return { needed: true, reason: "File size exceeds limit" };
  }

  try {
    const { width, height } = await getImageDimensions(file);
    if (width > 4000 || height > 4000) {
      return { needed: true, reason: "Image dimensions exceed limit" };
    }
  } catch (error) {
    // If we can't check dimensions, compress to be safe
    return { needed: true, reason: "Unable to verify dimensions" };
  }

  return { needed: false };
}
