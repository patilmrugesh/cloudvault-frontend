import React, { useState, useCallback, useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastContext } from './toast-context';
import type { ToastType, ToastItem } from './toast-context';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, title?: string, durationMs = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = { id, type, title, message, durationMs };

    setToasts((prev) => [...prev, newToast]);

    if (durationMs > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    }
  }, [dismissToast]);

  const toastMethods = useMemo(() => ({
    success: (message: string, title?: string) => addToast('success', message, title),
    error: (message: string, title?: string) => addToast('error', message, title),
    warning: (message: string, title?: string) => addToast('warning', message, title),
    info: (message: string, title?: string) => addToast('info', message, title),
  }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: toastMethods, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const titleId = useId();

  const config = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />,
      border: 'border-emerald-500/25',
    },
    error: {
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />,
      border: 'border-rose-500/25',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />,
      border: 'border-amber-500/25',
    },
    info: {
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />,
      border: 'border-sky-500/25',
    },
  }[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      role="status"
      aria-labelledby={toast.title ? titleId : undefined}
      className={`pointer-events-auto w-full p-4 rounded-xl bg-[#161B26] border ${config.border} shadow-xl shadow-black/40 flex items-start gap-3`}
    >
      {config.icon}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p id={titleId} className="text-sm font-semibold text-slate-100">
            {toast.title}
          </p>
        )}
        <p className={`text-sm text-slate-300 leading-snug break-words ${toast.title ? 'mt-0.5' : ''}`}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-200 transition-colors p-1 -mr-1 -mt-1 rounded-lg hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-slate-400"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
