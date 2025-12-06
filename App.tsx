
import React, { useState, useEffect } from 'react';
import { analyzeMedia, detectItems } from './services/geminiService';
import FileUpload from './components/FileUpload';
import ResultDisplay from './components/ResultDisplay';
import HistorySidebar from './components/HistorySidebar';
import ItemSelector from './components/ItemSelector';
import SupportChat from './components/SupportChat';
import { FixItResponse, MediaFile, AppStatus, DetectedItem } from './types';
import { IconWrench, IconMoon, IconSun, IconHistory, IconPlus, IconSparkles } from './components/Icons';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<FixItResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<FixItResponse[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // New state for detection flow
  const [currentMedia, setCurrentMedia] = useState<MediaFile | null>(null);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleFileSelect = (media: MediaFile) => {
    if (!media.base64) return;
    setCurrentMedia(media);
    setStatus(AppStatus.UPLOADED);
    setError(null);
  };

  const handleStartDetection = async () => {
    if (!currentMedia?.base64) return;

    setStatus(AppStatus.DETECTING);
    setError(null);

    try {
      // Step 1: Detect items in the image
      const items = await detectItems(currentMedia.base64, currentMedia.file.type);
      
      if (items.length > 0) {
        setDetectedItems(items);
        setStatus(AppStatus.SELECTING);
      } else {
        // Fallback if no specific items found, just analyze generic
        handleItemSelect(null); 
      }
    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      setError("Failed to identify items in the image. Please try again.");
    }
  };

  const handleItemSelect = async (item: DetectedItem | null) => {
    if (!currentMedia?.base64) return;

    setStatus(AppStatus.ANALYZING);
    
    try {
      // Step 2: Analyze specifically for the selected item
      const focusContext = item ? `${item.name} - ${item.description}` : undefined;
      const analysisResult = await analyzeMedia(currentMedia.base64, currentMedia.file.type, focusContext);
      
      const resultWithMeta: FixItResponse = {
        ...analysisResult,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        imageUrl: currentMedia.previewUrl
      };

      setResult(resultWithMeta);
      setHistory(prev => [resultWithMeta, ...prev]);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      setError("Failed to generate repair guide. Please try again.");
    }
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setResult(null);
    setError(null);
    setCurrentMedia(null);
    setDetectedItems([]);
  };
  
  const handleClearFile = () => {
    setStatus(AppStatus.IDLE);
    setCurrentMedia(null);
    setDetectedItems([]);
  };

  const handleSelectAnother = () => {
    setResult(null);
    setStatus(AppStatus.SELECTING);
  };

  const handleHistorySelect = (item: FixItResponse) => {
    setResult(item);
    setStatus(AppStatus.SUCCESS);
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300 relative">
      
      {/* Support Chatbot */}
      <SupportChat />

      <HistorySidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        history={history} 
        onSelect={handleHistorySelect}
      />

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full lg:hidden"
            >
              <IconHistory className="w-5 h-5" />
            </button>

            <div 
              className="flex items-center gap-2 cursor-pointer group" 
              onClick={handleReset}
            >
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-xl text-white shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
                <IconSparkles className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-slate-800 dark:text-white tracking-tight">FixIt<span className="text-cyan-600">AI</span></span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
             <button 
              onClick={handleReset}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <IconPlus className="w-4 h-4" />
              New Analysis
            </button>

             <button 
              onClick={() => setIsSidebarOpen(true)}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <IconHistory className="w-4 h-4" />
              History
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title={isDarkMode ? "Current: Dark Mode. Switch to Light Mode" : "Current: Light Mode. Switch to Dark Mode"}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <IconSun className="w-5 h-5 text-amber-400 fill-amber-400/20" /> 
              ) : (
                <IconMoon className="w-5 h-5 text-cyan-600 fill-cyan-600/20" />
              )}
            </button>

            <div className="hidden md:block text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              Gemini 2.5
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
        
        {/* Intro Text (only show when idle) */}
        {status === AppStatus.IDLE && (
          <div className="text-center max-w-2xl mx-auto mb-10 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
              Something Broken? <br />
              <span className="text-cyan-600">Let's Fix It.</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload a photo or video of your broken appliance, gadget, or furniture. 
              Our AI will diagnose the problem and give you a step-by-step repair guide.
            </p>
          </div>
        )}

        {/* Upload Section (Visible in IDLE and UPLOADED) */}
        {(status === AppStatus.IDLE || status === AppStatus.UPLOADED) && (
          <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <FileUpload 
              onFileSelect={handleFileSelect} 
              onClear={handleClearFile}
              isLoading={false} 
            />
            
            {status === AppStatus.UPLOADED && (
               <button
                 onClick={handleStartDetection}
                 className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-full text-lg shadow-lg hover:shadow-cyan-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
               >
                 <IconWrench className="w-5 h-5" />
                 Analyze Image
               </button>
            )}
          </div>
        )}

        {/* Loading State: Detecting Items */}
        {status === AppStatus.DETECTING && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <IconWrench className="absolute inset-0 m-auto text-cyan-500 w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Scanning Image...</h3>
            <p className="text-slate-500 dark:text-slate-400">Identifying repairable items</p>
          </div>
        )}

        {/* Item Selection State */}
        {status === AppStatus.SELECTING && currentMedia && (
          <ItemSelector 
            items={detectedItems} 
            onSelect={handleItemSelect} 
            onCancel={handleReset}
            imageUrl={currentMedia.previewUrl}
          />
        )}

        {/* Loading State: Analyzing Repair */}
        {status === AppStatus.ANALYZING && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <IconWrench className="absolute inset-0 m-auto text-cyan-500 w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Analyzing Repair...</h3>
            <p className="text-slate-500 dark:text-slate-400">Generating steps, safety warnings, and tool lists</p>
          </div>
        )}

        {/* Error State */}
        {status === AppStatus.ERROR && (
          <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/30 max-w-md text-center">
            <p className="font-medium">{error}</p>
            <button 
              onClick={handleReset}
              className="mt-2 text-sm underline hover:text-red-800 dark:hover:text-red-300"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results Section */}
        {status === AppStatus.SUCCESS && result && (
          <ResultDisplay 
            data={result} 
            onReset={handleReset} 
            onSelectAnother={detectedItems.length > 0 ? handleSelectAnother : undefined}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-black py-8 text-center text-slate-400 dark:text-slate-600 text-sm border-t border-slate-800 dark:border-slate-900">
        <div className="max-w-6xl mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} FixIt AI. Not professional advice. Always prioritize safety.</p>
        </div>
      </footer>

      {/* Tailwind Custom Animation Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
