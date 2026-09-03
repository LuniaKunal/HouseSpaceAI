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
      className={`group relative bg-[#131622] border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/5 flex flex-col ${
        isActive
          ? 'border-blue-500/80 shadow-md shadow-blue-500/10'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Preview Image / Thumbnail */}
      <div
        onClick={handleOpen}
        className="relative h-44 bg-[#0a0d14] cursor-pointer overflow-hidden border-b border-slate-800/80 flex items-center justify-center group-hover:brightness-105 transition"
      >
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 gap-1">
            <Layers size={28} />
            <span className="text-[11px] font-mono">No Preview</span>
          </div>
        )}

        {/* Active Badge */}
        {isActive && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-blue-600/90 text-white font-semibold text-[10px] tracking-wide uppercase border border-blue-400/30 shadow-sm">
            Active Workspace
          </div>
        )}

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpen();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200"
          >
            <ExternalLink size={13} />
            Open Workspace
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={handleOpen}
              className="font-semibold text-sm text-white group-hover:text-blue-400 transition cursor-pointer line-clamp-1"
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
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <MoreVertical size={16} />
              </button>

              {/* Context Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-[#181c2b] border border-slate-700/80 rounded-xl shadow-xl py-1 z-30 animate-in fade-in text-xs">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleOpen();
                    }}
                    className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-blue-600/20 hover:text-blue-400 flex items-center gap-2 transition"
                  >
                    <ExternalLink size={13} />
                    Open Workspace
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRename(project);
                    }}
                    className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-blue-600/20 hover:text-blue-400 flex items-center gap-2 transition"
                  >
                    <Edit2 size={13} />
                    Rename Project
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      projectStore.duplicateProject(project.id);
                    }}
                    className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-blue-600/20 hover:text-blue-400 flex items-center gap-2 transition"
                  >
                    <Copy size={13} />
                    Duplicate Copy
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      projectStore.exportProject(project.id);
                    }}
                    className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-blue-600/20 hover:text-blue-400 flex items-center gap-2 transition"
                  >
                    <Download size={13} />
                    Export Backup JSON
                  </button>
                  <div className="h-[1px] bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(project);
                    }}
                    className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-600/20 flex items-center gap-2 transition"
                  >
                    <Trash2 size={13} />
                    Delete Project
                  </button>
                </div>
              )}
            </div>
          </div>

          {project.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{project.description}</p>
          )}
        </div>

        {/* Bottom Details & Metrics */}
        <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
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

          <span className="text-[10px] text-slate-500" title="Last modified">
            {formatRelativeTime(project.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
};
