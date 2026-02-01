"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function ImagePreview({ imageDataUrl, detections, onDownload }) {
  const [selectedBoxes, setSelectedBoxes] = useState(new Set());
  const [highlightedBox, setHighlightedBox] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Update image dimensions (use natural dimensions, not rendered)
  const updateDimensions = useCallback(() => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
    }
  }, []);

  // Initialize all boxes as selected when detections change
  useEffect(() => {
    if (detections && detections.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedBoxes(new Set(detections.map((_, idx) => idx)));
    }
  }, [detections]);

  // Update image dimensions when image loads
  useEffect(() => {
    if (imageRef.current?.complete) {
      updateDimensions();
    }
  }, [updateDimensions]);

  const toggleBox = (index) => {
    setSelectedBoxes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (detections) {
      setSelectedBoxes(new Set(detections.map((_, idx) => idx)));
    }
  };

  const deselectAll = () => {
    setSelectedBoxes(new Set());
  };

  const handleDownload = () => {
    if (onDownload) {
      const selectedDetections = detections.filter((_, idx) => selectedBoxes.has(idx));
      onDownload(selectedDetections);
    }
  };

  // Convert normalized 0-1000 coordinates to percentage-based positioning
  // GPT returns coordinates normalized to 0-1000 scale (NOT pixels)
  const getBoundingBoxStyle = (detection) => {
    const { x, y, width, height } = detection.bbox;

    // Convert from 0-1000 normalized scale to percentages (divide by 10)
    return {
      left: `${x / 10}%`,
      top: `${y / 10}%`,
      width: `${width / 10}%`,
      height: `${height / 10}%`,
    };
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return "text-green-400";
    if (confidence >= 0.7) return "text-yellow-400";
    return "text-orange-400";
  };

  const getDetectionKey = (detection) => {
    const bbox = detection?.bbox || {};
    const type = detection?.type ?? "unknown";
    const text = detection?.text ?? detection?.value ?? "";
    const confidence =
      typeof detection?.confidence === "number" ? detection.confidence : "no-confidence";

    return `${type}-${bbox.x ?? 0}-${bbox.y ?? 0}-${bbox.width ?? 0}-${bbox.height ?? 0}-${confidence}-${text}`;
  };

  if (!imageDataUrl) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-zinc-900 rounded-lg border border-zinc-800">
        <p className="text-center text-zinc-500">No image to preview</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-zinc-900 rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-zinc-100">Image Preview</h2>

        {detections && detections.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg transition-colors"
            >
              Deselect All
            </button>
          </div>
        )}
      </div>

      {/* Image Container with Bounding Boxes */}
      <div ref={containerRef} className="relative bg-zinc-800 rounded-lg overflow-hidden mb-4">
        <img
          ref={imageRef}
          src={imageDataUrl}
          alt="Preview"
          className="w-full h-auto"
          onLoad={updateDimensions}
        />

        {/* Bounding Boxes Overlay */}
        {detections && detections.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {detections.map((detection, index) => {
              const isSelected = selectedBoxes.has(index);
              const isHighlighted = highlightedBox === index;
              const detectionKey = getDetectionKey(detection);

              return (
                <button
                  key={detectionKey}
                  type="button"
                  style={getBoundingBoxStyle(detection)}
                  className={`
                    absolute border-2 transition-all pointer-events-auto cursor-pointer
                    ${
                      isSelected
                        ? isHighlighted
                          ? "border-red-400 bg-red-500/30"
                          : "border-red-500 bg-red-500/20"
                        : "border-zinc-600 bg-zinc-700/10"
                    }
                  `}
                  aria-pressed={isSelected}
                  aria-label={`${detection.type} detection`}
                  onClick={() => toggleBox(index)}
                  onMouseEnter={() => setHighlightedBox(index)}
                  onMouseLeave={() => setHighlightedBox(null)}
                >
                  {/* Label */}
                  <div
                    className={`
                      absolute -top-6 left-0 px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap
                      ${isSelected ? "bg-red-500 text-white" : "bg-zinc-700 text-zinc-300"}
                    `}
                  >
                    {detection.type}
                    {detection.confidence && (
                      <span className={`ml-1 ${getConfidenceColor(detection.confidence)}`}>
                        ({Math.round(detection.confidence * 100)}%)
                      </span>
                    )}
                  </div>

                  {/* Checkbox Indicator */}
                  <div className="absolute top-1 right-1">
                    <div
                      className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center
                        ${
                          isSelected
                            ? "bg-red-500 border-red-500"
                            : "bg-zinc-800/50 border-zinc-600"
                        }
                      `}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <title>Selected</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detection List */}
      {detections && detections.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">
            Detected Sensitive Information ({selectedBoxes.size} of {detections.length} selected)
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {detections.map((detection, index) => {
              const isSelected = selectedBoxes.has(index);
              const detectionKey = getDetectionKey(detection);

              return (
                <label
                  key={detectionKey}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                    ${isSelected ? "bg-zinc-800 border border-zinc-700" : "bg-zinc-800/50 border border-transparent"}
                  `}
                  onMouseEnter={() => setHighlightedBox(index)}
                  onMouseLeave={() => setHighlightedBox(null)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleBox(index)}
                    className="w-4 h-4 text-red-600 bg-zinc-700 border-zinc-600 rounded focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-200">{detection.type}</span>
                      {detection.confidence && (
                        <span className={`text-sm ${getConfidenceColor(detection.confidence)}`}>
                          {Math.round(detection.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    {detection.value && (
                      <p className="text-sm text-zinc-400 mt-1">Value: {detection.value}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Download Button */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={!detections || detections.length === 0 || selectedBoxes.size === 0}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
      >
        {selectedBoxes.size === 0
          ? "Select items to redact"
          : `Download Redacted Image (${selectedBoxes.size} ${selectedBoxes.size === 1 ? "item" : "items"})`}
      </button>

      {/* Instructions */}
      <p className="mt-4 text-sm text-zinc-500 text-center">
        Click on bounding boxes or checkboxes to select/deselect items for redaction
      </p>
    </div>
  );
}
