import React, { useState, useEffect } from 'react';
import { uiStore, UIState } from '../../state/uiStore';
import { sceneStore } from '../../state/sceneStore';
import { historyManager } from '../../state/historyStore';
import { agentStore } from '../../state/agentStore';
import { projectStore, ProjectStoreState } from '../../state/projectStore';
import { DeleteProjectModal } from '../dashboard/ProjectActionModals';
import { executeWebMCPTool, TOOL_LIST } from '../../webmcp/registry';
import {
  Box,
  Undo2,
  Redo2,
  Eye,
  Grid,
  Ruler,
  Bot,
  Download,
  Sparkles,
  ChevronDown,
  Compass,
  Footprints,
  Maximize2,
  LayoutGrid,
  Edit2,
  Trash2,
  Copy,
  MoreHorizontal
} from 'lucide-react';
import { CameraViewMode, CameraAngle } from '../../types/scene';

export const Header: React.FC = () => {
  const [uiState, setUiState] = useState<UIState>(uiStore.getState());
  const [projectState, setProjectState] = useState<ProjectStoreState>(projectStore.getState());
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(historyManager.canUndo());
  const [canRedo, setCanRedo] = useState(historyManager.canRedo());
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isViewAngleMenuOpen, setIsViewAngleMenuOpen] = useState(false);

  useEffect(() => {
    const unsubUI = uiStore.subscribe(s => setUiState({ ...s }));
    const unsubProject = projectStore.subscribe(s => setProjectState({ ...s }));
    const unsubHist = historyManager.subscribe(() => {
      setCanUndo(historyManager.canUndo());
      setCanRedo(historyManager.canRedo());
    });
    return () => {
      unsubUI();
      unsubProject();
      unsubHist();
    };
  }, []);

  const handleModeChange = (mode: CameraViewMode) => {
    uiStore.setCameraMode(mode, mode === '2d' ? 'top' : 'perspective');
  };

  const handleAngleChange = (angle: CameraAngle) => {
    uiStore.setCameraMode('2d', angle);
    setIsViewAngleMenuOpen(false);
  };

  const handleExport = async (format: 'glb' | 'obj' | 'ifc4' | 'json') => {
    setIsExportMenuOpen(false);
    try {
      await executeWebMCPTool('export_model', { format, includeMetadata: true }, 'user');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveRename = () => {
    setIsEditingName(false);
    if (tempProjectName.trim() && projectState.activeProject) {
      projectStore.renameProject(projectState.activeProject.metadata.id, tempProjectName);
    }
  };

  return (
    <header className="h-14 glass-toolbar border-b border-white/[0.08] px-4 flex items-center justify-between select-none z-30 relative">
      {/* Left: Branding, Workspace Switcher, Project Title & Undo/Redo */}
      <div className="flex items-center gap-3">
        {/* Return to Projects Dashboard Button */}
        <button
          onClick={() => uiStore.setActiveView('dashboard')}
          aria-label="Return to Projects Dashboard"
          title="Return to Projects Dashboard"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-studio-surface hover:bg-studio-card border border-white/[0.08] hover:border-white/[0.16] text-slate-300 hover:text-white text-xs font-medium transition shadow-sm group active:scale-95"
        >
          <LayoutGrid size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Projects</span>
        </button>

        <div className="h-4 w-[1px] bg-white/[0.08] mx-0.5" />

        {/* Active Project Title with Inline Rename, Dropdown & Delete Option */}
        <div className="flex items-center gap-1.5 relative">
          {isEditingName ? (
            <input
              type="text"
              value={tempProjectName}
              onChange={e => setTempProjectName(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveRename();
                else if (e.key === 'Escape') setIsEditingName(false);
              }}
              autoFocus
              className="px-2 py-0.5 bg-studio-surface border border-blue-500 rounded-lg text-xs text-white focus:outline-none"
            />
          ) : (
            <button
              onClick={() => {
                setTempProjectName(projectState.activeProject?.metadata.name || 'Untitled');
                setIsEditingName(true);
              }}
              title="Click to rename project"
              aria-label="Rename active project"
              className="flex items-center gap-1 text-xs font-semibold text-white hover:text-blue-400 transition group"
            >
              <span className="max-w-[160px] truncate">
                {projectState.activeProject?.metadata.name || 'Untitled Project'}
              </span>
              <Edit2 size={11} className="opacity-0 group-hover:opacity-100 text-slate-400 transition" />
            </button>
          )}

          {/* Project Action Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
              aria-label="Project actions"
              title="Project actions"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-studio-surface transition"
            >
              <MoreHorizontal size={13} />
            </button>

            {isProjectMenuOpen && (
              <div
                onMouseLeave={() => setIsProjectMenuOpen(false)}
                className="absolute left-0 top-full mt-1.5 w-48 glass-popover rounded-xl py-1 z-50 text-xs animate-in-scale shadow-2xl"
              >
                <button
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    setTempProjectName(projectState.activeProject?.metadata.name || 'Untitled');
                    setIsEditingName(true);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 flex items-center gap-2 transition"
                >
                  <Edit2 size={12} />
                  Rename Project
                </button>
                <button
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    if (projectState.activeProject) {
                      projectStore.duplicateProject(projectState.activeProject.metadata.id);
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 flex items-center gap-2 transition"
                >
                  <Copy size={12} />
                  Duplicate Copy
                </button>
                <button
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    if (projectState.activeProject) {
                      projectStore.exportProject(projectState.activeProject.metadata.id);
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 flex items-center gap-2 transition"
                >
                  <Download size={12} />
                  Export (.housespace.json)
                </button>
                <div className="h-[1px] bg-white/[0.08] my-1" />
                <button
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-rose-400 hover:bg-rose-600/20 flex items-center gap-2 transition font-medium"
                >
                  <Trash2 size={12} />
                  Delete Project
                </button>
              </div>
            )}
          </div>

          {/* Autosave Status Pill */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-studio-surface border border-white/[0.08]">
            {projectState.autosaveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                Saving...
              </span>
            ) : projectState.autosaveStatus === 'error' ? (
              <span className="text-rose-400 font-semibold">Save Error</span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Saved
              </span>
            )}
          </div>
        </div>

        <div className="h-4 w-[1px] bg-white/[0.08] mx-0.5" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 bg-studio-surface p-0.5 rounded-xl border border-white/[0.08]">
          <button
            onClick={() => sceneStore.undo()}
            disabled={!canUndo}
            aria-label="Undo action"
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-studio-card disabled:opacity-25 disabled:hover:bg-transparent transition active:scale-95"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={() => sceneStore.redo()}
            disabled={!canRedo}
            aria-label="Redo action"
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-studio-card disabled:opacity-25 disabled:hover:bg-transparent transition active:scale-95"
          >
            <Redo2 size={14} />
          </button>
        </div>
      </div>

      {/* Middle: Segmented Camera View Modes & Angles */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-studio-surface p-1 rounded-xl border border-white/[0.08] text-xs">
          <button
            onClick={() => handleModeChange('3d')}
            aria-label="3D Orbit View Mode"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              uiState.cameraMode === '3d'
                ? 'bg-blue-600 text-white shadow-glow-blue'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye size={13} />
            <span>3D Orbit</span>
          </button>

          <div className="relative">
            <button
              onClick={() => {
                if (uiState.cameraMode === '2d') {
                  setIsViewAngleMenuOpen(!isViewAngleMenuOpen);
                } else {
                  handleModeChange('2d');
                }
              }}
              aria-label="2D Plan View Mode"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                uiState.cameraMode === '2d'
                  ? 'bg-blue-600 text-white shadow-glow-blue'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass size={13} />
              <span>2D Plan ({uiState.cameraAngle.toUpperCase()})</span>
              <ChevronDown size={11} className="ml-0.5 opacity-70" />
            </button>

            {isViewAngleMenuOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-44 glass-popover rounded-xl py-1 z-50 animate-in-scale shadow-2xl">
                {[
                  { id: 'top', label: 'Top (Floor Plan)' },
                  { id: 'north', label: 'North Elevation' },
                  { id: 'east', label: 'East Elevation' },
                  { id: 'south', label: 'South Elevation' },
                  { id: 'west', label: 'West Elevation' },
                  { id: 'inside', label: 'Inside Room Wall' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleAngleChange(item.id as CameraAngle)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-blue-600/20 hover:text-blue-300 transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleModeChange('walk')}
            aria-label="Walk 1st Person Mode"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              uiState.cameraMode === 'walk'
                ? 'bg-emerald-600 text-white shadow-glow-emerald'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Footprints size={13} />
            <span>Walk (1st Person)</span>
          </button>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-0.5 bg-studio-surface p-1 rounded-xl border border-white/[0.08]">
          <button
            onClick={() => uiStore.setGridSnap(!uiState.gridSnap)}
            title="Toggle Grid Snapping"
            aria-label="Toggle Grid Snapping"
            className={`p-1.5 rounded-lg text-xs transition ${
              uiState.gridSnap ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid size={15} />
          </button>
          <button
            onClick={() => uiStore.setShowDimensions(!uiState.showDimensions)}
            title="Toggle Dimension Lines & HUD"
            aria-label="Toggle Dimension Lines and HUD"
            className={`p-1.5 rounded-lg text-xs transition ${
              uiState.showDimensions ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ruler size={15} />
          </button>
          <button
            onClick={() => uiStore.setShowWallCutaways(!uiState.showWallCutaways)}
            title="Toggle Wall Cutaways (Interior Visibility)"
            aria-label="Toggle Wall Cutaways"
            className={`p-1.5 rounded-lg text-xs transition ${
              uiState.showWallCutaways ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* Right: Agent Bridge Status Pill, Export & AI Copilot toggle */}
      <div className="flex items-center gap-2.5">
        {/* WebMCP Bridge Status Pill */}
        <button
          onClick={() => uiStore.setAgentBridgeModalOpen(true)}
          aria-label="Open WebMCP Agent Bridge"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-studio-surface border border-emerald-500/30 hover:border-emerald-500 text-xs transition shadow-sm group active:scale-95"
        >
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-400 font-medium font-mono tabular-nums text-[11px] group-hover:text-emerald-300">
            WebMCP ({TOOL_LIST.length} Tools)
          </span>
          <Bot size={13} className="text-emerald-400" />
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            aria-label="Export 3D Model"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-studio-surface hover:bg-studio-card border border-white/[0.08] hover:border-white/[0.16] text-slate-200 text-xs font-medium transition active:scale-95"
          >
            <Download size={13} />
            <span>Export 3D</span>
            <ChevronDown size={11} className="opacity-70" />
          </button>

          {isExportMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 glass-popover rounded-xl py-1.5 z-50 animate-in-scale shadow-2xl">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">CAD & BIM Formats</div>
              <button
                onClick={() => handleExport('glb')}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white transition flex items-center justify-between"
              >
                <span>GLTF / GLB Binary</span>
                <span className="text-[10px] font-mono text-slate-400">3D Mesh</span>
              </button>
              <button
                onClick={() => handleExport('ifc4')}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white transition flex items-center justify-between"
              >
                <span>IFC4 (BIM Structure)</span>
                <span className="text-[10px] font-mono text-slate-400">CAD / Arch</span>
              </button>
              <button
                onClick={() => handleExport('obj')}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white transition flex items-center justify-between"
              >
                <span>Wavefront OBJ</span>
                <span className="text-[10px] font-mono text-slate-400">Geometry</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white transition flex items-center justify-between"
              >
                <span>Scene State JSON</span>
                <span className="text-[10px] font-mono text-slate-400">Metadata</span>
              </button>
            </div>
          )}
        </div>

        {/* AI Co-Designer Drawer Toggle */}
        <button
          onClick={() =>
            uiStore.setActiveSidebarTab(
              uiState.activeSidebarTab === 'copilot' ? 'catalog' : 'copilot'
            )
          }
          aria-label="Toggle AI Co-Designer panel"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 ${
            uiState.activeSidebarTab === 'copilot'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-glow-blue'
              : 'bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30'
          }`}
        >
          <Sparkles size={13} />
          <span>AI Co-Designer</span>
        </button>
      </div>

      {/* Delete Project Confirmation Modal */}
      <DeleteProjectModal
        project={projectState.activeProject ? projectState.activeProject.metadata : null}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </header>
  );
};
