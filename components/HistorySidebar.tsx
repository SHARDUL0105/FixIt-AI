import React from 'react';
import { FixItResponse } from '../types';
import { IconWrench, IconClose } from './Icons';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: FixItResponse[];
  onSelect: (item: FixItResponse) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onClose, history, onSelect }) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <IconWrench className="w-5 h-5 text-cyan-600" />
            Repair History
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-64px)] p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center text-slate-400 dark:text-slate-600 py-10">
              <p>No repairs yet.</p>
              <p className="text-sm mt-1">Upload a photo to start.</p>
            </div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-200 dark:hover:border-cyan-800 transition-all group"
              >
                <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 truncate">
                  {item.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {new Date(item.timestamp || Date.now()).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;
