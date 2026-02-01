/**
 * Sensitive Information Detection
 *
 * Uses OpenAI Vision API to detect PII and sensitive information in images.
 */

import {
  callOpenAIResponses,
  createVisionInput,
  extractResponseText,
  parseStructuredResponse,
  retryWithBackoff,
} from "./apiClient.js";

/**
 * Detection prompt for Vision AI
 * Instructs the model to identify all types of sensitive information
 * and return precise bounding box coordinates
 */
const DETECTION_PROMPT = `You are a privacy protection assistant. Analyze this image and detect ALL instances of sensitive personal information (PII).

**CRITICAL - COORDINATE SYSTEM**: Return bounding box coordinates NORMALIZED to a 0-1000 scale:
- x=0 means left edge, x=1000 means right edge
- y=0 means top edge, y=1000 means bottom edge
- width and height are also on 0-1000 scale relative to image dimensions

Detect the following types of sensitive information:

**Text-based PII:**
- Social Security Numbers (SSN, format: XXX-XX-XXXX)
- Aadhar numbers (12-digit Indian ID)
- PAN numbers (Indian tax ID)
- Passport numbers
- Phone numbers (all formats, including international)
- Email addresses
- Physical addresses (street, city, state, zip)
- Names (full names, first/last names)
- Date of Birth (DOB, any format)
- Gender indicators
- Race/ethnicity information

**Visual PII:**
- Human faces (any face visible in the image)
- License plate numbers (car/vehicle plates)
- House numbers (visible on buildings)
- Any text within the image containing the above PII types

For EACH detection, provide:
1. **type**: Category of PII (e.g., "ssn", "phone", "email", "address", "name", "dob", "face", "license_plate", "house_number")
2. **text**: The actual text detected (for text-based PII) or description (for visual PII like "face" or "license_plate")
3. **bbox**: Bounding box in NORMALIZED 0-1000 coordinates:
   - x: Distance from left edge (0-1000)
   - y: Distance from top edge (0-1000)
   - width: Width of box (0-1000)
   - height: Height of box (0-1000)
4. **confidence**: Your confidence level (0.0 to 1.0)

**Critical Instructions:**
- Be thorough: detect EVERY instance, even partially visible ones
- ALL coordinates must be normalized to 0-1000 scale (NOT pixels)
- For faces: draw tight boxes around the entire face
- For text: draw boxes around the complete text element
- For license plates: include the entire plate in the box
- If multiple items of the same type exist, return separate detections for each

Return ONLY valid JSON in this exact format:
{
  "detections": [
    {
      "type": "ssn",
      "text": "123-45-6789",
      "bbox": {"x": 100, "y": 200, "width": 150, "height": 30},
      "confidence": 0.95
    },
    {
      "type": "face",
      "text": "Person's face",
      "bbox": {"x": 500, "y": 300, "width": 200, "height": 250},
      "confidence": 0.98
    }
  ]
}

If NO sensitive information is found, return:
{
  "detections": []
}`;

/**
 * Detect sensitive information in an image
 *
 * @param {string} imageDataUrl - Base64 data URL of the image (data:image/...;base64,...)
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Array>} Array of detection objects with type, text, bbox, confidence
 * @throws {Error} If API call fails or response is invalid
 */
