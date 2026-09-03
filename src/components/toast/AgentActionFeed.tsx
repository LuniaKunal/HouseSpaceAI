import React, { useState, useEffect } from 'react';
import { uiStore, ToastMessage } from '../../state/uiStore';
import { Bot, CheckCircle, AlertCircle, Info, Sparkles, X } from 'lucide-react';

export const AgentActionFeed: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>(uiStore.getState().toasts);

  useEffect(() => {
    const unsub = uiStore.subscribe(s => setToasts(s.toasts));
    return () => unsub();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map(toast => {
        const isAgent = toast.type === 'agent';
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3 rounded-xl border shadow-xl backdrop-blur-md flex items-start gap-3 transition-all animate-in slide-in-from-bottom-2 ${
              isAgent
                ? 'bg-[#181c28]/95 border-blue-500/40 text-blue-200'
                : isSuccess
                ? 'bg-[#14211a]/95 border-emerald-500/40 text-emerald-200'
                : isError
                ? 'bg-[#241618]/95 border-rose-500/40 text-rose-200'
                : 'bg-[#181c28]/95 border-slate-700 text-slate-200'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                isAgent
                  ? 'bg-blue-600/20 text-blue-400'
                  : isSuccess
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : isError
                  ? 'bg-rose-600/20 text-rose-400'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {isAgent ? (
                <Bot size={15} />
              ) : isSuccess ? (
                <CheckCircle size={15} />
              ) : isError ? (
                <AlertCircle size={15} />
              ) : (
                <Info size={15} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold flex items-center justify-between">
                <span>{toast.title}</span>
                <span className="text-[10px] opacity-60 font-mono">Just now</span>
              </div>
              <p className="text-[11px] opacity-80 mt-0.5 line-clamp-2 leading-relaxed">
                {toast.description}
              </p>
            </div>

            <button
              onClick={() => uiStore.removeToast(toast.id)}
              className="p-1 opacity-50 hover:opacity-100 transition shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
