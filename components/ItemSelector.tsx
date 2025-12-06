
import React from 'react';
import { DetectedItem } from '../types';
import { IconChevronRight, IconWrench } from './Icons';

interface ItemSelectorProps {
  items: DetectedItem[];
  onSelect: (item: DetectedItem) => void;
  onCancel: () => void;
  imageUrl: string;
}

const ItemSelector: React.FC<ItemSelectorProps> = ({ items, onSelect, onCancel, imageUrl }) => {
  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">
          What do you want to <span className="text-cyan-600">fix?</span>
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          We found a few things in your image. Select the one you need help with.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Preview Image */}
        <div className="bg-slate-900 rounded-2xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
          <img src={imageUrl} alt="Uploaded Context" className="w-full h-auto object-cover" />
        </div>

        {/* Selection List */}
        <div className="space-y-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full text-left bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-500 dark:hover:border-cyan-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {item.description}
                  </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/30 transition-colors">
                  <IconChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400" />
                </div>
              </div>
            </button>
          ))}

          <button
            onClick={onCancel}
            className="w-full text-center p-3 text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 text-sm font-medium transition-colors"
          >
            Cancel and try a different photo
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemSelector;
