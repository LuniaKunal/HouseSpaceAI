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
            className={`pointer-events-auto p-3 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 transition-all animate-in-scale ${
              isAgent
                ? 'bg-studio-surface/95 border-blue-500/50 shadow-glow-blue text-blue-200'
                : isSuccess
                ? 'bg-studio-surface/95 border-emerald-500/50 shadow-glow-emerald text-emerald-200'
                : isError
                ? 'bg-studio-surface/95 border-rose-500/50 shadow-lg shadow-rose-600/20 text-rose-200'
                : 'bg-studio-surface/95 border-white/[0.12] text-slate-200'
            }`}
          >
            <div
              className={`size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                isAgent
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : isSuccess
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : isError
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                  : 'bg-studio-card text-slate-300 border border-white/[0.08]'
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
                <span className="text-white">{toast.title}</span>
                <span className="text-[10px] opacity-60 font-mono tabular-nums">Just now</span>
              </div>
              <p className="text-[11px] opacity-80 mt-0.5 line-clamp-2 leading-relaxed text-pretty">
                {toast.description}
              </p>
            </div>

            <button
              onClick={() => uiStore.removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 opacity-50 hover:opacity-100 transition shrink-0 rounded-lg hover:bg-studio-card"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
