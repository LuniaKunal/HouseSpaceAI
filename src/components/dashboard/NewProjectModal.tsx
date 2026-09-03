import React, { useState } from 'react';
import { projectStore } from '../../state/projectStore';
import {
  FolderPlus,
  LayoutGrid,
  X,
  Check,
  Sparkles
} from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [name, setName] = useState('New Interior Project');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await projectStore.createProject({
        name: name.trim(),
        description: description.trim(),
        template: 'blank'
      });

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-xl glass-popover rounded-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto animate-in-scale">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/25 shadow-glow-blue flex items-center justify-center shrink-0">
              <FolderPlus size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-base text-white">Create New Project</h2>
              <p className="text-xs text-slate-400">Initialize an independent CAD & 3D design workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-studio-surface transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-5 pt-5">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Project Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Modern Minimalist Penthouse"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 bg-studio-surface border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-500 focus:border-blue-500/80 focus-ring transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Description <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Client notes, location, or design concepts"
              className="w-full px-3.5 py-2 bg-studio-surface border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:border-blue-500/80 focus-ring transition"
            />
          </div>

          {/* Workspace Starting Mode */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
              Workspace Creation Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Blank Canvas - Active */}
              <button
                type="button"
                className="p-4 rounded-xl border border-blue-500 bg-blue-600/10 shadow-glow-blue ring-1 ring-blue-500/50 text-left relative flex flex-col justify-between focus-ring"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="size-8 rounded-lg bg-studio-card text-slate-300 flex items-center justify-center">
                      <LayoutGrid size={16} />
                    </div>
                    <div className="size-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </div>
                  <div className="font-semibold text-xs text-white">Blank Canvas</div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug text-pretty">
                    Zero hardcoded geometry. Draw walls, rooms, doors, and place furniture freely.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-3">Interactive 2D/3D Drafting</div>
              </button>

              {/* Import 2D Floor Plan / CAD - Coming Soon (Unselectable) */}
              <div
                role="button"
                aria-disabled="true"
                tabIndex={-1}
                className="p-4 rounded-xl border border-white/[0.06] bg-studio-surface/40 opacity-60 cursor-not-allowed text-left relative flex flex-col justify-between select-none"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="size-8 rounded-lg bg-studio-card/80 text-purple-400/70 flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-purple-500/15 text-purple-300/80 border border-purple-500/25">
                      Coming Soon
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-slate-300">Import 2D Floor Plan / CAD</div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug text-pretty">
                    Upload residential blueprints to automatically reconstruct 3D walls, doors, and spaces.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-3">
                  Dynamic Vector / Raster Extraction
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-studio-surface transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white disabled:opacity-40 transition shadow-glow-blue flex items-center gap-2 active:scale-[0.98]"
            >
              <FolderPlus size={15} />
              {isCreating ? 'Creating Workspace...' : 'Create & Open Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
