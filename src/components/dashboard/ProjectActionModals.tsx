import React, { useState } from 'react';
import { ProjectMetadata } from '../../types/project';
import { projectStore } from '../../state/projectStore';
import { AlertTriangle, Edit3, X } from 'lucide-react';

interface RenameModalProps {
  project: ProjectMetadata | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RenameProjectModal: React.FC<RenameModalProps> = ({ project, isOpen, onClose }) => {
  if (!isOpen || !project) return null;

  const [name, setName] = useState(project.name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      projectStore.renameProject(project.id, name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md glass-popover rounded-2xl p-6 text-slate-100 shadow-2xl animate-in-scale">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center justify-center">
              <Edit3 size={16} />
            </div>
            <h3 className="font-semibold text-sm text-white">Rename Project</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-studio-surface transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Modern Penthouse"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-studio-surface border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:border-blue-500/80 focus-ring transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-studio-surface transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition shadow-glow-blue active:scale-[0.98]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeleteModalProps {
  project: ProjectMetadata | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteProjectModal: React.FC<DeleteModalProps> = ({ project, isOpen, onClose }) => {
  if (!isOpen || !project) return null;

  const handleDelete = () => {
    projectStore.deleteProject(project.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md glass-popover border-rose-500/40 rounded-2xl p-6 text-slate-100 shadow-2xl animate-in-scale">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">Delete Project</h3>
            <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-6 leading-relaxed text-pretty">
          Are you sure you want to permanently delete{' '}
          <span className="font-semibold text-white">"{project.name}"</span>? All rooms, furniture, CAD references, and modifications in this workspace will be removed from your local storage.
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-studio-surface transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm shadow-rose-600/30 active:scale-[0.98]"
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
};
