import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function ToastNotification() {
  const { toast, hideToast } = useApp();

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 pointer-events-none">
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 350 }}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-sm shadow-2xl text-xs font-medium border max-w-sm ${
              toast.isError
                ? 'bg-[#942426] text-white border-[#7e1c1f]'
                : 'bg-[#193d2c] text-white border-[#112a1f]'
            }`}
          >
            {toast.isError ? (
              <AlertCircle size={16} className="shrink-0 text-white" />
            ) : (
              <CheckCircle size={16} className="shrink-0 text-[#a3d8be]" />
            )}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={hideToast}
              className="p-1 -mr-1 text-white/70 hover:text-white rounded-sm cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