export async function detectSensitiveInfo(imageDataUrl, apiKey) {
  // Validate inputs
  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    throw new Error("Invalid image data URL provided");
  }

  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("OpenAI API key is required");
  }

  // Validate data URL format
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new Error('Image data URL must start with "data:image/"');
  }

  try {
    // Create vision input for Responses API
    const input = createVisionInput(imageDataUrl, DETECTION_PROMPT);

    // Call OpenAI Responses API with retry logic
    const response = await retryWithBackoff(
      async () => {
        return await callOpenAIResponses([input], apiKey, {
          model: "gpt-5.2",
          temperature: 1,
          reasoning: { effort: "medium" }, // Nested object for reasoning effort
          max_output_tokens: 4000,
          text: { format: { type: "json_object" } }, // Responses API text format - format must be an object with type field
          store: false, // Don't store for privacy
        });
      },
      3, // Max 3 retries
      1000, // 1 second base delay
    );

    // Extract text from Responses API output structure
    const content = extractResponseText(response);
    if (!content) {
      throw new Error("Invalid response from OpenAI API: no content in output");
    }

    // Parse the structured JSON response
    const parsed = parseStructuredResponse(content);
    if (!parsed) {
      throw new Error("Failed to parse JSON response from OpenAI");
    }

    // Validate response structure
    if (!parsed.detections || !Array.isArray(parsed.detections)) {
      throw new Error('Invalid detection response: missing or invalid "detections" array');
    }

    // Validate each detection object
    const validDetections = parsed.detections.filter((detection) => {
      // Check required fields
      if (!detection.type || !detection.bbox) {
        console.warn("Skipping invalid detection: missing type or bbox", detection);
        return false;
      }

      // Validate bbox structure
      const { bbox } = detection;
      if (
        typeof bbox.x !== "number" ||
        typeof bbox.y !== "number" ||
        typeof bbox.width !== "number" ||
        typeof bbox.height !== "number"
      ) {
        console.warn("Skipping invalid detection: invalid bbox format", detection);
        return false;
      }

      // Validate bbox values are non-negative
      if (bbox.x < 0 || bbox.y < 0 || bbox.width <= 0 || bbox.height <= 0) {
        console.warn("Skipping invalid detection: negative or zero bbox values", detection);
        return false;
      }

      return true;
    });

    // Normalize detections (ensure all fields exist with defaults)
    const normalizedDetections = validDetections.map((detection) => ({
      type: detection.type,
      text: detection.text || "",
      bbox: {
        x: Math.round(detection.bbox.x),
        y: Math.round(detection.bbox.y),
        width: Math.round(detection.bbox.width),
        height: Math.round(detection.bbox.height),
      },
      confidence: typeof detection.confidence === "number" ? detection.confidence : 0.5,
    }));

    return normalizedDetections;
  } catch (error) {
    // Enhance error messages for common issues
    if (error.message.includes("Invalid API key")) {
      throw new Error("Invalid OpenAI API key. Please check your API key and try again.");
    }

    if (error.message.includes("401")) {
      throw new Error("Authentication failed. Please verify your OpenAI API key.");
    }

    if (error.message.includes("429")) {
      throw new Error("Rate limit exceeded. Please try again in a few moments.");
    }

    if (error.message.includes("quota")) {
      throw new Error("OpenAI API quota exceeded. Please check your account usage.");
    }

    // Re-throw with context
    throw new Error(`Detection failed: ${error.message}`);
  }
}

/**
 * Get human-readable label for detection type
 *
 * @param {string} type - Detection type code
 * @returns {string} Human-readable label
 */
export function getDetectionLabel(type) {
  const labels = {
    ssn: "Social Security Number",
    aadhar: "Aadhar Number",
    pan: "PAN Number",
    passport: "Passport Number",
    phone: "Phone Number",
    email: "Email Address",
    address: "Physical Address",
    name: "Name",
    dob: "Date of Birth",
    gender: "Gender",
    race: "Race/Ethnicity",
    face: "Face",
    license_plate: "License Plate",
    house_number: "House Number",
  };

  return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Group detections by type
 *
 * @param {Array} detections - Array of detection objects
 * @returns {Object} Detections grouped by type
 */
export function groupDetectionsByType(detections) {
  const grouped = {};

  for (const detection of detections) {
    const { type } = detection;
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(detection);
  }

  return grouped;
}

/**
 * Calculate statistics for detections
 *
 * @param {Array} detections - Array of detection objects
 * @returns {Object} Statistics object with counts and averages
 */
export function getDetectionStats(detections) {
  const total = detections.length;
  const byType = groupDetectionsByType(detections);
  const avgConfidence =
    total > 0 ? detections.reduce((sum, d) => sum + d.confidence, 0) / total : 0;

  return {
    total,
    byType: Object.entries(byType).map(([type, items]) => ({
      type,
      label: getDetectionLabel(type),
      count: items.length,
    })),
    avgConfidence: Math.round(avgConfidence * 100) / 100,
  };
}
