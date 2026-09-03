import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ toast, onClose }) => {
  if (!toast) return null;

  const { message, type } = toast;

  const typeStyles = {
    success: 'bg-[#18181B] border-emerald-500/60 text-emerald-400 shadow-emerald-950/40',
    error: 'bg-[#18181B] border-rose-500/60 text-rose-400 shadow-rose-950/40',
    info: 'bg-[#18181B] border-blue-500/60 text-blue-400 shadow-blue-950/40',
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />,
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${typeStyles[type] || typeStyles.info}`}>
        {icons[type]}
        <span className="text-xs font-bold leading-tight">{message}</span>
        <button onClick={onClose} className="p-1 hover:opacity-75 transition-opacity text-zinc-400">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
