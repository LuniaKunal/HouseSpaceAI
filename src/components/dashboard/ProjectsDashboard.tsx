import React, { useState, useEffect, useMemo, useRef } from 'react';
import { projectStore, ProjectStoreState } from '../../state/projectStore';
import { ProjectMetadata } from '../../types/project';
import { ProjectCard } from './ProjectCard';
import { NewProjectModal } from './NewProjectModal';
import { RenameProjectModal, DeleteProjectModal } from './ProjectActionModals';
import {
  Box,
  FolderPlus,
  Search,
  Upload,
  Layers,
  ArrowUpDown,
  Plus,
  Sparkles,
  Home
} from 'lucide-react';

export const ProjectsDashboard: React.FC = () => {
  const [projectState, setProjectState] = useState<ProjectStoreState>(projectStore.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'created'>('updated');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ProjectMetadata | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = projectStore.subscribe(s => setProjectState({ ...s }));
    return () => unsub();
  }, []);

  const filteredProjects = useMemo(() => {
    let list = [...projectState.projects];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'created') return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });

    return list;
  }, [projectState.projects, searchQuery, sortBy]);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await projectStore.importProject(reader.result as string);
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalSqFt = projectState.projects.reduce((acc, p) => acc + (p.totalAreaSqFt || 0), 0);

  return (
    <div className="flex-1 w-full h-full bg-[#0a0c14] text-slate-100 flex flex-col overflow-y-auto font-sans select-none">
      {/* Top Dashboard Navigation Bar */}
      <header className="sticky top-0 z-20 bg-[#10131e]/90 backdrop-blur-md border-b border-slate-800/80 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <Box size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-white tracking-wide">HOUSESPACE</h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Workspace Manager
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal">
              {projectState.projects.length} Saved Projects &bull; {Math.round(totalSqFt).toLocaleString()} Total Sq Ft
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Import JSON Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#161a27] hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition"
          >
            <Upload size={14} />
            Import Project
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json, .housespace.json, .forma.json"
            className="hidden"
          />

          {/* Primary + New Project Button */}
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold transition shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Project
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search workspaces by name, tags, or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#121522] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ArrowUpDown size={14} />
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-[#121522] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="updated">Last Modified</option>
              <option value="name">Project Name (A-Z)</option>
              <option value="created">Creation Date</option>
            </select>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {/* Create New Project Shortcut Card */}
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="group h-[310px] border-2 border-dashed border-slate-800 hover:border-blue-500/60 rounded-2xl bg-[#0f121d]/40 hover:bg-blue-600/[0.03] transition-all duration-200 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#161a29] border border-slate-700/80 group-hover:border-blue-500/50 group-hover:bg-blue-600/10 text-slate-400 group-hover:text-blue-400 flex items-center justify-center transition-all duration-200 shadow-sm mb-3">
              <Plus size={24} />
            </div>
            <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition">
              New Project
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[180px] leading-relaxed">
              Create a blank design canvas or start from a layout template
            </p>
          </button>

          {/* Existing Project Cards */}
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              isActive={projectState.activeProject?.metadata.id === project.id}
              onRename={p => setRenameTarget(p)}
              onDelete={p => setDeleteTarget(p)}
            />
          ))}
        </div>

        {/* Empty State when search returns nothing */}
        {filteredProjects.length === 0 && searchQuery.trim() && (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-3">
              <Search size={22} />
            </div>
            <h3 className="text-sm font-semibold text-white">No projects found</h3>
            <p className="text-xs text-slate-400 mt-1">
              No workspaces matched "{searchQuery}". Try a different search term.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
            >
              Clear Search
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />

      <RenameProjectModal
        project={renameTarget}
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
      />

      <DeleteProjectModal
        project={deleteTarget}
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
