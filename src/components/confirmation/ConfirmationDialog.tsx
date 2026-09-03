import React from 'react';
import { uiStore } from '../../state/uiStore';
import { ShieldAlert, Check, X, AlertTriangle } from 'lucide-react';
import { ConfirmationRequest } from '../../types/webmcp';

interface ConfirmationDialogProps {
  request: ConfirmationRequest | null;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ request }) => {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md glass-popover border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in-scale">
        {/* Header */}
        <div className="px-5 py-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Human Confirmation Required</h3>
            <p className="text-[11px] text-amber-300/80">WebMCP Trust Boundary Gate</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5">
          <p className="text-xs text-slate-300 leading-relaxed text-pretty">
            The AI Agent proposes an irreversible structural change or export action:
          </p>

          <div className="p-3 bg-studio-canvas border border-white/[0.08] rounded-xl space-y-2 font-mono tabular-nums text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Tool:</span>
              <strong className="text-blue-400 font-bold">{request.toolName}</strong>
            </div>

            {request.input && Object.keys(request.input).length > 0 && (
              <div className="pt-2 border-t border-white/[0.08] text-[11px]">
                <span className="text-slate-400 font-sans block mb-1">Payload:</span>
                <pre className="text-emerald-400 bg-studio-surface p-2.5 rounded-lg max-h-28 overflow-y-auto whitespace-pre-wrap border border-white/[0.06]">
                  {JSON.stringify(request.input, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <AlertTriangle size={13} className="text-amber-400 shrink-0" />
            <span className="text-pretty">Approve only if you intend to execute this structural modification.</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-3.5 bg-studio-surface border-t border-white/[0.08] flex items-center justify-end gap-2.5">
          <button
            onClick={() => request.resolve(false)}
            className="px-4 py-2 bg-studio-card hover:bg-studio-card/80 text-slate-200 rounded-xl text-xs font-medium transition flex items-center gap-1.5 active:scale-[0.98]"
          >
            <X size={14} />
            Reject Action
          </button>

          <button
            onClick={() => request.resolve(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-500/25 active:scale-[0.98]"
          >
            <Check size={14} />
            Approve & Execute
          </button>
        </div>
      </div>
    </div>
  );
};
