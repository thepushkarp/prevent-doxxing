"use client";

import {
  clearApiKey,
  getApiKey,
  hasApiKey,
  maskApiKey,
  saveApiKey,
  saveSessionApiKey,
  validateApiKey,
} from "@/lib/apiKeyManager";
import { useEffect, useState } from "react";

export default function APIKeyManager({ onKeyValidated }) {
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [savedKey, setSavedKey] = useState("");

  // Check for existing saved key on mount
  useEffect(() => {
    const existingKey = getApiKey();
    if (existingKey) {
      setSavedKey(existingKey);
      setValidationSuccess(true);
      if (onKeyValidated) {
        onKeyValidated(existingKey);
      }
    }
  }, [onKeyValidated]);

  const handleValidate = async () => {
    setValidationError("");
    setValidationSuccess(false);
    setIsValidating(true);

    try {
      const result = await validateApiKey(apiKey);

      if (result.valid) {
        setValidationSuccess(true);
        setValidationError("");
      } else {
        setValidationError(result.error || "Validation failed");
      }
    } catch (error) {
      setValidationError("An unexpected error occurred");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    if (!validationSuccess) {
      setValidationError("Please validate the API key first");
      return;
    }

    if (rememberMe) {
      saveApiKey(apiKey);
    } else {
      saveSessionApiKey(apiKey);
    }

    setSavedKey(apiKey);
    setApiKey("");

    if (onKeyValidated) {
      onKeyValidated(getApiKey());
    }
  };

  const handleClear = () => {
    clearApiKey();
    setSavedKey("");
    setApiKey("");
    setValidationSuccess(false);
    setValidationError("");

    if (onKeyValidated) {
      onKeyValidated(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && apiKey && !isValidating) {
      handleValidate();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-zinc-900 rounded-lg border border-zinc-800">
      <h2 className="text-xl font-semibold mb-4 text-zinc-100">API Key Configuration</h2>

      {/* Warning Banner */}
      <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>Warning</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm text-yellow-200">
            Your API key is sent directly to OpenAI. We never store it on our servers.
          </p>
        </div>
      </div>

      {savedKey ? (
        // Show saved key state
        <div className="space-y-4">
          <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-200 mb-1">API Key Saved</p>
                <p className="font-mono text-zinc-300">{maskApiKey(savedKey)}</p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Show input state
        <div className="space-y-4">
          {/* API Key Input */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-zinc-300 mb-2">
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="sk-proj-..."
                className="w-full px-4 py-2 pr-24 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
              <p className="text-sm text-red-200">{validationError}</p>
            </div>
          )}

          {/* Validation Success */}
          {validationSuccess && (
            <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
              <p className="text-sm text-green-200">API key is valid!</p>
            </div>
          )}

          {/* Storage Options */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-300">Storage Options</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="storage"
                  checked={!rememberMe}
                  onChange={() => setRememberMe(false)}
                  className="w-4 h-4 text-blue-600 bg-zinc-800 border-zinc-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-300">
                  This session only (cleared when browser closes)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="storage"
                  checked={rememberMe}
                  onChange={() => setRememberMe(true)}
                  className="w-4 h-4 text-blue-600 bg-zinc-800 border-zinc-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-300">
                  Remember me (persistent across sessions)
                </span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={!apiKey || isValidating}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {isValidating ? "Validating..." : "Validate"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!validationSuccess}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
