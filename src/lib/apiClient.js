/**
 * OpenAI API Client
 *
 * Handles direct API calls to OpenAI Responses API with CORS fallback strategy.
 * Uses the new Responses API (/v1/responses) for better multimodal support.
 */

/**
 * Call OpenAI Responses API (preferred for multimodal)
 *
 * @param {Array} input - Array of input objects with role and content
 * @param {string} apiKey - OpenAI API key
 * @param {object} options - Additional options (model, temperature, etc.)
 * @returns {Promise<object>} API response
 */
export async function callOpenAIResponses(input, apiKey, options = {}) {
  const {
    model = "gpt-5.2",
    temperature = 0.7,
    max_output_tokens = 4000,
    store = false, // Don't store responses by default for privacy
    ...otherOptions
  } = options;

  const requestBody = {
    model,
    input,
    temperature,
    max_output_tokens,
    store,
    ...otherOptions,
  };

  // Try direct API call first
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Check if it's a CORS error
    if (error.message.includes("CORS") || error.name === "TypeError") {
      console.warn("CORS blocked, falling back to proxy");
      return await callViaProxyResponses(input, apiKey, options);
    }

    throw error;
  }
}

/**
 * Fallback: Call OpenAI Responses API via Next.js proxy
 */
async function callViaProxyResponses(input, apiKey, options) {
  const response = await fetch("/api/proxy-responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
      apiKey,
      options,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Proxy error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Extract text from Responses API output
 * Handles the output array structure from Responses API
 */
export function extractResponseText(apiResponse) {
  if (!apiResponse || !apiResponse.output) {
    throw new Error("Invalid Responses API response: missing output");
  }

  // Find the message item in output array
  const messageItem = apiResponse.output.find((item) => item.type === "message");
  if (!messageItem) {
    throw new Error("No message found in Responses API output");
  }

  // Find the output_text content
  const textContent = messageItem.content?.find((c) => c.type === "output_text");
  if (!textContent) {
    throw new Error("No text content found in message");
  }

  return textContent.text;
}

/**
 * Parse structured JSON from Responses API output
 * Handles both direct JSON and markdown code blocks
 */
export function parseStructuredResponse(content) {
  if (!content) return null;

  // Try direct JSON parse
  try {
    return JSON.parse(content);
  } catch {
    // Try extracting from markdown code block
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch {
        // Fall through
      }
    }

    // Try finding JSON object in text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through
      }
    }

    return null;
  }
}

/**
 * Create a vision input for Responses API
 *
 * @param {string} imageDataUrl - Base64 data URL of image
 * @param {string} prompt - Text prompt for the image
 * @returns {object} Input object for Responses API
 */
export function createVisionInput(imageDataUrl, prompt) {
  // Validate data URL format
  const match = imageDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data URL");
  }

  return {
    role: "user",
    content: [
      {
        type: "input_text",
        text: prompt,
      },
      {
        type: "input_image",
        image_url: imageDataUrl,
        detail: "auto", // auto, low, or high
      },
    ],
  };
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Don't retry on auth errors
      if (error.message.includes("401") || error.message.includes("Invalid API key")) {
        throw error;
      }

      const delay = baseDelay * 2 ** i;
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
