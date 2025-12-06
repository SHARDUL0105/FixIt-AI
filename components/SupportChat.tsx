
import React, { useState, useRef, useEffect } from 'react';
import { IconBot, IconClose, IconSend, IconMessage } from './Icons';
import { ChatMessage } from '../types';
import { getSupportChatResponse } from '../services/geminiService';

const SupportChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hi! I can help you use the FixIt AI app. What can I do for you?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Pass only the history excluding the static welcome message if needed, 
      // but Gemini handles context well.
      const responseText = await getSupportChatResponse(messages, userMsg.text);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting. Please check your internet or try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {/* Chat Window */}
      <div 
        className={`pointer-events-auto bg-white dark:bg-slate-900 w-80 sm:w-96 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 origin-bottom-right mb-4 ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none h-0'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-full backdrop-blur-sm">
               <IconBot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">FixIt Support</h3>
              <p className="text-xs text-cyan-100">AI Assistant</p>
            </div>
          </div>
          <button 
            onClick={toggleChat}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="h-80 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] px-4 py-2.5 text-sm rounded-2xl shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-cyan-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1 border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="How do I use..."
            className="flex-grow bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors shadow-md"
          >
            <IconSend className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className={`pointer-events-auto p-4 rounded-full shadow-lg transition-transform duration-300 hover:scale-105 active:scale-95 flex items-center justify-center ${
          isOpen 
            ? 'bg-slate-800 text-slate-400 rotate-90' 
            : 'bg-cyan-600 text-white animate-bounce-subtle'
        }`}
        aria-label="Open Support Chat"
      >
        {isOpen ? <IconClose className="w-6 h-6" /> : <IconBot className="w-6 h-6" />}
      </button>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default SupportChat;
