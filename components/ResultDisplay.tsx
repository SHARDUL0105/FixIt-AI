
import React, { useState, useEffect, useRef } from 'react';
import { FixItResponse, ChatMessage, Annotation } from '../types';
import { IconAlert, IconWrench, IconCheck, IconInfo, IconShield, IconHammer, IconMessage, IconSend, IconPlay, IconList } from './Icons';
import { getChatResponse } from '../services/geminiService';

interface ResultDisplayProps {
  data: FixItResponse;
  onReset: () => void;
  onSelectAnother?: () => void;
}

// Helper to format text with basic markdown and custom highlights
const formatText = (text: string) => {
  if (!text) return null;
  
  // Split by newlines, **bold**, *italics*, and [highlight]
  const parts = text.split(/(\n|\*\*.*?\*\*|\*.*?\*|\[.*?\])/g);

  return parts.map((part, index) => {
    if (part === '\n') {
      return <br key={index} />;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="italic text-slate-300">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('[') && part.endsWith(']')) {
      // Highlight visual cues like [Red Wire]
      return (
        <span key={index} className="inline-block text-cyan-300 font-bold bg-cyan-900/40 px-1.5 py-0.5 rounded text-xs tracking-wide border border-cyan-500/20 mx-0.5">
          {part.slice(1, -1)}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const AnnotatedImage: React.FC<{ imageUrl: string; annotations?: Annotation[] }> = ({ imageUrl, annotations }) => {
  if (!annotations || annotations.length === 0) {
    return (
      <img src={imageUrl} alt="Analyzed" className="w-full h-auto rounded-lg" />
    );
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden group select-none">
      <img src={imageUrl} alt="Analyzed with annotations" className="w-full h-auto block" />
      {annotations.map((ann, idx) => {
        // box_2d is [ymin, xmin, ymax, xmax] normalized to 1000
        const [ymin, xmin, ymax, xmax] = ann.box_2d;
        const top = (ymin / 1000) * 100;
        const left = (xmin / 1000) * 100;
        const height = ((ymax - ymin) / 1000) * 100;
        const width = ((xmax - xmin) / 1000) * 100;

        return (
          <div
            key={idx}
            className="absolute border-2 border-red-500 shadow-[0_0_4px_rgba(255,255,255,0.5)] bg-red-500/10 hover:bg-red-500/20 transition-all cursor-help z-10"
            style={{
              top: `${top}%`,
              left: `${left}%`,
              height: `${height}%`,
              width: `${width}%`
            }}
          >
            {/* Label Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
               <div className="bg-red-600 text-white text-[11px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                 {ann.label}
               </div>
               <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-red-600"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ data, onReset, onSelectAnother }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Reset chat when data changes (e.g. history selection)
  useEffect(() => {
    setChatHistory([]);
    setInput('');
  }, [data.id]);

  const handleSendChat = async () => {
    if (!input.trim() || isChatLoading) return;
    
    const userMsg: ChatMessage = { role: 'user', text: input };
    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsChatLoading(true);

    try {
      const responseText = await getChatResponse(data, chatHistory, userMsg.text);
      setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error answering that." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{data.title}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Diagnosis Complete</p>
        </div>
        
        <div className="flex gap-2 self-start md:self-auto">
          {onSelectAnother && (
            <button
              onClick={onSelectAnother}
              className="px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 rounded-lg transition-colors flex items-center gap-2 border border-cyan-100 dark:border-cyan-900/30"
            >
              <IconList className="w-4 h-4" />
              Other Problems
            </button>
          )}
          <button 
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            New Upload
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Summary, Tools, Safety */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Diagnosis Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
              <IconInfo className="w-5 h-5 text-blue-500" />
              The Problem
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
              {data.problemDescription}
            </p>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Root Cause</h4>
            <p className="text-slate-700 dark:text-slate-200 text-sm font-medium">
              {data.rootCause}
            </p>
          </div>

          {/* Safety Warnings */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border border-amber-100 dark:border-amber-900/30">
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-3">
              <IconShield className="w-5 h-5" />
              Safety First
            </h3>
            <ul className="space-y-2">
              {data.safetyWarnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2 text-amber-900 dark:text-amber-200 text-sm">
                  <IconAlert className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools Needed */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
             <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
              <IconWrench className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              Tools Needed
            </h3>
            <ul className="grid grid-cols-2 gap-2">
              {data.toolsNeeded.map((tool, idx) => (
                <li key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                  <IconHammer className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  {tool}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Steps & Visuals & Chat */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Visual Guide & Annotations */}
          <div className="bg-slate-800 dark:bg-slate-900 text-slate-100 rounded-xl p-6 shadow-md border border-slate-700 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <h3 className="text-lg font-semibold text-white">Visual Analysis</h3>
            </div>
            
            {/* Annotated Image Overlay */}
            {data.imageUrl && (
              <div className="mb-4 bg-black/50 rounded-lg overflow-hidden border border-slate-700">
                <AnnotatedImage imageUrl={data.imageUrl} annotations={data.annotations} />
              </div>
            )}

            <p className="text-slate-400 italic mb-4 text-xs">
              Highlighted areas indicate the primary defects or focus points.
            </p>
            <div className="text-sm leading-relaxed text-slate-200">
              {formatText(data.visualGuide)}
            </div>
          </div>

          {/* Steps */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <IconCheck className="w-6 h-6 text-cyan-500" />
                Repair Steps
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.steps.map((step, idx) => (
                <div key={idx} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-sm">
                      {step.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">
                        {step.instruction}
                      </h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat / Q&A Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-96">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <IconMessage className="w-5 h-5 text-cyan-500" />
                Have questions about this repair?
              </h3>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900" ref={chatContainerRef}>
              {chatHistory.length === 0 ? (
                <div className="text-center text-slate-400 dark:text-slate-600 py-8 text-sm">
                  Ask me anything about the tools, safety, or steps above.
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-cyan-600 text-white rounded-tr-none' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                   <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                   </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Type your question..."
                className="flex-grow bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-600 placeholder-slate-400"
              />
              <button 
                onClick={handleSendChat}
                disabled={!input.trim() || isChatLoading}
                className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
              >
                <IconSend className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;
