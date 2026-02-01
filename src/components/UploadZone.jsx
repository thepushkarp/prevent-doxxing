'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { compressImage, getImageDimensions, needsCompression } from '@/lib/imageCompressor';

export default function UploadZone({ onImageProcessed }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState('');

  const processFile = useCallback(async (file) => {
    setError('');
    setIsCompressing(true);

    try {
      // Get image dimensions
      const dimensions = await getImageDimensions(file);

      // Check if compression is needed
      const compressionCheck = await needsCompression(file);

      let processedDataUrl;
      let finalSize = file.size;

      if (compressionCheck.needed) {
        // Compress the image
        processedDataUrl = await compressImage(file);
        // Estimate compressed size from data URL length
        finalSize = Math.round((processedDataUrl.length * 3) / 4);
      } else {
        // Use original file
        processedDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      // Set file info
      setFileInfo({
        name: file.name,
        originalSize: file.size,
        size: finalSize,
        width: dimensions.width,
        height: dimensions.height,
        wasCompressed: compressionCheck.needed,
      });

      setUploadedFile(file);
      setPreviewUrl(processedDataUrl);

      // Notify parent component
      if (onImageProcessed) {
        onImageProcessed({
          file,
          dataUrl: processedDataUrl,
          info: {
            name: file.name,
            size: finalSize,
            width: dimensions.width,
            height: dimensions.height,
          },
        });
      }
    } catch (err) {
      setError(`Failed to process image: ${err.message}`);
      console.error('Image processing error:', err);
    } finally {
      setIsCompressing(false);
    }
  }, [onImageProcessed]);

  const onDrop = useCallback(
    async (acceptedFiles, rejectedFiles) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === 'file-invalid-type') {
          setError('Please upload a PNG or JPEG image');
        } else if (rejection.errors[0]?.code === 'file-too-large') {
          setError('File is too large (max 20MB)');
        } else {
          setError('Invalid file. Please try another image.');
        }
        return;
      }

      // Process the first accepted file
      if (acceptedFiles.length > 0) {
        await processFile(acceptedFiles[0]);
      }
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB max
    multiple: false,
  });

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleChangeFile = () => {
    setUploadedFile(null);
    setFileInfo(null);
    setPreviewUrl(null);
    setError('');
  };

  if (uploadedFile && previewUrl) {
    // Show uploaded file info
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-zinc-900 rounded-lg border border-zinc-800">
        <h2 className="text-xl font-semibold mb-4 text-zinc-100">Uploaded Image</h2>

        <div className="space-y-4">
          {/* Preview Thumbnail */}
          <div className="relative w-full aspect-video bg-zinc-800 rounded-lg overflow-hidden">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          </div>

          {/* File Information */}
          <div className="p-4 bg-zinc-800 rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-300 mb-1">File Name</p>
                <p className="text-zinc-100 truncate">{fileInfo.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-1">Size</p>
                <p className="text-zinc-100">
                  {formatFileSize(fileInfo.size)}
                  {fileInfo.wasCompressed && (
                    <span className="ml-2 text-xs text-green-400">
                      (compressed from {formatFileSize(fileInfo.originalSize)})
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-zinc-300 mb-1">Dimensions</p>
                <p className="text-zinc-100">
                  {fileInfo.width} × {fileInfo.height}
                </p>
              </div>
            </div>
          </div>

          {/* Change File Button */}
          <button
            onClick={handleChangeFile}
            className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg transition-colors font-medium"
          >
            Change File
          </button>
        </div>
      </div>
    );
  }

  // Show upload zone
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          relative p-12 border-2 border-dashed rounded-lg cursor-pointer transition-all
          ${isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800'
          }
          ${isCompressing ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {isCompressing ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-zinc-300 font-medium">Processing image...</p>
              <p className="text-sm text-zinc-500">Compressing and optimizing</p>
            </>
          ) : (
            <>
              {/* Upload Icon */}
              <svg
                className="w-16 h-16 text-zinc-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>

              {isDragActive ? (
                <p className="text-lg font-medium text-blue-400">Drop your image here</p>
              ) : (
                <>
                  <div>
                    <p className="text-lg font-medium text-zinc-300 mb-2">
                      Drag and drop your image here
                    </p>
                    <p className="text-sm text-zinc-500">or click to browse</p>
                  </div>
                </>
              )}

              <div className="pt-4 text-xs text-zinc-500 space-y-1">
                <p>Supported formats: PNG, JPEG, JPG</p>
                <p>Maximum size: 20MB</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}
    </div>
  );
}
