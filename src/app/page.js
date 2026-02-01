"use client";

import APIKeyManager from "@/components/APIKeyManager";
import ImagePreview from "@/components/ImagePreview";
import UploadZone from "@/components/UploadZone";
import { getApiKey } from "@/lib/apiKeyManager";
import { detectSensitiveInfo } from "@/lib/detection";
import { redactImage } from "@/lib/imageRedactor";
import { useCallback, useState } from "react";

/**
 * Prevent Doxxing - Main Application
 *
 * AI-powered privacy protection that detects and redacts sensitive information
 * from images using advanced vision AI.
 *
 * Workflow:
 * 1. API Key Setup → User provides their OpenAI API key
 * 2. Upload → User uploads an image file
 * 3. Detection → AI analyzes image for PII (parallel agents in future phases)
 * 4. Review → User reviews and toggles detections
 * 5. Download → User downloads redacted image
 */
export default function Home() {
  // Application state
  const [apiKey, setApiKey] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [detections, setDetections] = useState([]);
  const [stage, setStage] = useState("api-key"); // api-key | upload | processing | review
  const [error, setError] = useState(null);
  const [processingProgress, setProcessingProgress] = useState("");

  // Handle API key validation
  const handleKeyValidated = useCallback((key) => {
    setApiKey(key);
    setStage("upload");
    setError(null);
  }, []);

  // Handle image upload and processing
  const handleImageProcessed = useCallback(
    async ({ file, dataUrl, info }) => {
      setImageData({ file, dataUrl, info });
      setStage("processing");
      setError(null);
      setProcessingProgress("Analyzing image for sensitive information...");

      try {
        // Get API key (from state or storage)
        const currentApiKey = apiKey || getApiKey();
        if (!currentApiKey) {
          throw new Error("API key not found. Please re-enter your key.");
        }

        // Run detection
        setProcessingProgress("Analyzing with AI vision...");
        const results = await detectSensitiveInfo(
          dataUrl,
          currentApiKey,
          info?.width,
          info?.height,
        );

        if (!results || results.length === 0) {
          setProcessingProgress("No sensitive information detected!");
          setDetections([]);
        } else {
          setProcessingProgress(`Found ${results.length} potential sensitive items`);
          // Add enabled flag to all detections (default true)
          setDetections(results.map((d) => ({ ...d, enabled: true })));
        }

        setStage("review");
      } catch (err) {
        console.error("Detection failed:", err);
        setError(err.message || "Failed to analyze image. Please try again.");
        setStage("upload"); // Go back to upload stage
      }
    },
    [apiKey],
  );

  // Handle detection toggles
  const handleDetectionsChange = useCallback((updatedDetections) => {
    setDetections(updatedDetections);
  }, []);

  // Handle download of redacted image
  const handleDownload = useCallback(
    async (selectedDetections) => {
      if (!imageData?.dataUrl) {
        setError("No image data available");
        return;
      }

      try {
        setProcessingProgress("Generating redacted image...");

        // Create redacted image
        const blob = await redactImage(imageData.dataUrl, selectedDetections);

        // Trigger download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `redacted-${imageData.file.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setProcessingProgress("Download complete!");
        setTimeout(() => setProcessingProgress(""), 2000);
      } catch (err) {
        console.error("Redaction failed:", err);
        setError(err.message || "Failed to create redacted image. Please try again.");
      }
    },
    [imageData],
  );

  // Handle starting over
  const handleReset = useCallback(() => {
    setImageData(null);
    setDetections([]);
    setStage("upload");
    setError(null);
    setProcessingProgress("");
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                Prevent Doxxing
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                AI-powered privacy protection for your documents
              </p>
            </div>
            {stage !== "api-key" && (
              <button
                type="button"
                onClick={() => setStage("api-key")}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Change API Key
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-red-600 dark:text-red-400 mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <title>Error</title>
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <title>Dismiss error</title>
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Stage 1: API Key Setup */}
        {stage === "api-key" && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                Get Started
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Enter your OpenAI API key to begin analyzing images
              </p>
            </div>
            <APIKeyManager onKeyValidated={handleKeyValidated} />

            {/* Info Section */}
            <div className="mt-8 p-6 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                How it works
              </h3>
              <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex gap-3">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">1.</span>
                  <span>Upload an image containing sensitive information</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">2.</span>
                  <span>AI analyzes and detects PII (names, SSNs, faces, etc.)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">3.</span>
                  <span>Review and toggle which items to redact</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">4.</span>
                  <span>Download your privacy-protected image</span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Stage 2: Upload */}
        {stage === "upload" && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                Upload Image
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Select an image to analyze for sensitive information
              </p>
            </div>
            <UploadZone onImageProcessed={handleImageProcessed} />
          </div>
        )}

        {/* Stage 3: Processing */}
        {stage === "processing" && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 mb-6" />
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                Processing...
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">{processingProgress}</p>
            </div>
          </div>
        )}

        {/* Stage 4: Review */}
        {stage === "review" && imageData && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Review Detections
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                  {detections.length === 0
                    ? "No sensitive information detected"
                    : `Found ${detections.length} potential sensitive ${
                        detections.length === 1 ? "item" : "items"
                      }`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Upload New Image
              </button>
            </div>

            <ImagePreview
              imageDataUrl={imageData.dataUrl}
              detections={detections}
              onDetectionsChange={handleDetectionsChange}
              onDownload={handleDownload}
            />

            {processingProgress && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-center text-sm text-green-700 dark:text-green-300">
                {processingProgress}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-16">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            <a
              href="https://github.com/thepushkarp/prevent-doxxing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 dark:text-zinc-100 hover:underline"
            >
              View Source
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
