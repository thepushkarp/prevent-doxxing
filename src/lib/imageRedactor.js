/**
 * Image Redactor
 *
 * Draws black boxes over detected sensitive regions in images.
 * Processes detections with bounding boxes and returns redacted image as blob.
 */

/**
 * Redact an image by drawing black boxes over detected regions
 *
 * @param {string} imageDataUrl - Base64 data URL of the image
 * @param {Array} detections - Array of detection objects with bbox and enabled properties
 * @returns {Promise<Blob>} Blob of redacted image (PNG or JPEG)
 *
 * Detection format:
 * {
 *   type: string,
 *   bbox: { x: number, y: number, width: number, height: number },
 *   enabled: boolean,
 *   confidence: number,
 *   agentVotes: number
 * }
 */
export async function redactImage(imageDataUrl, detections) {
  // Validate inputs
  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    throw new Error("Invalid image data URL");
  }

  if (!Array.isArray(detections)) {
    throw new Error("Detections must be an array");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Create canvas matching image dimensions
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Filter to only enabled detections with valid bboxes
        const enabledDetections = detections.filter((d) => {
          if (!d.enabled) return false;
          if (!d.bbox) return false;

          // Validate bbox properties
          const { x, y, width, height } = d.bbox;
          if (
            typeof x !== "number" ||
            typeof y !== "number" ||
            typeof width !== "number" ||
            typeof height !== "number"
          ) {
            console.warn("Invalid bbox properties:", d.bbox);
            return false;
          }

          // Check for negative or zero dimensions
          if (width <= 0 || height <= 0) {
            console.warn("Invalid bbox dimensions:", d.bbox);
            return false;
          }

          return true;
        });

        // Draw black rectangles over enabled detections
        // Coordinates are in normalized 0-1000 scale, convert to actual pixels
        ctx.fillStyle = "black";
        for (const detection of enabledDetections) {
          const { x, y, width, height } = detection.bbox;

          // Convert from 0-1000 normalized scale to actual pixel coordinates
          const pixelX = (x / 1000) * canvas.width;
          const pixelY = (y / 1000) * canvas.height;
          const pixelWidth = (width / 1000) * canvas.width;
          const pixelHeight = (height / 1000) * canvas.height;

          // Clamp coordinates to canvas bounds
          const clampedX = Math.max(0, Math.min(pixelX, canvas.width));
          const clampedY = Math.max(0, Math.min(pixelY, canvas.height));
          const clampedWidth = Math.min(pixelWidth, canvas.width - clampedX);
          const clampedHeight = Math.min(pixelHeight, canvas.height - clampedY);

          // Only draw if there's a valid area to redact
          if (clampedWidth > 0 && clampedHeight > 0) {
            ctx.fillRect(clampedX, clampedY, clampedWidth, clampedHeight);
          }
        }

        // Convert canvas to blob
        // Use PNG for images with transparency, JPEG for photos
        const mimeType = imageDataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";
        const quality = mimeType === "image/jpeg" ? 0.95 : undefined;

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob from canvas"));
            }
          },
          mimeType,
          quality,
        );
      } catch (error) {
        reject(new Error(`Redaction failed: ${error.message}`));
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image from data URL"));
    };

    // Load image from data URL
    img.src = imageDataUrl;
  });
}

/**
 * Validate detection object structure
 *
 * @param {Object} detection - Detection object to validate
 * @returns {boolean} True if detection is valid
 */
export function isValidDetection(detection) {
  if (!detection || typeof detection !== "object") {
    return false;
  }

  // Check required properties
  if (!detection.bbox || typeof detection.bbox !== "object") {
    return false;
  }

  const { x, y, width, height } = detection.bbox;

  // Validate bbox numeric properties
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    return false;
  }

  // Check for NaN or Infinity
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return false;
  }

  // Width and height must be positive
  if (width <= 0 || height <= 0) {
    return false;
  }

  return true;
}

/**
 * Count enabled detections
 *
 * @param {Array} detections - Array of detection objects
 * @returns {number} Number of enabled detections
 */
export function countEnabledDetections(detections) {
  if (!Array.isArray(detections)) {
    return 0;
  }

  return detections.filter((d) => d.enabled && isValidDetection(d)).length;
}

/**
 * Get redaction statistics
 *
 * @param {Array} detections - Array of detection objects
 * @returns {Object} Statistics about detections
 */
export function getRedactionStats(detections) {
  if (!Array.isArray(detections)) {
    return {
      total: 0,
      enabled: 0,
      disabled: 0,
      invalid: 0,
    };
  }

  const stats = {
    total: detections.length,
    enabled: 0,
    disabled: 0,
    invalid: 0,
  };

  for (const detection of detections) {
    if (!isValidDetection(detection)) {
      stats.invalid++;
    } else if (detection.enabled) {
      stats.enabled++;
    } else {
      stats.disabled++;
    }
  }

  return stats;
}

/**
 * Preview redaction by drawing semi-transparent boxes
 * (useful for UI preview before final redaction)
 *
 * @param {string} imageDataUrl - Base64 data URL of the image
 * @param {Array} detections - Array of detection objects
 * @param {number} opacity - Opacity for preview boxes (0-1, default 0.5)
 * @returns {Promise<string>} Data URL of preview image
 */
export async function previewRedaction(imageDataUrl, detections, opacity = 0.5) {
  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    throw new Error("Invalid image data URL");
  }

  if (!Array.isArray(detections)) {
    throw new Error("Detections must be an array");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Draw semi-transparent boxes for enabled detections
        const enabledDetections = detections.filter((d) => d.enabled && isValidDetection(d));

        // Coordinates are in normalized 0-1000 scale, convert to actual pixels
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        for (const detection of enabledDetections) {
          const { x, y, width, height } = detection.bbox;

          // Convert from 0-1000 normalized scale to actual pixel coordinates
          const pixelX = (x / 1000) * canvas.width;
          const pixelY = (y / 1000) * canvas.height;
          const pixelWidth = (width / 1000) * canvas.width;
          const pixelHeight = (height / 1000) * canvas.height;

          const clampedX = Math.max(0, Math.min(pixelX, canvas.width));
          const clampedY = Math.max(0, Math.min(pixelY, canvas.height));
          const clampedWidth = Math.min(pixelWidth, canvas.width - clampedX);
          const clampedHeight = Math.min(pixelHeight, canvas.height - clampedY);

          if (clampedWidth > 0 && clampedHeight > 0) {
            ctx.fillRect(clampedX, clampedY, clampedWidth, clampedHeight);
          }
        }

        // Return as data URL
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(new Error(`Preview failed: ${error.message}`));
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image from data URL"));
    };

    img.src = imageDataUrl;
  });
}
