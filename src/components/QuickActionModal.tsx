import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PlusCircle, MinusCircle, Sliders, Users, PackagePlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageId } from '../types';

export function QuickActionModal() {
  const {
    isQuickActionOpen,
    setQuickActionOpen,
    navigateTo,
    hasFullEditAccess,
  } = useApp();

  if (!isQuickActionOpen) return null;

  const handleSelect = (page: PageId) => {
    setQuickActionOpen(false);
    navigateTo(page);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white border-t sm:border border-[#e5e0d5] rounded-t-xl sm:rounded-sm w-full max-w-md p-5 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#e5e0d5]">
          <div>
            <span className="font-mono-fig text-[10px] uppercase tracking-wider text-[#193d2c] font-bold block">
              Quick Entry
            </span>
            <h3 className="font-serif text-lg font-bold text-[#131715]">
              Log to Mess Register
            </h3>
          </div>
          <button
            onClick={() => setQuickActionOpen(false)}
            className="w-8 h-8 rounded-sm flex items-center justify-center text-[#59635e] hover:text-[#131715] active:bg-[#f5f2eb] cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          <button
            onClick={() => handleSelect('log-purchase')}
            className="flex items-center gap-3 p-3 rounded-sm bg-[#fbfaf7] border border-[#e5e0d5] hover:bg-[#f5f2eb] active:scale-[0.99] text-left transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center shrink-0">
              <PlusCircle size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-[#131715]">Log a Purchase</div>
              <div className="text-xs text-[#59635e]">Add goods received and recalculate unit prices</div>
            </div>
          </button>

          <button
            onClick={() => handleSelect('log-usage')}
            className="flex items-center gap-3 p-3 rounded-sm bg-[#fbfaf7] border border-[#e5e0d5] hover:bg-[#f5f2eb] active:scale-[0.99] text-left transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#faeaea] text-[#942426] flex items-center justify-center shrink-0">
              <MinusCircle size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-[#131715]">Log Meal Usage</div>
              <div className="text-xs text-[#59635e]">Deduct breakfast, lunch, or dinner staples</div>
            </div>
          </button>

          <button
            onClick={() => handleSelect('adjustment')}
            className="flex items-center gap-3 p-3 rounded-sm bg-[#fbfaf7] border border-[#e5e0d5] hover:bg-[#f5f2eb] active:scale-[0.99] text-left transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#f5f2eb] text-[#131715] flex items-center justify-center shrink-0">
              <Sliders size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-[#131715]">Stock Adjustment</div>
              <div className="text-xs text-[#59635e]">Stamp physical count correction with reason</div>
            </div>
          </button>

          <button
            onClick={() => handleSelect('headcount')}
            className="flex items-center gap-3 p-3 rounded-sm bg-[#fbfaf7] border border-[#e5e0d5] hover:bg-[#f5f2eb] active:scale-[0.99] text-left transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-[#131715]">Daily Headcount</div>
              <div className="text-xs text-[#59635e]">Record student &amp; guest attendance</div>
            </div>
          </button>

          {hasFullEditAccess && (
            <button
              onClick={() => handleSelect('add-ingredient')}
              className="flex items-center gap-3 p-3 rounded-sm bg-[#fbfaf7] border border-[#e5e0d5] hover:bg-[#f5f2eb] active:scale-[0.99] text-left transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center shrink-0">
                <PackagePlus size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-[#131715]">Add New Ingredient</div>
                <div className="text-xs text-[#59635e]">Add master provisions or perishable item</div>
              </div>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
