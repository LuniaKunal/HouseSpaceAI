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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-[#161a26] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Edit3 size={18} />
            </div>
            <h3 className="font-semibold text-base text-white">Rename Project</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
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
              className="w-full px-3.5 py-2.5 bg-[#0f121d] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition shadow-sm"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-[#161a26] border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/20">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">Delete Project</h3>
            <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          Are you sure you want to permanently delete{' '}
          <span className="font-semibold text-white">"{project.name}"</span>? All rooms, furniture, CAD references, and modifications in this workspace will be deleted from your browser storage.
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm shadow-rose-600/20"
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
};
