import React, { useState, useRef, useEffect } from 'react';
import { ProjectMetadata } from '../../types/project';
import { projectStore } from '../../state/projectStore';
import {
  MoreVertical,
  ExternalLink,
  Edit2,
  Copy,
  Download,
  Trash2,
  Calendar,
  Layers,
  Box,
  Maximize2
} from 'lucide-react';

interface ProjectCardProps {
  project: ProjectMetadata;
  isActive: boolean;
  onRename: (project: ProjectMetadata) => void;
  onDelete: (project: ProjectMetadata) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isActive,
  onRename,
  onDelete
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleOpen = () => {
    projectStore.openProject(project.id);
  };

  const formatRelativeTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div
      onDoubleClick={handleOpen}
      className={`group relative glass-card border rounded-2xl transition-all duration-200 flex flex-col ${
        menuOpen ? 'z-30' : 'z-10'
      } ${
        isActive
          ? 'border-blue-500/70 shadow-glow-blue ring-1 ring-blue-500/30'
          : 'border-white/[0.08] hover:border-white/[0.16]'
      }`}
    >
      {/* Top Preview Image / Architectural Schematic Thumbnail */}
      <div
        onClick={handleOpen}
        className="relative h-44 bg-studio-canvas cursor-pointer overflow-hidden rounded-t-2xl border-b border-white/[0.08] flex items-center justify-center group-hover:brightness-105 transition"
      >
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className="w-full h-full object-contain p-2.5 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          /* Architectural Blueprint Schematic Placeholder Graphic */
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#0b0e18] to-studio-canvas">
            {/* Blueprint Grid Lines */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`card-grid-${project.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#card-grid-${project.id})`} />
            </svg>

            {/* Floor Plan Silhouette */}
            <div className="relative flex flex-col items-center justify-center text-slate-500 gap-1.5 z-10">
              <div className="size-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400/70 flex items-center justify-center">
                <Layers size={22} />
              </div>
              <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400">
                CAD Blueprint
              </span>
            </div>
          </div>
        )}

        {/* Active Badge */}
        {isActive && (
          <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-blue-600/90 text-white font-semibold text-[10px] tracking-wide uppercase border border-blue-400/40 shadow-sm flex items-center gap-1.5 backdrop-blur-sm">
            <span className="relative flex size-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full size-1.5 bg-white"></span>
            </span>
            Active Workspace
          </div>
        )}

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[1px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpen();
            }}
            aria-label={`Open ${project.name} Workspace`}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-glow-blue flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200 active:scale-95"
          >
            <ExternalLink size={13} />
            <span>Open Studio</span>
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between bg-studio-surface/50 rounded-b-2xl">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={handleOpen}
              className="font-semibold text-xs text-white group-hover:text-blue-400 transition cursor-pointer line-clamp-1"
              title={project.name}
            >
              {project.name}
            </h3>

            {/* Menu Trigger */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                aria-label="Project actions"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-studio-card transition"
              >
                <MoreVertical size={15} />
              </button>

              {/* Context Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 glass-popover rounded-xl py-1 z-50 animate-in-scale text-xs shadow-2xl border border-white/[0.12]">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleOpen();
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 flex items-center gap-2 transition"
                  >
                    <ExternalLink size={13} />
                    Open Studio
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRename(project);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 flex items-center gap-2 transition"
                  >
                    <Edit2 size={13} />
                    Rename Project
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      projectStore.duplicateProject(project.id);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 flex items-center gap-2 transition"
                  >
                    <Copy size={13} />
                    Duplicate Copy
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      projectStore.exportProject(project.id);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 flex items-center gap-2 transition"
                  >
                    <Download size={13} />
                    Export Backup JSON
                  </button>
                  <div className="h-[1px] bg-white/[0.08] my-1" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(project);
                    }}
                    className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-600/20 flex items-center gap-2 transition font-medium"
                  >
                    <Trash2 size={13} />
                    Delete Project
                  </button>
                </div>
              )}
            </div>
          </div>

          {project.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-1 text-pretty">{project.description}</p>
          )}
        </div>

        {/* Bottom Details & Metrics */}
        <div className="pt-3 mt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2.5 font-mono tabular-nums">
            <span className="flex items-center gap-1 text-slate-300" title="Rooms">
              <Layers size={12} className="text-blue-400" />
              {project.roomCount}
            </span>
            <span className="flex items-center gap-1 text-slate-300" title="Furniture items">
              <Box size={12} className="text-emerald-400" />
              {project.furnitureCount}
            </span>
            <span className="flex items-center gap-1 text-slate-300" title="Floor area">
              <Maximize2 size={12} className="text-amber-400" />
              {Math.round(project.totalAreaSqFt)} sq ft
            </span>
          </div>

          <span className="text-[10px] text-slate-500 font-mono tabular-nums" title="Last modified">
            {formatRelativeTime(project.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
};
