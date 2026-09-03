import React, { useState, useEffect } from 'react';
import { uiStore, UIState } from '../../state/uiStore';
import { sceneStore, SceneData } from '../../state/sceneStore';
import { executeWebMCPTool } from '../../webmcp/registry';
import {
  Sliders,
  Move,
  RotateCcw,
  Maximize2,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Layers,
  ChevronRight,
  Info,
  Check,
  Palette,
  Pipette,
  Sparkles,
  Compass,
  Minus,
  Plus,
  Link2,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  ArrowLeft
} from 'lucide-react';

export const InspectorPanel: React.FC = () => {
  const [uiState, setUiState] = useState<UIState>(uiStore.getState());
  const [sceneData, setSceneData] = useState<SceneData>(sceneStore.getData());
  const [customColor, setCustomColor] = useState<string>('#3b82f6');

  // Room connection state
  const [connectTargetId, setConnectTargetId] = useState<string>('');
  const [connectDirection, setConnectDirection] = useState<'above' | 'right' | 'below' | 'left'>('right');
  const [connectWidth, setConnectWidth] = useState<number>(4);
  const [isConnectOpen, setIsConnectOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubUI = uiStore.subscribe(u => setUiState({ ...u }));
    const unsubScene = sceneStore.subscribe(s => setSceneData({ ...s }));
    return () => {
      unsubUI();
      unsubScene();
    };
  }, []);

  if (!uiState.isInspectorOpen) return null;

  const selectedFurniture = sceneData.furniture.find(f => f.id === uiState.selectedId);
  const selectedRoom = sceneData.rooms.find(r => r.id === uiState.selectedId);

  // Position change
  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    if (selectedFurniture) {
      sceneStore.moveObject(selectedFurniture.id, {
        ...selectedFurniture.position,
        [axis]: value
      });
    } else if (selectedRoom) {
      sceneStore.moveRoom(selectedRoom.id, {
        ...selectedRoom.position,
        [axis]: value
      });
    }
  };

  // Rotation change (primarily Y yaw in deg)
  const handleRotationChange = (axis: 'x' | 'y' | 'z', value: number) => {
    if (selectedFurniture) {
      sceneStore.rotateObject(selectedFurniture.id, {
        ...selectedFurniture.rotation,
        [axis]: value
      });
    }
  };

  // Dimensions change
  const handleDimensionChange = (dim: 'w' | 'h' | 'd', value: number) => {
    if (selectedRoom) {
      if (dim === 'w') sceneStore.setRoomDimensions(selectedRoom.id, value, selectedRoom.depth);
      if (dim === 'd') sceneStore.setRoomDimensions(selectedRoom.id, selectedRoom.width, value);
      if (dim === 'h') sceneStore.changeCeilingHeight(value, selectedRoom.id);
    } else if (selectedFurniture) {
      const natural = selectedFurniture.dimensions;
      let scaleX = selectedFurniture.scale.x;
      let scaleY = selectedFurniture.scale.y;
      let scaleZ = selectedFurniture.scale.z;

      if (dim === 'w' && natural.x > 0) scaleX = value / natural.x;
      if (dim === 'h' && natural.y > 0) scaleY = value / natural.y;
      if (dim === 'd' && natural.z > 0) scaleZ = value / natural.z;

      sceneStore.scaleObject(selectedFurniture.id, { x: scaleX, y: scaleY, z: scaleZ });
    }
  };

  // Step dimension +/- 0.5ft
  const handleStepDimension = (dim: 'w' | 'h' | 'd', delta: number) => {
    if (!selectedFurniture) return;
    const currentVal =
      dim === 'w'
        ? selectedFurniture.dimensions.x * selectedFurniture.scale.x
        : dim === 'h'
        ? selectedFurniture.dimensions.y * selectedFurniture.scale.y
        : selectedFurniture.dimensions.z * selectedFurniture.scale.z;
    const nextVal = Math.max(1.0, currentVal + delta);
    handleDimensionChange(dim, nextVal);
  };

  // Fit furniture to wall adjacent to room
  const handleFitToWall = (wallDirection: 'nearest' | 'top' | 'bottom' | 'left' | 'right' = 'nearest') => {
    if (!selectedFurniture) return;
    const res = sceneStore.fitFurnitureToWall(selectedFurniture.id, {
      wallDirection,
      snapToWall: true
    });
    if (res) {
      uiStore.showToast(
        'Fitted to Wall',
        `Adjusted ${res.name} to (${res.newDimensions.x.toFixed(1)}ft x ${res.newDimensions.z.toFixed(1)}ft) against ${res.wallDirection} wall.`,
        'success'
      );
      sceneStore.highlightObject(selectedFurniture.id, 2000);
    }
  };

  // Quick preset dimensions
  const handleApplyPresetWidth = (targetWidth: number, targetDepth?: number) => {
    if (!selectedFurniture) return;
    sceneStore.setObjectDimensions(selectedFurniture.id, {
      width: targetWidth,
      depth: targetDepth
    });
    uiStore.showToast(
      'Dimension Updated',
      `Set ${selectedFurniture.name} to ${targetWidth}ft${targetDepth ? ` x ${targetDepth}ft` : ''}.`,
      'info'
    );
    sceneStore.highlightObject(selectedFurniture.id, 1500);
  };

  // Color change
  const handleColorChange = async (hex: string) => {
    setCustomColor(hex);
    if (selectedFurniture) {
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
    } else if (selectedRoom) {
      await executeWebMCPTool(
        'apply_material',
        {
          targetId: selectedRoom.id,
          targetType: 'room_wall',
          materialId: hex,
          color: hex
        },
        'user'
      );
    }
  };

  // Lock toggle
  const handleToggleLock = async () => {
    const targetId = selectedFurniture?.id || selectedRoom?.id;
    const isLocked = selectedFurniture?.locked || selectedRoom?.locked || false;
    if (targetId) {
      await executeWebMCPTool('set_transform_lock', { targetId, locked: !isLocked }, 'user');
    }
  };

  // Delete
  const handleDelete = async () => {
    if (selectedFurniture) {
      await executeWebMCPTool('delete_object', { objectId: selectedFurniture.id }, 'user');
    } else if (selectedRoom) {
      await executeWebMCPTool('delete_room', { roomId: selectedRoom.id }, 'user');
    }
  };

  // Duplicate
  const handleDuplicate = async () => {
    if (selectedFurniture) {
      await executeWebMCPTool(
        'add_furniture',
        {
          type: selectedFurniture.type,
          roomId: selectedFurniture.roomId,
          name: `${selectedFurniture.name} (Copy)`,
          position: {
            x: selectedFurniture.position.x + 2,
            y: selectedFurniture.position.y,
            z: selectedFurniture.position.z + 2
          },
          rotation: selectedFurniture.rotation,
          scale: selectedFurniture.scale
        },
        'user'
      );
    }
  };

  const quickSwatches = [
    '#ffffff',
    '#f8fafc',
    '#38bdf8',
    '#0284c7',
    '#10b981',
    '#ea580c',
    '#f59e0b',
    '#f43f5e',
    '#a855f7',
    '#5c3a21',
    '#334155',
    '#09090b'
  ];

  return (
    <div className="w-72 h-full bg-[#141721] border-l border-slate-800/80 flex flex-col z-20 select-none overflow-hidden">
      {/* Inspector Header */}
      <div className="p-3 border-b border-slate-800 bg-[#11131a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-blue-400" />
          <span className="text-xs font-semibold text-white">Precision Inspector</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Feet (ft)</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {selectedFurniture ? (
          /* Furniture Object Inspector */
          <div className="space-y-4">
            {/* Title & Category */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {selectedFurniture.category}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">ID: {selectedFurniture.id}</span>
              </div>
              <h3 className="text-sm font-semibold text-white">{selectedFurniture.name}</h3>
              <p className="text-[11px] text-slate-400">
                In Space:{' '}
                <strong className="text-slate-200">
                  {sceneData.rooms.find(r => r.id === selectedFurniture.roomId)?.name || 'Studio'}
                </strong>
              </p>
            </div>

            {/* Position (X, Y, Z in feet) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Move size={12} className="text-blue-400" /> Coordinates (X, Y, Z in ft)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['x', 'y', 'z'] as const).map(axis => (
                  <div key={axis} className="bg-[#181c28] border border-slate-700/80 rounded-lg p-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">{axis}</span>
                    <input
                      type="number"
                      step={0.5}
                      value={Number(selectedFurniture.position[axis].toFixed(2))}
                      onChange={e => handlePositionChange(axis, parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Dimensions (W, H, D in feet) with +/- steps */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Maximize2 size={12} className="text-emerald-400" /> Dimensions (W, H, D in ft)
                </label>
                <span className="text-[10px] text-slate-500 font-mono">0.5ft step</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'w', label: 'Width', val: selectedFurniture.dimensions.x * selectedFurniture.scale.x },
                  { id: 'h', label: 'Height', val: selectedFurniture.dimensions.y * selectedFurniture.scale.y },
                  { id: 'd', label: 'Depth', val: selectedFurniture.dimensions.z * selectedFurniture.scale.z }
                ].map(item => (
                  <div key={item.id} className="bg-[#181c28] border border-slate-700/80 rounded-lg p-1.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-slate-400 font-mono">{item.label}</span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleStepDimension(item.id as any, -0.5)}
                          className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-[9px] transition"
                        >
                          <Minus size={8} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepDimension(item.id as any, +0.5)}
                          className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-[9px] transition"
                        >
                          <Plus size={8} />
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      step={0.5}
                      min={0.5}
                      value={Number(item.val.toFixed(2))}
                      onChange={e => handleDimensionChange(item.id as any, parseFloat(e.target.value) || 1)}
                      className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* Quick Dimension Sizing Presets */}
              <div className="space-y-1 pt-1">
                <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center justify-between">
                  <span>Sizing Presets</span>
                  {selectedFurniture.type.includes('wardrobe') && (
                    <span className="text-amber-400 font-sans">Ideal for small rooms</span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {selectedFurniture.type.includes('wardrobe') || selectedFurniture.name.toLowerCase().includes('wardrobe') || selectedFurniture.category === 'storage' ? (
                    <>
                      <button
                        onClick={() => handleApplyPresetWidth(3.5, 1.8)}
                        className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700/60 text-[10px] text-slate-300 font-mono transition text-center"
                      >
                        3.5' Mini
                      </button>
                      <button
                        onClick={() => handleApplyPresetWidth(4.5, 1.9)}
                        className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700/60 text-[10px] text-slate-300 font-mono transition text-center"
                      >
                        4.5' Std
                      </button>
                      <button
                        onClick={() => handleApplyPresetWidth(6.0, 2.0)}
                        className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700/60 text-[10px] text-slate-300 font-mono transition text-center"
                      >
                        6.0' Wide
                      </button>
                      <button
                        onClick={() => handleApplyPresetWidth(7.5, 2.2)}
                        className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700/60 text-[10px] text-slate-300 font-mono transition text-center"
                      >
                        7.5' Grand
                      </button>
                    </>
                  ) : selectedFurniture.type.includes('bed') || selectedFurniture.category === 'bedroom' ? (
                    <>
                      <button
                        onClick={() => handleApplyPresetWidth(3.5, 6.2)}
                        className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700/60 text-[10px] text-slate-300 font-mono transition text-center"
                      >
                        3.5' Single
                      </button>
                      <button
                        onClick={() => handleApplyPresetWidth(4.5, 6.5)}
                        className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700/60 text-[10px] text-slate-300 font-mono transition text-center"
                      >
                        4.5' Double
                      </button>
                      <button
                        onClick={() => handleApplyPresetWidth(5.0, 6.5)}
                        className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700/60 text-[10px] text-slate-300 font-mono transition text-center"
                      >
                        5.0' Queen
                      </button>
                      <button
                        onClick={() => handleApplyPresetWidth(6.2, 6.8)}
                        className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700/60 text-[10px] text-slate-300 font-mono transition text-center"
                      >
                        6.2' King
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApplyPresetWidth(3.5)}
                        className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700/60 text-[10px] text-slate-300 font-mono transition text-center"
                      >
                        3.5' Sm
                      </button>
                      <button
                        onClick={() => handleApplyPresetWidth(4.5)}
                        className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700/60 text-[10px] text-slate-300 font-mono transition text-center"
                      >
                        4.5' Med
                      </button>
                      <button
                        onClick={() => handleApplyPresetWidth(6.0)}
                        className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700/60 text-[10px] text-slate-300 font-mono transition text-center"
                      >
                        6.0' Lg
                      </button>
                      <button
                        onClick={() => handleApplyPresetWidth(7.5)}
                        className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700/60 text-[10px] text-slate-300 font-mono transition text-center"
                      >
                        7.5' XL
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Auto-Fit Adjacent Floor Plan Wall */}
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-500/30 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-300 flex items-center gap-1.5">
                    <Compass size={12} className="text-blue-400" /> Wall & Room Layout Fit
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                    Auto-Fit
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Resize and snap this piece flush against the adjacent floor plan wall with clean zero-clip clearance.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFitToWall('nearest')}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <Sparkles size={12} /> Auto-Fit Wall
                  </button>
                  <div className="flex gap-1">
                    {(['top', 'bottom', 'left', 'right'] as const).map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => handleFitToWall(w)}
                        title={`Fit & Snap flush against ${w} wall`}
                        className="flex-1 py-1.5 bg-slate-800/90 hover:bg-blue-600/30 hover:border-blue-500 text-[10px] uppercase font-mono text-slate-300 rounded-lg border border-slate-700/60 transition text-center"
                      >
                        {w[0].toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Rotation (Yaw Y-axis degrees) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <RotateCcw size={12} className="text-amber-400" /> Yaw Rotation ({selectedFurniture.rotation.y}°)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={15}
                  value={((selectedFurniture.rotation.y % 360) + 360) % 360}
                  onChange={e => handleRotationChange('y', Number(e.target.value))}
                  className="flex-1 accent-blue-500 cursor-pointer"
                />
                <button
                  onClick={() => handleRotationChange('y', (selectedFurniture.rotation.y + 90) % 360)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 rounded"
                >
                  +90°
                </button>
              </div>
            </div>

            {/* Color & Material Swatches */}
            <div className="space-y-2 p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Palette size={12} className="text-purple-400" /> Object Color & Finish
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={selectedFurniture.color || customColor}
                    onChange={e => handleColorChange(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {selectedFurniture.color || '#475569'}
                  </span>
                </div>
              </div>

              {/* Quick Swatches Grid */}
              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {quickSwatches.map(hex => (
                  <button
                    key={hex}
                    onClick={() => handleColorChange(hex)}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition ${
                      selectedFurniture.color === hex
                        ? 'border-blue-400 scale-105 shadow-md ring-2 ring-blue-500/50'
                        : 'border-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  >
                    {selectedFurniture.color === hex && <Check size={12} className="text-slate-900 drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: Lock, Duplicate, Delete */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                onClick={handleToggleLock}
                className="w-full py-1.5 px-3 bg-[#181c28] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition"
              >
                {selectedFurniture.locked ? <Lock size={13} className="text-amber-400" /> : <Unlock size={13} />}
                {selectedFurniture.locked ? 'Unlock Object' : 'Lock Transform'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDuplicate}
                  className="py-1.5 px-3 bg-[#181c28] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <Copy size={13} />
                  Duplicate
                </button>

                <button
                  onClick={handleDelete}
                  className="py-1.5 px-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg text-xs font-medium text-rose-300 flex items-center justify-center gap-1.5 transition"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : selectedRoom ? (
          /* Room Inspector */
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Architectural Space
              </span>
              <h3 className="text-sm font-semibold text-white">{selectedRoom.name}</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Floor Area: <strong className="text-blue-400">{selectedRoom.width * selectedRoom.depth} sq.ft</strong>
              </p>
            </div>

            {/* Room Dimensions */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Room Bounds (ft)</label>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-[#181c28] border border-slate-700/80 rounded-lg p-1.5">
                  <span className="text-[10px] text-slate-400 block font-mono">Width</span>
                  <input
                    type="number"
                    min={4}
                    value={selectedRoom.width}
                    onChange={e => handleDimensionChange('w', Number(e.target.value))}
                    className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div className="bg-[#181c28] border border-slate-700/80 rounded-lg p-1.5">
                  <span className="text-[10px] text-slate-400 block font-mono">Depth</span>
                  <input
                    type="number"
                    min={4}
                    value={selectedRoom.depth}
                    onChange={e => handleDimensionChange('d', Number(e.target.value))}
                    className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div className="bg-[#181c28] border border-slate-700/80 rounded-lg p-1.5">
                  <span className="text-[10px] text-slate-400 block font-mono">Ceiling</span>
                  <input
                    type="number"
                    min={6}
                    value={selectedRoom.height}
                    onChange={e => handleDimensionChange('h', Number(e.target.value))}
                    className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Position */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Center Position (ft)</label>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-[#181c28] border border-slate-700/80 rounded-lg p-1.5">
                  <span className="text-[10px] text-slate-400 block font-mono">X Axis</span>
                  <input
                    type="number"
                    value={selectedRoom.position.x}
                    onChange={e => handlePositionChange('x', Number(e.target.value))}
                    className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div className="bg-[#181c28] border border-slate-700/80 rounded-lg p-1.5">
                  <span className="text-[10px] text-slate-400 block font-mono">Z Axis</span>
                  <input
                    type="number"
                    value={selectedRoom.position.z}
                    onChange={e => handlePositionChange('z', Number(e.target.value))}
                    className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Room Wall Paint Swatches */}
            <div className="space-y-2 p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Palette size={12} className="text-emerald-400" /> Wall Paint Color
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={selectedRoom.wallColor || '#f8fafc'}
                    onChange={e => handleColorChange(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {selectedRoom.wallColor || '#f8fafc'}
                  </span>
                </div>
              </div>

              {/* Quick Swatches Grid */}
              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {quickSwatches.map(hex => (
                  <button
                    key={hex}
                    onClick={() => handleColorChange(hex)}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition ${
                      selectedRoom.wallColor === hex
                        ? 'border-emerald-400 scale-105 shadow-md ring-2 ring-emerald-500/50'
                        : 'border-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  >
                    {selectedRoom.wallColor === hex && <Check size={12} className="text-slate-900 drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Connected Spaces & Doorway Gates */}
            <div className="space-y-2 p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Link2 size={12} className="text-blue-400" /> Space Interconnections
                </label>
                {sceneData.rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const others = sceneData.rooms.filter(r => r.id !== selectedRoom.id);
                      if (!connectTargetId && others.length > 0) setConnectTargetId(others[0].id);
                      setIsConnectOpen(!isConnectOpen);
                    }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {isConnectOpen ? 'Close' : '+ Connect Space'}
                  </button>
                )}
              </div>

              {/* Existing Gates List */}
              {sceneData.gates.filter(g => g.roomIdA === selectedRoom.id || g.roomIdB === selectedRoom.id).length > 0 ? (
                <div className="space-y-1 pt-1">
                  {sceneData.gates
                    .filter(g => g.roomIdA === selectedRoom.id || g.roomIdB === selectedRoom.id)
                    .map(g => {
                      const otherId = g.roomIdA === selectedRoom.id ? g.roomIdB : g.roomIdA;
                      const otherRoom = sceneData.rooms.find(r => r.id === otherId);
                      return (
                        <div
                          key={g.id}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-[#141724] border border-slate-800 text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 text-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="font-medium truncate max-w-[120px]">{otherRoom?.name || 'Adjacent'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {g.width}ft doorway ({g.wallDirection})
                          </span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-[10px] text-amber-400/90 py-1 flex items-center gap-1.5">
                  <Info size={11} className="shrink-0" />
                  <span>Standalone space (no doorways connected yet)</span>
                </div>
              )}

              {/* Connect Form */}
              {isConnectOpen && sceneData.rooms.length > 1 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Connect to Room</label>
                    <select
                      value={connectTargetId || (sceneData.rooms.find(r => r.id !== selectedRoom.id)?.id || '')}
                      onChange={e => setConnectTargetId(e.target.value)}
                      className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {sceneData.rooms
                        .filter(r => r.id !== selectedRoom.id)
                        .map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Attach Direction (Auto-Doorway)</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'above', label: 'Above', icon: ArrowUp },
                        { id: 'right', label: 'Right', icon: ArrowRight },
                        { id: 'below', label: 'Below', icon: ArrowDown },
                        { id: 'left', label: 'Left', icon: ArrowLeft }
                      ].map(dir => {
                        const Icon = dir.icon;
                        const isSel = connectDirection === dir.id;
                        return (
                          <button
                            type="button"
                            key={dir.id}
                            onClick={() => setConnectDirection(dir.id as any)}
                            className={`flex items-center justify-center gap-1 py-1 rounded-md border text-[10px] font-medium transition ${
                              isSel
                                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                : 'bg-[#12141c] border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Icon size={10} />
                            {dir.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Door:</span>
                      {[3, 4, 5, 6].map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setConnectWidth(w)}
                          className={`px-1.5 py-0.5 rounded text-[10px] border ${
                            connectWidth === w
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-[#11131a] border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {w}'
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const targetId = connectTargetId || sceneData.rooms.find(r => r.id !== selectedRoom.id)?.id;
                        if (!targetId) return;
                        const target = sceneData.rooms.find(r => r.id === targetId);
                        const gate = sceneStore.connectRooms(
                          targetId,
                          selectedRoom.id,
                          connectDirection,
                          connectWidth
                        );
                        if (gate) {
                          uiStore.addToast(
                            'Spaces Connected',
                            `Connected "${selectedRoom.name}" to "${target?.name}" with ${gate.width}ft doorway`,
                            'success'
                          );
                          setIsConnectOpen(false);
                        }
                      }}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition shadow"
                    >
                      <Check size={12} /> Connect
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                onClick={handleToggleLock}
                className="w-full py-1.5 px-3 bg-[#181c28] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition"
              >
                {selectedRoom.locked ? <Lock size={13} className="text-amber-400" /> : <Unlock size={13} />}
                {selectedRoom.locked ? 'Unlock Room' : 'Lock Room Geometry'}
              </button>

              <button
                onClick={handleDelete}
                className="w-full py-1.5 px-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg text-xs font-medium text-rose-300 flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 size={13} />
                Delete Space
              </button>
            </div>
          </div>
        ) : (
          /* General Scene Info */
          <div className="space-y-4 py-2">
            <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-xl text-xs text-blue-300 flex items-center gap-2.5">
              <Info size={16} className="text-blue-400 shrink-0" />
              <span>Click any furniture or room on the 3D canvas or spaces list to inspect and edit.</span>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Residence Overview
              </label>
              <div className="space-y-1.5 font-mono text-xs text-slate-300">
                <div className="flex items-center justify-between p-2 bg-[#181c28] rounded-lg">
                  <span className="text-slate-400">Total Spaces:</span>
                  <strong className="text-white">{sceneData.rooms.length}</strong>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#181c28] rounded-lg">
                  <span className="text-slate-400">Total Area:</span>
                  <strong className="text-blue-400">
                    {sceneData.rooms.reduce((a, r) => a + r.width * r.depth, 0)} sq.ft
                  </strong>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#181c28] rounded-lg">
                  <span className="text-slate-400">Placed Objects:</span>
                  <strong className="text-white">{sceneData.furniture.length}</strong>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#181c28] rounded-lg">
                  <span className="text-slate-400">Ceiling Height:</span>
                  <strong className="text-white">{sceneData.globalCeilingHeight} ft</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
