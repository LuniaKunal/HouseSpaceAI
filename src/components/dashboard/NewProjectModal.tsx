import React, { useState } from 'react';
import { projectStore } from '../../state/projectStore';
import { CADReferenceData } from '../../types/project';
import { triggerCadAutoBuildIfConnected } from '../../webmcp/tools/cadTools';
import {
  FolderPlus,
  LayoutGrid,
  Home,
  Layers,
  Upload,
  X,
  Check,
  FileText,
  Sparkles,
  Palette,
  Bot
} from 'lucide-react';

const DEFAULT_FLOORPLAN_PROMPT = `You are given a floorplan image. Build a matching 3D layout using the WebMCP
tools available on this page.

Step 1 — Read the floorplan first, don't build yet.
Identify each labeled room (Master Bedroom, Living Room, Kitchen), its
dimensions in feet as printed on the plan, and which rooms share a wall with
which. If a dimension or adjacency is ambiguous or not labeled, state your
assumption before proceeding rather than guessing silently.

Step 2 — Build rooms in adjacency order, not room-list order.
Create the first room with create_room. For every subsequent room that shares
a wall with an already-created room, use connect_rooms (not a second
create_room at a manually computed position) so the shared wall and gate are
generated once, not independently by each room. Only fall back to manual
positioning for rooms with no shared wall to an existing room.

Step 3 — Verify before adding furniture.
After all three rooms exist, call get_scene_state and confirm:
- room dimensions match the floorplan within 0.5ft
- no two room bounding boxes overlap
- each expected shared wall has exactly one gate
If any check fails, fix it with move_room / set_room_dimensions before
continuing — don't place furniture into a broken layout.

Step 4 — Furnish.
Add a bed + nightstand to the Master Bedroom, a sofa + coffee table to the
Living Room, and counter/cabinet furniture to the Kitchen, using
add_furniture. Keep furniture centroids inside their room's bounds.

Step 5 — Confirm and report.
Switch to Top view and take a screenshot. Report the room and object IDs you
created, and flag anything from the floorplan you couldn't confidently match
(e.g. a fixture with no equivalent in the catalog) instead of silently
skipping it.

Do not call export_model.`;

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [name, setName] = useState('New Interior Project');
  const [description, setDescription] = useState('');
  const [userPrompt, setUserPrompt] = useState(DEFAULT_FLOORPLAN_PROMPT);
  const [stylePreset, setStylePreset] = useState<'modern_luxury' | 'warm_contemporary' | 'scandinavian' | 'minimalist' | 'industrial'>('modern_luxury');

  const [cadFile, setCadFile] = useState<{ name: string; size: number; dataUrl: string } | null>(null);
  const [autoBuild3D, setAutoBuild3D] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCadFile({
        name: file.name,
        size: file.size,
        dataUrl: reader.result as string
      });
      // Suggest default prompt if empty
      if (!userPrompt) {
        setUserPrompt(DEFAULT_FLOORPLAN_PROMPT);
      }
    };
    reader.readAsDataURL(file);
  };

  const promptSuggestions = [
    '2BHK with open kitchen & balcony',
    'Compact studio suite with balcony patio',
    '3BHK luxury layout with ensuite baths',
    'Living & dining with executive home study'
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCreating) return;

    setIsCreating(true);
    try {
      let cadData: CADReferenceData | undefined = undefined;
      if (cadFile) {
        cadData = {
          fileName: cadFile.name,
          fileSize: cadFile.size,
          uploadedAt: Date.now(),
          dataUrl: cadFile.dataUrl,
          opacity: 0.75,
          visible: true
        };
      }

      await projectStore.createProject({
        name: name.trim(),
        description: description.trim(),
        template: 'blank',
        cadData
      });

      onClose();

      if (cadFile && autoBuild3D) {
        setTimeout(async () => {
          await triggerCadAutoBuildIfConnected({
            cadDataUrl: cadFile.dataUrl,
            blueprintName: cadFile.name,
            userPrompt: userPrompt.trim() || description.trim(),
            projectName: name.trim(),
            description: description.trim(),
            stylePreset,
            furnished: true
          });
        }, 350);
      }
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
              {/* Blank Canvas */}
              <button
                type="button"
                onClick={() => {
                  setCadFile(null);
                }}
                className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between focus-ring ${
                  !cadFile
                    ? 'border-blue-500 bg-blue-600/10 shadow-glow-blue ring-1 ring-blue-500/50'
                    : 'border-white/[0.08] bg-studio-surface hover:border-white/[0.16]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="size-8 rounded-lg bg-studio-card text-slate-300 flex items-center justify-center">
                      <LayoutGrid size={16} />
                    </div>
                    {!cadFile && (
                      <div className="size-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="font-semibold text-xs text-white">Blank Canvas</div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug text-pretty">
                    Zero hardcoded geometry. Draw walls, rooms, doors, and place furniture freely.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-3">Interactive 2D/3D Drafting</div>
              </button>

              {/* Floor Plan / CAD Import */}
              <button
                type="button"
                onClick={() => {
                  const inputEl = document.querySelector<HTMLInputElement>('#cad-upload-input');
                  inputEl?.click();
                }}
                className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between focus-ring ${
                  cadFile
                    ? 'border-blue-500 bg-blue-600/10 shadow-glow-blue ring-1 ring-blue-500/50'
                    : 'border-white/[0.08] bg-studio-surface hover:border-white/[0.16]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="size-8 rounded-lg bg-studio-card text-purple-400 flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    {cadFile && (
                      <div className="size-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="font-semibold text-xs text-white">Import 2D Floor Plan / CAD</div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug text-pretty">
                    Upload any arbitrary residential blueprint (PNG, JPG, SVG, WebP) to reconstruct 3D walls & spaces.
                  </p>
                </div>
                <div className="text-[10px] font-mono tabular-nums text-purple-400 mt-3">
                  {cadFile ? `${(cadFile.size / 1024).toFixed(0)} KB Attached` : 'Dynamic Vector / Raster Extraction'}
                </div>
              </button>
            </div>
          </div>

          {/* Optional CAD Blueprint Floor Plan Upload */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Import 2D Floor Plan / Blueprint Image <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <div className="relative border-2 border-dashed border-white/[0.10] hover:border-blue-500/60 rounded-xl p-4 transition bg-studio-surface/60 text-center">
              <input
                id="cad-upload-input"
                type="file"
                accept="image/png, image/jpeg, image/svg+xml, image/webp, .dxf, .dwg, .pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {cadFile ? (
                <div className="flex items-center justify-between gap-3 text-slate-200">
                  <div className="flex items-center gap-3">
                    <img
                      src={cadFile.dataUrl}
                      alt="CAD preview"
                      className="size-12 object-cover rounded-lg border border-white/[0.10] bg-studio-card shrink-0"
                    />
                    <div className="text-left">
                      <div className="text-xs font-semibold truncate max-w-[240px]">{cadFile.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {(cadFile.size / 1024).toFixed(1)} KB &bull; Image Ready for AI Analysis
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCadFile(null);
                    }}
                    aria-label="Remove attached CAD file"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-studio-card transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                  <Upload size={20} className="text-slate-400" />
                  <span className="text-xs text-slate-300">
                    Drag & drop 2D floor plan or <span className="text-blue-400 underline">browse files</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Supports PNG, JPG, SVG, WebP floor plans & sketches</span>
                </div>
              )}
            </div>

            {/* AI Agent Configuration when Image is Provided */}
            {cadFile && (
              <div className="mt-4 p-4 rounded-xl bg-blue-950/25 border border-blue-500/30 space-y-3.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-white">
                      AI Agent 3D Synthesis from Image
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-blue-300">
                    <span>Auto-build on open</span>
                    <input
                      type="checkbox"
                      checked={autoBuild3D}
                      onChange={e => setAutoBuild3D(e.target.checked)}
                      className="size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Prompt instructions for what the agent should build */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Bot size={13} className="text-blue-400" />
                    What should the AI Agent build from this image?
                  </label>
                  <textarea
                    rows={5}
                    value={userPrompt}
                    onChange={e => setUserPrompt(e.target.value)}
                    placeholder="Enter floorplan instructions for the AI agent..."
                    className="w-full px-3 py-2 bg-studio-surface border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus-ring transition resize-y font-mono leading-relaxed"
                  />

                  {/* Prompt Suggestion Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 pb-0.5 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setUserPrompt(DEFAULT_FLOORPLAN_PROMPT)}
                      className="px-2 py-0.5 rounded-lg bg-blue-900/40 hover:bg-blue-800/60 text-[10px] text-blue-300 hover:text-white whitespace-nowrap transition border border-blue-600/40"
                    >
                      ↺ Default 5-Step Instructions
                    </button>
                    {promptSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setUserPrompt(s)}
                        className="px-2 py-0.5 rounded-lg bg-studio-surface hover:bg-studio-card text-[10px] text-slate-300 hover:text-white whitespace-nowrap transition border border-white/[0.08]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Architectural Style Preset */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Palette size={13} className="text-amber-400" />
                    Architectural Theme & Materials
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'modern_luxury', label: 'Modern Luxury', desc: 'Carrara Marble & Walnut' },
                      { id: 'warm_contemporary', label: 'Warm Contemporary', desc: 'Oak Wood & Greige' },
                      { id: 'scandinavian', label: 'Scandinavian', desc: 'Light Parquet & Studio White' }
                    ].map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setStylePreset(style.id as any)}
                        className={`p-2 rounded-lg border text-left transition focus-ring ${
                          stylePreset === style.id
                            ? 'border-blue-500 bg-blue-600/20 text-white shadow-sm'
                            : 'border-white/[0.08] bg-studio-surface text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-[11px] font-semibold">{style.label}</div>
                        <div className="text-[9px] text-slate-400 truncate">{style.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
