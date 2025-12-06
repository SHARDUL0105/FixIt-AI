import React, { useCallback, useState, useEffect, useRef } from 'react';
import { IconUpload, IconCamera, IconPlay, IconClose } from './Icons';
import { MediaFile } from '../types';

interface FileUploadProps {
  onFileSelect: (file: MediaFile) => void;
  onClear?: () => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onClear, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file) return;

    // Validate size (limit to 20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert("File size too large. Please upload files smaller than 20MB.");
      return;
    }

    const fileType = file.type.startsWith('video') ? 'video' : 'image';
    const reader = new FileReader();

    reader.onload = (e) => {
      if (e.target?.result) {
        const mediaFile: MediaFile = {
          file,
          previewUrl: URL.createObjectURL(file),
          type: fileType,
          base64: (e.target.result as string).split(',')[1] // Extract just the base64 part
        };
        setPreview(mediaFile);
        onFileSelect(mediaFile);
      }
    };
    reader.readAsDataURL(file);
  }, [onFileSelect]);

  // Handle Paste Event
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isLoading || isCameraOpen) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault(); // Prevent default paste behavior
            handleFile(file);
            break; // Stop after finding the first image
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleFile, isLoading, isCameraOpen]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
            handleFile(file);
            stopCamera();
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setPreview(null);
    if (onClear) onClear();
  };

  // Camera View
  if (isCameraOpen) {
    return (
      <div className="w-full max-w-lg mx-auto relative group">
         <div className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-white dark:border-slate-800 bg-black aspect-video flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover" 
            />
            <div className="absolute bottom-6 flex gap-8 z-20 items-center">
               <button 
                 onClick={stopCamera} 
                 className="bg-slate-800/80 hover:bg-slate-700 text-white px-6 py-2 rounded-full backdrop-blur-sm transition-colors font-medium border border-white/20"
               >
                 Cancel
               </button>
               <button 
                 onClick={capturePhoto} 
                 className="w-16 h-16 rounded-full border-4 border-white bg-red-600 hover:bg-red-700 shadow-lg transition-transform active:scale-95"
                 aria-label="Capture Photo"
               ></button>
            </div>
         </div>
      </div>
    );
  }

  // Preview View
  if (preview) {
    return (
      <div className="w-full max-w-lg mx-auto relative group">
        <div className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-white dark:border-slate-800 bg-slate-900 aspect-video flex items-center justify-center">
          {preview.type === 'image' ? (
            <img 
              src={preview.previewUrl} 
              alt="Preview" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <video 
              src={preview.previewUrl} 
              className="w-full h-full object-contain" 
              controls 
            />
          )}
          
          {isLoading && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white font-medium animate-pulse">Analyzing failure points...</p>
            </div>
          )}
        </div>
        
        {!isLoading && (
          <button 
            onClick={clearFile}
            className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-transform hover:scale-105 z-20"
          >
            <IconClose className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Initial Upload/Empty View
  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        className={`relative group transition-all duration-300 ease-in-out border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center 
          ${dragActive 
            ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-900/20 scale-[1.02]" 
            : "border-slate-300 dark:border-slate-700 hover:border-cyan-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
          }`}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDrop={handleDrop}
      >
        <div className="w-20 h-20 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
           <IconCamera className="w-10 h-10" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Upload Photo or Video
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-xs mx-auto">
          Drag & drop, paste from clipboard <kbd className="font-sans border border-slate-300 dark:border-slate-600 px-1 rounded text-xs bg-slate-50 dark:bg-slate-800">Ctrl+V</kbd>, or click to browse.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto z-20 relative">
          <label className="cursor-pointer bg-slate-900 dark:bg-slate-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shadow-sm flex items-center justify-center gap-2">
            <IconUpload className="w-4 h-4" />
            Browse Files
            <input
              type="file"
              className="hidden"
              onChange={handleChange}
              accept="image/*,video/*"
            />
          </label>
          <span className="hidden sm:block text-slate-300 dark:text-slate-600 self-center">or</span>
          <button 
            onClick={startCamera}
            className="bg-cyan-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-cyan-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <IconCamera className="w-4 h-4" />
            Use Camera
          </button>
        </div>
        
        <div className="mt-8 flex gap-4 opacity-70">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
            <IconPlay className="w-3 h-3" /> MP4 / MOV
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
            <IconCamera className="w-3 h-3" /> JPG / PNG
          </span>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;