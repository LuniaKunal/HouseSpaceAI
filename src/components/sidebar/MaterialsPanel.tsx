import React, { useState } from 'react';
import { uiStore } from '../../state/uiStore';
import { sceneStore } from '../../state/sceneStore';
import { executeWebMCPTool } from '../../webmcp/registry';
import { Palette, Check, Layers, Sparkles, Pipette, Copy, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { RoomFloorMaterial } from '../../types/scene';

interface ColorSwatch {
  id: string;
  label: string;
  hex: string;
}

interface ColorCollection {
  category: string;
  iconColor: string;
  colors: ColorSwatch[];
}

export const MaterialsPanel: React.FC = () => {
  const uiState = uiStore.getState();
  const sceneData = sceneStore.getData();

  const selectedRoom = sceneData.rooms.find(r => r.id === uiState.selectedId);
  const selectedFurniture = sceneData.furniture.find(f => f.id === uiState.selectedId);

  const [customColor, setCustomColor] = useState<string>('#3b82f6');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [recentColors, setRecentColors] = useState<string[]>([
    '#ffffff',
    '#f8fafc',
    '#38bdf8',
    '#ea580c',
    '#16a34a',
    '#d4af37',
    '#1e293b'
  ]);

  const floorMaterials: Array<{ id: RoomFloorMaterial; label: string; previewColor: string; style: string }> = [
    { id: 'herringbone_wood', label: 'Herringbone Parquet Oak', previewColor: '#b5885c', style: 'Geometric Wood' },
    { id: 'hardwood_oak', label: 'Natural White Oak', previewColor: '#c89d6c', style: 'Wood Plank' },
    { id: 'hardwood_walnut', label: 'American Dark Walnut', previewColor: '#5a3825', style: 'Solid Wood' },
    { id: 'marble_carrara', label: 'Carrara Italian Marble', previewColor: '#f3f4f6', style: 'Polished Stone' },
    { id: 'marble_nero', label: 'Nero Marquina Black Marble', previewColor: '#1e293b', style: 'High Gloss' },
    { id: 'terrazzo', label: 'Venetian Terrazzo Aggregate', previewColor: '#d1d5db', style: 'Composite Stone' },
    { id: 'ceramic_tile', label: 'Large Format Porcelain Tile', previewColor: '#e5e7eb', style: 'Glazed Ceramic' },
    { id: 'concrete_polished', label: 'Architectural Concrete', previewColor: '#9ca3af', style: 'Matte Industrial' },
    { id: 'carpet_plush', label: 'Plush Berber Carpet', previewColor: '#e2e8f0', style: 'Soft Wool' }
  ];

  // 6 Curated Designer Color Collections (48+ Swatches)
  const colorCollections: ColorCollection[] = [
    {
      category: 'Architectural Neutrals',
      iconColor: '#94a3b8',
      colors: [
        { id: 'c-white-pure', label: 'Pure Studio White', hex: '#ffffff' },
        { id: 'c-chalk', label: 'Crisp Chalk', hex: '#f8fafc' },
        { id: 'c-alabaster', label: 'Alabaster Cream', hex: '#fafaf9' },
        { id: 'c-linen', label: 'Warm Linen', hex: '#f5f5f4' },
        { id: 'c-greige', label: 'Cashmere Greige', hex: '#e7e5e4' },
        { id: 'c-pewter', label: 'Soft Pewter', hex: '#cbd5e1' },
        { id: 'c-slate', label: 'Charcoal Slate', hex: '#334155' },
        { id: 'c-jet', label: 'Jet Obsidian', hex: '#09090b' },
        { id: 'c-titanium', label: 'Titanium Grey', hex: '#71717a' },
        { id: 'c-vanilla', label: 'French Vanilla', hex: '#fef3c7' }
      ]
    },
    {
      category: 'Earthy Terracotta & Warm Tones',
      iconColor: '#ea580c',
      colors: [
        { id: 'c-terracotta', label: 'Tuscan Terracotta', hex: '#ea580c' },
        { id: 'c-sienna', label: 'Burnt Sienna', hex: '#c2410c' },
        { id: 'c-ochre', label: 'Warm Ochre', hex: '#d97706' },
        { id: 'c-umber', label: 'Raw Umber', hex: '#78350f' },
        { id: 'c-sandstone', label: 'Golden Sandstone', hex: '#f59e0b' },
        { id: 'c-sedona', label: 'Sedona Red', hex: '#b91c1c' },
        { id: 'c-clay', label: 'Desert Dune Clay', hex: '#fed7aa' },
        { id: 'c-cinnamon', label: 'Cinnamon Spice', hex: '#9a3412' }
      ]
    },
    {
      category: 'Botanical & Nature Greens',
      iconColor: '#16a34a',
      colors: [
        { id: 'c-sage', label: 'Sage Olive', hex: '#84cc16' },
        { id: 'c-eucalyptus', label: 'Eucalyptus Green', hex: '#15803d' },
        { id: 'c-pine', label: 'Forest Pine', hex: '#14532d' },
        { id: 'c-moss', label: 'Moss Velvet', hex: '#4d7c0f' },
        { id: 'c-emerald', label: 'Royal Emerald', hex: '#047857' },
        { id: 'c-celadon', label: 'Celadon Mist', hex: '#a7f3d0' },
        { id: 'c-pistachio', label: 'Pistachio Cream', hex: '#bef264' },
        { id: 'c-olive', label: 'Mediterranean Olive', hex: '#65a30d' }
      ]
    },
    {
      category: 'Ocean Blues & Coastal Tones',
      iconColor: '#0284c7',
      colors: [
        { id: 'c-navy', label: 'Midnight Navy', hex: '#0f172a' },
        { id: 'c-indigo', label: 'Royal Indigo', hex: '#3730a3' },
        { id: 'c-cobalt', label: 'Deep Cobalt', hex: '#1d4ed8' },
        { id: 'c-cyan', label: 'Coastal Cyan', hex: '#0284c7' },
        { id: 'c-powder-sky', label: 'Powder Sky Blue', hex: '#38bdf8' },
        { id: 'c-teal', label: 'Slate Teal', hex: '#0f766e' },
        { id: 'c-arctic', label: 'Arctic Ice Mist', hex: '#bae6fd' },
        { id: 'c-cerulean', label: 'Deep Cerulean', hex: '#0369a1' }
      ]
    },
    {
      category: 'Warm Luxury & Sunset Accents',
      iconColor: '#d97706',
      colors: [
        { id: 'c-champagne', label: 'Champagne Gold', hex: '#fbbf24' },
        { id: 'c-coral', label: 'Warm Sunset Coral', hex: '#f97316' },
        { id: 'c-rose', label: 'Blush Velvet Rose', hex: '#f43f5e' },
        { id: 'c-dusty-rose', label: 'Dusty Pink Rose', hex: '#ec4899' },
        { id: 'c-mauve', label: 'Mauve Berry', hex: '#86198f' },
        { id: 'c-purple', label: 'Imperial Purple', hex: '#7e22ce' },
        { id: 'c-lavender', label: 'Soft Lavender', hex: '#e9d5ff' },
        { id: 'c-saffron', label: 'Mustard Saffron', hex: '#eab308' }
      ]
    },
    {
      category: 'Wood & Timber Stains',
      iconColor: '#5c3a21',
      colors: [
        { id: 'c-wood-oak', label: 'Natural Golden Oak', hex: '#c89d6c' },
        { id: 'c-wood-walnut', label: 'Dark American Walnut', hex: '#5a3825' },
        { id: 'c-wood-teak', label: 'Rich Burmese Teak', hex: '#7c2d12' },
        { id: 'c-wood-ash', label: 'Smoked Charcoal Ash', hex: '#292524' },
        { id: 'c-wood-birch', label: 'Scandinavian Birch', hex: '#d6d3d1' },
        { id: 'c-wood-amber', label: 'Amber Varnished Oak', hex: '#b45309' }
      ]
    }
  ];

  const addRecentColor = (hex: string) => {
    if (!recentColors.includes(hex)) {
      setRecentColors(prev => [hex, ...prev.slice(0, 7)]);
    }
  };

  const handleApplyFloor = async (materialId: RoomFloorMaterial) => {
    const targetRoomId = selectedRoom?.id || sceneData.rooms[0]?.id;
    if (!targetRoomId) return;

    await executeWebMCPTool(
      'apply_material',
      {
        targetId: targetRoomId,
        targetType: 'room_floor',
        materialId
      },
      'user'
    );
  };

  const handleApplyColor = async (hex: string, scope: 'furniture' | 'wall' | 'all_walls') => {
    addRecentColor(hex);

    if (scope === 'furniture' && selectedFurniture) {
      await executeWebMCPTool(
        'apply_material',
        {
          targetId: selectedFurniture.id,
          targetType: 'object',
          materialId: selectedFurniture.material,
          color: hex
        },
        'user'
      );
    } else if (scope === 'wall') {
      const targetRoomId = selectedRoom?.id || sceneData.rooms[0]?.id;
      if (!targetRoomId) return;

      await executeWebMCPTool(
        'apply_material',
        {
          targetId: targetRoomId,
          targetType: 'room_wall',
          materialId: hex,
          color: hex
        },
        'user'
      );
    } else if (scope === 'all_walls') {
      for (const room of sceneData.rooms) {
        await executeWebMCPTool(
          'apply_material',
          {
            targetId: room.id,
            targetType: 'room_wall',
            materialId: hex,
            color: hex
          },
          'user'
        );
      }
    }
  };

  const filteredCollections =
    activeCategory === 'all'
      ? colorCollections
      : colorCollections.filter(c => c.category.toLowerCase().includes(activeCategory.toLowerCase()));

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5 select-none bg-studio-panel">
      {/* Target Indicator Banner */}
      <div className="p-3 bg-studio-surface border border-white/[0.08] rounded-2xl text-xs flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center justify-center">
            <Palette size={16} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-medium">Currently Editing</div>
            <strong className="text-white font-semibold truncate block max-w-[170px]">
              {selectedFurniture
                ? `Furniture: ${selectedFurniture.name}`
                : selectedRoom
                ? `Room: ${selectedRoom.name}`
                : 'Select Room or Furniture'}
            </strong>
          </div>
        </div>

        {selectedFurniture && (
          <span
            className="size-5 rounded-full border border-white/40 shadow-sm"
            style={{ backgroundColor: selectedFurniture.color || '#ffffff' }}
          />
        )}
        {selectedRoom && !selectedFurniture && (
          <span
            className="size-5 rounded-full border border-white/40 shadow-sm"
            style={{ backgroundColor: selectedRoom.wallColor || '#f8fafc' }}
          />
        )}
      </div>

      {/* 1. Custom Full-Spectrum Interactive Color Picker */}
      <div className="space-y-3 p-3.5 glass-card bg-studio-surface border-white/[0.08] rounded-2xl shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Pipette size={14} className="text-amber-400" /> Custom Color Picker
          </h3>
          <span className="text-[10px] font-mono tabular-nums text-slate-400 uppercase">{customColor}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* HTML5 Native Eye Dropper & Color Wheel */}
          <div className="relative size-10 rounded-xl overflow-hidden border border-white/20 shadow-inner shrink-0 cursor-pointer">
            <input
              type="color"
              value={customColor}
              onChange={e => setCustomColor(e.target.value)}
              aria-label="Pick color"
              className="absolute -top-3 -left-3 size-16 cursor-pointer opacity-100"
            />
          </div>

          <div className="flex-1 flex flex-col gap-1">
            <input
              type="text"
              value={customColor}
              onChange={e => setCustomColor(e.target.value)}
              placeholder="#3b82f6"
              className="w-full bg-studio-canvas border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono tabular-nums focus:border-blue-500/80 focus-ring transition"
            />
          </div>
        </div>

        {/* Apply Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {selectedFurniture && (
            <button
              onClick={() => handleApplyColor(customColor, 'furniture')}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-glow-blue transition active:scale-95"
            >
              <Check size={13} />
              Set Furniture Color
            </button>
          )}

          <button
            onClick={() => handleApplyColor(customColor, 'wall')}
            className={`px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-glow-emerald transition active:scale-95 ${
              !selectedFurniture ? 'col-span-2' : ''
            }`}
          >
            <Check size={13} />
            Set Room Wall Color
          </button>
        </div>

        {/* Recent Color History */}
        <div className="pt-2 border-t border-white/[0.08]">
          <div className="text-[10px] text-slate-400 mb-1.5">Recent Swatches:</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {recentColors.map((rc, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCustomColor(rc);
                  if (selectedFurniture) handleApplyColor(rc, 'furniture');
                  else handleApplyColor(rc, 'wall');
                }}
                className="size-6 rounded-lg border border-white/20 shadow hover:scale-110 active:scale-95 transition"
                style={{ backgroundColor: rc }}
                aria-label={`Use ${rc}`}
                title={`Use ${rc}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. Designer Color Palette Swatches (Categorized) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Palette size={14} className="text-blue-400" /> Designer Palette Collections
          </h3>
          <span className="text-[10px] text-slate-400 font-mono tabular-nums">48+ Tones</span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'neutrals', label: 'Neutrals' },
            { id: 'terracotta', label: 'Earthy' },
            { id: 'greens', label: 'Botanical' },
            { id: 'blues', label: 'Ocean' },
            { id: 'sunset', label: 'Luxe' },
            { id: 'wood', label: 'Wood' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition active:scale-95 ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-glow-blue'
                  : 'bg-studio-surface text-slate-400 hover:text-white border border-white/[0.08]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Swatch List */}
        <div className="space-y-3">
          {filteredCollections.map(col => (
            <div key={col.category} className="p-3 bg-studio-surface border border-white/[0.08] rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <span className="size-2 rounded-full" style={{ backgroundColor: col.iconColor }} />
                <span>{col.category}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {col.colors.map(c => {
                  const isCurrentFurniture = selectedFurniture?.color?.toLowerCase() === c.hex.toLowerCase();
                  const isCurrentWall = selectedRoom?.wallColor?.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCustomColor(c.hex);
                        if (selectedFurniture) handleApplyColor(c.hex, 'furniture');
                        else handleApplyColor(c.hex, 'wall');
                      }}
                      className={`p-1.5 rounded-lg border flex items-center gap-2 transition text-left group active:scale-95 ${
                        isCurrentFurniture || isCurrentWall
                          ? 'border-blue-500 bg-blue-600/20'
                          : 'border-white/[0.06] bg-studio-canvas hover:border-white/[0.14]'
                      }`}
                    >
                      <span
                        className="size-5 rounded-md border border-white/20 shadow-sm shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: c.hex }}
                      >
                        {(isCurrentFurniture || isCurrentWall) && (
                          <Check size={11} className="text-slate-900 drop-shadow" />
                        )}
                      </span>
                      <span className="text-[11px] text-slate-200 font-medium truncate group-hover:text-white">
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Floor Surfaces & Finishes */}
      <div className="space-y-3 pt-2 border-t border-white/[0.08]">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Layers size={14} className="text-purple-400" /> Architectural Floor Materials
        </h3>

        <div className="grid grid-cols-1 gap-2">
          {floorMaterials.map(mat => {
            const isCurrent = selectedRoom?.floorMaterial === mat.id;
            return (
              <button
                key={mat.id}
                onClick={() => handleApplyFloor(mat.id)}
                className={`p-2.5 rounded-xl border flex items-center gap-3 transition text-left active:scale-[0.98] ${
                  isCurrent
                    ? 'bg-blue-600/15 border-blue-500 shadow-glow-blue ring-1 ring-blue-500/30'
                    : 'bg-studio-surface border-white/[0.08] hover:border-white/[0.16]'
                }`}
              >
                <div
                  className="size-8 rounded-xl border border-white/20 shadow-inner shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: mat.previewColor }}
                >
                  {isCurrent && <Check size={14} className="text-slate-900 drop-shadow" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{mat.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{mat.style}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
