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
  Home,
  ChevronDown,
  Check
} from 'lucide-react';

export type SortOption = 'updated' | 'name' | 'created' | 'area' | 'rooms';

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'updated', label: 'Last Modified' },
  { value: 'created', label: 'Recently Created' },
  { value: 'name', label: 'Project Name (A-Z)' },
  { value: 'area', label: 'Floor Area (Largest)' },
  { value: 'rooms', label: 'Room Count (Most)' }
];

export const ProjectsDashboard: React.FC = () => {
  const [projectState, setProjectState] = useState<ProjectStoreState>(projectStore.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ProjectMetadata | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = projectStore.subscribe(s => setProjectState({ ...s }));
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    if (isSortOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSortOpen]);

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
      if (sortBy === 'area') return (b.totalAreaSqFt || 0) - (a.totalAreaSqFt || 0);
      if (sortBy === 'rooms') return (b.roomCount || 0) - (a.roomCount || 0);
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
    <div className="flex-1 w-full h-full bg-studio-canvas text-slate-100 flex flex-col overflow-y-auto font-sans select-none">
      {/* Top Dashboard Navigation Bar */}
      <header className="sticky top-0 z-20 glass-toolbar px-8 py-3.5 flex items-center justify-between border-b border-white/[0.08]">
        <div className="flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-glow-blue text-white shrink-0">
            <Box size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-wide text-white">HOUSESPACE STUDIO</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold tracking-wider">
                WebMCP CAD
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal flex items-center gap-1.5 mt-0.5">
              <span className="font-mono tabular-nums text-slate-300 font-medium">{projectState.projects.length}</span> Workspaces
              <span className="text-slate-600">&bull;</span>
              <span className="font-mono tabular-nums text-slate-300 font-medium">{Math.round(totalSqFt).toLocaleString()}</span> sq ft total area
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Import JSON Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import Project JSON"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-studio-surface hover:bg-studio-card border border-white/[0.08] hover:border-white/[0.16] text-slate-300 hover:text-white text-xs font-medium transition active:scale-[0.98]"
          >
            <Upload size={14} className="text-slate-400" />
            <span>Import Project</span>
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
            aria-label="Create New Project"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold transition shadow-glow-blue active:scale-[0.98]"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New Project</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search workspaces by name, tags, or description..."
              className="w-full pl-10 pr-16 py-2 bg-studio-surface border border-white/[0.08] focus:border-blue-500/80 rounded-xl text-xs text-white placeholder-slate-500 focus-ring transition"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear Search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-white/[0.06]"
              >
                esc
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 border border-white/[0.08] px-1.5 py-0.5 rounded">
                Ctrl+K
              </span>
            )}
          </div>

          {/* Custom Sleek Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              aria-label="Sort projects"
              className="flex items-center gap-2 px-3.5 py-2 bg-studio-surface hover:bg-studio-card border border-white/[0.08] hover:border-white/[0.16] rounded-xl text-xs font-medium text-slate-200 transition active:scale-95 shadow-sm"
            >
              <ArrowUpDown size={13} className="text-blue-400" />
              <span className="text-slate-400">Sort:</span>
              <span className="text-white font-semibold">
                {SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Last Modified'}
              </span>
              <ChevronDown
                size={13}
                className={`text-slate-400 transition-transform duration-200 ${
                  isSortOpen ? 'rotate-180 text-blue-400' : ''
                }`}
              />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 glass-popover rounded-xl py-1.5 z-30 animate-in-scale text-xs shadow-2xl border border-white/[0.12]">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Sort Workspaces By
                </div>
                {SORT_OPTIONS.map(option => {
                  const isSelected = sortBy === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setIsSortOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-blue-600/20 text-blue-400 font-semibold'
                          : 'text-slate-300 hover:bg-studio-surface hover:text-white'
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected && <Check size={13} className="text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {/* Create New Project Shortcut Card */}
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            aria-label="Create New Empty Project"
            className="group h-[310px] border-2 border-dashed border-white/[0.08] hover:border-blue-500/60 rounded-2xl bg-studio-surface/50 hover:bg-blue-600/[0.04] transition-all duration-200 flex flex-col items-center justify-center p-6 text-center focus-ring"
          >
            <div className="size-12 rounded-2xl bg-studio-card border border-white/[0.08] group-hover:border-blue-500/50 group-hover:bg-blue-600/10 text-slate-400 group-hover:text-blue-400 flex items-center justify-center transition-all duration-200 shadow-sm mb-3">
              <Plus size={22} />
            </div>
            <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition">
              New Project
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[190px] leading-relaxed text-pretty">
              Create a blank design canvas or import an architectural floor plan
            </p>
          </button>

          {/* Quick Load 4BHK Sample Blueprint Card */}
          <button
            onClick={() => projectStore.load4BHKSampleProject()}
            aria-label="Load 4BHK Luxury Residence Sample"
            className="group h-[310px] glass-card hover:border-blue-500/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-200 focus-ring"
          >
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[10px] font-mono font-semibold text-blue-300 flex items-center gap-1">
              <Sparkles size={10} /> 4BHK
            </div>
            <div className="size-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 group-hover:scale-110 flex items-center justify-center transition-all duration-200 shadow-sm mb-3">
              <Home size={22} />
            </div>
            <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition">
              4BHK Luxury Suite
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[190px] leading-relaxed text-pretty">
              Architectural 4BHK residence matching Sample_1.png blueprint layout
            </p>
            <span className="mt-3 text-[11px] font-mono text-blue-400 font-medium px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
              Load Blueprint
            </span>
          </button>

          {/* Quick Load 3BHK Sample Blueprint Card */}
          <button
            onClick={() => projectStore.load3BHKSampleProject()}
            aria-label="Load 3BHK Contemporary Residence Sample"
            className="group h-[310px] glass-card hover:border-indigo-500/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-200 focus-ring"
          >
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-mono font-semibold text-indigo-300 flex items-center gap-1">
              <Sparkles size={10} /> 3BHK
            </div>
            <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 group-hover:scale-110 flex items-center justify-center transition-all duration-200 shadow-sm mb-3">
              <Layers size={22} />
            </div>
            <h4 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition">
              3BHK Contemporary
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[190px] leading-relaxed text-pretty">
              Architectural 3BHK residence matching Sample_2.png blueprint layout
            </p>
            <span className="mt-3 text-[11px] font-mono text-indigo-400 font-medium px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
              Load Blueprint
            </span>
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
            <div className="size-12 rounded-2xl bg-studio-surface border border-white/[0.08] text-slate-400 flex items-center justify-center mb-3">
              <Search size={20} />
            </div>
            <h3 className="text-sm font-semibold text-white">No projects found</h3>
            <p className="text-xs text-slate-400 mt-1 text-pretty">
              No workspaces matched "{searchQuery}". Try a different search term.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3.5 py-1.5 rounded-lg bg-studio-surface hover:bg-studio-card border border-white/[0.08] text-xs text-slate-300 hover:text-white transition"
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
