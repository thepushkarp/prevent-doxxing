/**
 * API Key Manager
 *
 * Handles secure client-side storage and validation of OpenAI API keys.
 * Keys are stored in localStorage with clear security warnings to users.
 */

const STORAGE_KEY = "prevent_doxxing_api_key";
const SESSION_KEY = "prevent_doxxing_session_key";

/**
 * Save API key to localStorage (persistent across sessions)
 */
export function saveApiKey(key) {
  if (!key || typeof key !== "string") {
    throw new Error("Invalid API key");
  }
  localStorage.setItem(STORAGE_KEY, key.trim());
}

/**
 * Save API key to sessionStorage (cleared when browser closes)
 */
export function saveSessionApiKey(key) {
  if (!key || typeof key !== "string") {
    throw new Error("Invalid API key");
  }
  sessionStorage.setItem(SESSION_KEY, key.trim());
}

/**
 * Retrieve API key (checks session first, then persistent)
 */
export function getApiKey() {
  const sessionKey = sessionStorage.getItem(SESSION_KEY);
  if (sessionKey) return sessionKey;

  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Check if an API key is currently stored
 */
export function hasApiKey() {
  return !!getApiKey();
}

/**
 * Clear API key from storage
 */
export function clearApiKey() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Validate API key by making a test request to OpenAI
 * Returns { valid: boolean, error?: string }
 */
export async function validateApiKey(key) {
  if (!key || typeof key !== "string") {
    return { valid: false, error: "API key is required" };
  }

  const trimmedKey = key.trim();

  // Basic format check
  if (!trimmedKey.startsWith("sk-")) {
    return { valid: false, error: 'API key must start with "sk-"' };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }
    if (response.status === 401) {
      return { valid: false, error: "Invalid API key" };
    }
    if (response.status === 429) {
      return { valid: false, error: "Rate limited. Please try again later." };
    }
    return { valid: false, error: `Validation failed: ${response.statusText}` };
  } catch (error) {
    // Network error or CORS issue
    return {
      valid: false,
      error: "Unable to validate key. Check your internet connection.",
    };
  }
}

/**
 * Mask API key for display (show only first/last chars)
 */
export function maskApiKey(key) {
  if (!key || key.length < 8) return "••••••••";
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}
