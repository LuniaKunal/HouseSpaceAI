import React, { useState, useEffect } from 'react';
import { sceneStore, SceneData } from '../../state/sceneStore';
import { uiStore, UIState } from '../../state/uiStore';
import { executeWebMCPTool } from '../../webmcp/registry';
import {
  Plus,
  Trash2,
  Lock,
  Unlock,
  Edit2,
  Check,
  Compass,
  Home,
  Link2,
  Unlink,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { Room, RoomFloorMaterial, CornerNotch } from '../../types/scene';
import { getRoomAreaSqFt } from '../../geometry/roomGeometry';

interface RoomPreset {
  name: string;
  w: number;
  d: number;
  material: RoomFloorMaterial;
  notch?: CornerNotch;
}

const ROOM_PRESETS: RoomPreset[] = [
  { name: 'Living Room', w: 18, d: 16, material: 'hardwood_oak' },
  { name: 'Master Bedroom', w: 16, d: 14, material: 'hardwood_walnut' },
  { name: 'L-Shaped Suite', w: 16, d: 14, material: 'hardwood_walnut', notch: { corner: 'bottom-right', width: 5, depth: 6 } },
  { name: 'Bedroom', w: 12, d: 12, material: 'hardwood_oak' },
  { name: 'Kitchen', w: 12, d: 10, material: 'ceramic_tile' },
  { name: 'Bathroom', w: 8, d: 8, material: 'marble_carrara' },
  { name: 'Home Office', w: 12, d: 12, material: 'hardwood_oak' },
  { name: 'Dining Room', w: 14, d: 12, material: 'hardwood_walnut' },
  { name: 'Balcony', w: 10, d: 6, material: 'concrete_polished' }
];

const FLOOR_MATERIALS: Array<{ id: RoomFloorMaterial; label: string }> = [
  { id: 'hardwood_oak', label: 'Oak Hardwood' },
  { id: 'hardwood_walnut', label: 'Walnut Hardwood' },
  { id: 'herringbone_wood', label: 'Herringbone Wood' },
  { id: 'marble_carrara', label: 'Carrara Marble' },
  { id: 'marble_nero', label: 'Nero Marble' },
  { id: 'ceramic_tile', label: 'Ceramic Tile' },
  { id: 'terrazzo', label: 'Terrazzo' },
  { id: 'concrete_polished', label: 'Polished Concrete' },
  { id: 'carpet_plush', label: 'Plush Carpet' }
];

export const SpacesPanel: React.FC = () => {
  const [sceneData, setSceneData] = useState<SceneData>(sceneStore.getData());
  const [uiState, setUiState] = useState<UIState>(uiStore.getState());

  // New room modal / form state
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [creationMode, setCreationMode] = useState<'connected' | 'standalone'>('connected');
  const [targetRoomId, setTargetRoomId] = useState<string>('');
  const [newRoomName, setNewRoomName] = useState('Living Room');
  const [newRoomWidth, setNewRoomWidth] = useState(16);
  const [newRoomDepth, setNewRoomDepth] = useState(14);
  const [connectionDirection, setConnectionDirection] = useState<'above' | 'right' | 'below' | 'left'>('right');
  const [connectionAlignment, setConnectionAlignment] = useState<'start' | 'center' | 'end'>('center');
  const [selectedMaterial, setSelectedMaterial] = useState<RoomFloorMaterial>('hardwood_oak');

  // L-Shaped Room Form State
  const [roomShape, setRoomShape] = useState<'rectangle' | 'l-shape'>('rectangle');
  const [notchCorner, setNotchCorner] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');
  const [notchWidth, setNotchWidth] = useState(5);
  const [notchDepth, setNotchDepth] = useState(6);

  // Inline rename state
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    const unsubScene = sceneStore.subscribe(d => setSceneData({ ...d }));
    const unsubUI = uiStore.subscribe(u => setUiState({ ...u }));
    return () => {
      unsubScene();
      unsubUI();
    };
  }, []);

  // Synchronize target room whenever selection or room list changes
  const selectedRoom = sceneData.rooms.find(r => r.id === uiState.selectedId);

  useEffect(() => {
    if (selectedRoom) {
      setTargetRoomId(selectedRoom.id);
    } else if (sceneData.rooms.length > 0 && (!targetRoomId || !sceneData.rooms.some(r => r.id === targetRoomId))) {
      setTargetRoomId(sceneData.rooms[0].id);
    }
  }, [uiState.selectedId, sceneData.rooms]);

  // When opening add form, adapt defaults
  const handleOpenAddRoom = () => {
    if (sceneData.rooms.length === 0) {
      setCreationMode('standalone');
      setNewRoomName('Living Room');
      setNewRoomWidth(18);
      setNewRoomDepth(16);
      setSelectedMaterial('hardwood_oak');
    } else {
      setCreationMode('connected');
      setNewRoomName('Home Office / Study');
      setNewRoomWidth(12);
      setNewRoomDepth(12);
      const activeTarget = selectedRoom || sceneData.rooms[0];
      setTargetRoomId(activeTarget.id);
      setSelectedMaterial(activeTarget.floorMaterial || 'hardwood_oak');
    }
    setIsAddingRoom(true);
  };

  const handleSelectRoom = (room: Room) => {
    uiStore.setSelected(room.id, 'room');
  };

  const handleStartRename = (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoomId(room.id);
    setEditingName(room.name);
  };

  const handleSaveRename = async (roomId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingName.trim()) {
      await executeWebMCPTool('rename_room', { roomId, newName: editingName.trim() }, 'user');
    }
    setEditingRoomId(null);
  };

  const handleToggleLock = async (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    await executeWebMCPTool('set_transform_lock', { targetId: room.id, locked: !room.locked }, 'user');
  };

  const handleDeleteRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await executeWebMCPTool('delete_room', { roomId }, 'user');
  };

  // Connect existing room state
  const [connectingRoomId, setConnectingRoomId] = useState<string | null>(null);
  const [connectTargetId, setConnectTargetId] = useState<string>('');
  const [connectDirection, setConnectDirection] = useState<'above' | 'right' | 'below' | 'left'>('right');
  const [connectWidth, setConnectWidth] = useState<number>(4);

  const handleStartConnect = (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectingRoomId === room.id) {
      setConnectingRoomId(null);
      return;
    }
    const otherRooms = sceneData.rooms.filter(r => r.id !== room.id);
    if (otherRooms.length === 0) return;
    setConnectingRoomId(room.id);
    setConnectTargetId(otherRooms[0].id);
  };

  const handleExecuteConnect = (room: Room, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!connectTargetId) return;
    const targetRoom = sceneData.rooms.find(r => r.id === connectTargetId);
    if (!targetRoom) return;

    const gate = sceneStore.connectRooms(
      connectTargetId,
      room.id,
      connectDirection,
      connectWidth
    );

    if (gate) {
      uiStore.setSelected(room.id, 'room');
      uiStore.addToast(
        'Rooms Connected',
        `Connected "${room.name}" to "${targetRoom.name}" with a ${gate.width}ft doorway gate`,
        'success'
      );
      setConnectingRoomId(null);
    } else {
      uiStore.addToast('Connection Failed', 'Could not connect the spaces', 'error');
    }
  };

  const applyPreset = (preset: RoomPreset) => {
    setNewRoomName(preset.name);
    setNewRoomWidth(preset.w);
    setNewRoomDepth(preset.d);
    setSelectedMaterial(preset.material);
    if (preset.notch) {
      setRoomShape('l-shape');
      setNotchCorner(preset.notch.corner);
      setNotchWidth(preset.notch.width);
      setNotchDepth(preset.notch.depth);
    } else {
      setRoomShape('rectangle');
    }
  };

  const handleCreateRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = newRoomName.trim() || (sceneData.rooms.length === 0 ? 'Living Room' : `Room ${sceneData.rooms.length + 1}`);
    const w = Math.max(4, Math.min(80, Number(newRoomWidth) || 12));
    const d = Math.max(4, Math.min(80, Number(newRoomDepth) || 12));

    const notch: CornerNotch | undefined =
      roomShape === 'l-shape'
        ? {
            corner: notchCorner,
            width: Math.min(Math.max(1, Number(notchWidth) || 4), w - 1),
            depth: Math.min(Math.max(1, Number(notchDepth) || 4), d - 1)
          }
        : undefined;

    const isInitialRoom = sceneData.rooms.length === 0;
    const isStandalone = isInitialRoom || creationMode === 'standalone';

    if (isStandalone) {
      let posX = 0;
      let posZ = 0;

      if (!isInitialRoom) {
        // Place neatly to the right of existing rooms without overlapping
        const maxX = Math.max(...sceneData.rooms.map(r => r.position.x + r.width / 2));
        const avgZ = sceneData.rooms.reduce((acc, r) => acc + r.position.z, 0) / sceneData.rooms.length;
        posX = Math.round(maxX + w / 2 + 2);
        posZ = Math.round(avgZ);
      }

      const newRoom = sceneStore.createRoom({
        name: trimmedName,
        width: w,
        depth: d,
        position: { x: posX, y: 0, z: posZ },
        floorMaterial: selectedMaterial,
        notch
      });

      if (newRoom) {
        uiStore.setSelected(newRoom.id, 'room');
        setIsAddingRoom(false);
        const shapeStr = notch ? `L-shaped space (${w}×${d} ft with ${notch.corner} cutout)` : `space (${w}×${d} ft)`;
        uiStore.addToast(
          'Room Created',
          isInitialRoom
            ? `Created primary ${shapeStr} "${newRoom.name}"`
            : `Created standalone ${shapeStr} "${newRoom.name}"`,
          'success'
        );
      }
    } else {
      // Connected room mode
      const refRoom = sceneData.rooms.find(r => r.id === targetRoomId) || selectedRoom || sceneData.rooms[0];
      if (!refRoom) {
        // Fallback to standalone if no reference room could be resolved
        const newRoom = sceneStore.createRoom({
          name: trimmedName,
          width: w,
          depth: d,
          position: { x: 0, y: 0, z: 0 },
          floorMaterial: selectedMaterial,
          notch
        });
        if (newRoom) {
          uiStore.setSelected(newRoom.id, 'room');
          setIsAddingRoom(false);
          uiStore.addToast('Room Created', `Created space "${newRoom.name}"`, 'success');
        }
        return;
      }

      const newRoom = sceneStore.addConnectedRoom(
        refRoom.id,
        connectionDirection,
        trimmedName,
        w,
        d,
        selectedMaterial,
        4,
        notch,
        connectionAlignment
      );

      if (newRoom) {
        uiStore.setSelected(newRoom.id, 'room');
        setIsAddingRoom(false);
        const shapeStr = notch ? `L-shaped "${newRoom.name}"` : `"${newRoom.name}"`;
        uiStore.addToast('Room Created', `Added ${shapeStr} connected to ${refRoom.name}`, 'success');
      }
    }
  };

  const totalArea = sceneData.rooms.reduce((acc, r) => acc + getRoomAreaSqFt(r), 0);
  const resolvedTargetRoom = sceneData.rooms.find(r => r.id === targetRoomId) || selectedRoom || sceneData.rooms[0];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-studio-panel">
      {/* Header Summary */}
      <div className="p-3 border-b border-white/[0.08] bg-studio-surface/80 flex items-center justify-between shrink-0">
        <div>
          <span className="text-xs font-semibold text-white">Residence Spaces</span>
          <p className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
            <span>{sceneData.rooms.length}</span> Spaces &bull; <strong className="text-blue-400 font-mono tabular-nums font-semibold">{totalArea.toLocaleString()} sq.ft</strong>
          </p>
        </div>

        <button
          onClick={() => (isAddingRoom ? setIsAddingRoom(false) : handleOpenAddRoom())}
          aria-label={isAddingRoom ? 'Cancel adding space' : 'Add Space'}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-glow-blue active:scale-95"
        >
          <Plus size={14} />
          <span>{isAddingRoom ? 'Close' : 'Add Space'}</span>
        </button>
      </div>

      {/* Room Creation Form */}
      {isAddingRoom && (
        <form
          onSubmit={handleCreateRoom}
          className="bg-studio-surface border-b border-white/[0.08] flex flex-col shrink-0 animate-in-scale shadow-xl"
        >
          {/* Scrollable Form Body */}
          <div className="p-3.5 space-y-2.5 overflow-y-auto max-h-[380px]">
            {/* Header Title */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                {sceneData.rooms.length === 0 ? (
                  <>
                    <Home size={14} /> Create Primary Space
                  </>
                ) : creationMode === 'connected' ? (
                  <>
                    <Link2 size={14} /> Connect to Space
                  </>
                ) : (
                  <>
                    <Unlink size={14} /> Standalone Space
                  </>
                )}
              </span>
              <span className="text-[10px] text-slate-400">
                {sceneData.rooms.length === 0 ? (
                  <span className="text-emerald-400 font-medium">Origin (0,0)</span>
                ) : creationMode === 'connected' ? (
                  <span>
                    To: <strong className="text-white truncate max-w-[100px] inline-block align-bottom">{resolvedTargetRoom?.name || 'Living'}</strong>
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">Independent</span>
                )}
              </span>
            </div>

            {/* Mode Selector (When existing rooms exist) */}
            {sceneData.rooms.length > 0 && (
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-studio-canvas rounded-xl border border-white/[0.08] text-[11px]">
                <button
                  type="button"
                  onClick={() => setCreationMode('connected')}
                  className={`flex items-center justify-center gap-1 py-1 rounded-lg transition ${
                    creationMode === 'connected'
                      ? 'bg-blue-600 text-white font-medium shadow-glow-blue'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Link2 size={12} />
                  Connected
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('standalone')}
                  className={`flex items-center justify-center gap-1 py-1 rounded-lg transition ${
                    creationMode === 'standalone'
                      ? 'bg-blue-600 text-white font-medium shadow-glow-blue'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Unlink size={12} />
                  Standalone
                </button>
              </div>
            )}

            {/* Quick Presets Pills */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Quick Presets</label>
                <span className="text-[10px] text-slate-500 flex items-center gap-0.5 font-mono">
                  <Sparkles size={10} /> 1-Click
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {ROOM_PRESETS.slice(0, 6).map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] border transition ${
                      newRoomName === p.name
                        ? 'bg-blue-600/20 border-blue-500/60 text-blue-300 font-medium'
                        : 'bg-studio-canvas border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.16]'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Name */}
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Room Name</label>
              <input
                type="text"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                placeholder="e.g. Master Bedroom"
                className="w-full bg-studio-canvas border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-blue-500/80 focus-ring transition"
              />
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Width (ft)</label>
                <input
                  type="number"
                  min={4}
                  max={80}
                  value={newRoomWidth}
                  onChange={e => setNewRoomWidth(Number(e.target.value))}
                  className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Depth (ft)</label>
                <input
                  type="number"
                  min={4}
                  max={80}
                  value={newRoomDepth}
                  onChange={e => setNewRoomDepth(Number(e.target.value))}
                  className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                />
              </div>
            </div>

            {/* Shape Selector (Rectangle vs L-Shape) */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-300">Room Shape</label>
                <span className="text-[10px] font-mono text-blue-400">
                  {roomShape === 'l-shape'
                    ? `${newRoomWidth * newRoomDepth - Math.min(notchWidth, newRoomWidth - 1) * Math.min(notchDepth, newRoomDepth - 1)} sq.ft net`
                    : `${newRoomWidth * newRoomDepth} sq.ft`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-[#11131a] rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRoomShape('rectangle')}
                  className={`flex items-center justify-center gap-1.5 py-1 rounded-md transition ${
                    roomShape === 'rectangle'
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs">■</span> Rectangle
                </button>
                <button
                  type="button"
                  onClick={() => setRoomShape('l-shape')}
                  className={`flex items-center justify-center gap-1.5 py-1 rounded-md transition ${
                    roomShape === 'l-shape'
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold">⬑</span> L-Shaped
                </button>
              </div>
            </div>

            {/* L-Shape Cutout Notch Settings */}
            {roomShape === 'l-shape' && (
              <div className="p-2.5 bg-blue-950/20 border border-blue-900/40 rounded-xl space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-300 flex items-center gap-1">
                    <span className="font-mono">⬑</span> Corner Cutout (Notch)
                  </span>
                  <span className="text-[10px] text-amber-400 font-medium">L-Shape</span>
                </div>

                {/* 4 Quadrants Visual Selector */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Indented Corner</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: 'top-left', label: 'Top-Left', icon: '◤' },
                      { id: 'top-right', label: 'Top-Right', icon: '◥' },
                      { id: 'bottom-left', label: 'Btm-Left', icon: '◣' },
                      { id: 'bottom-right', label: 'Btm-Right', icon: '◢' }
                    ].map(c => {
                      const isSel = notchCorner === c.id;
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setNotchCorner(c.id as any)}
                          className={`flex flex-col items-center justify-center py-1 rounded border text-[10px] font-mono transition ${
                            isSel
                              ? 'bg-blue-600 text-white border-blue-500 font-semibold shadow-sm'
                              : 'bg-[#11131a] border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-sm leading-none">{c.icon}</span>
                          <span className="text-[9px] mt-0.5">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notch Dimensions */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Cutout Width (ft)</label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, newRoomWidth - 1)}
                      value={notchWidth}
                      onChange={e => setNotchWidth(Number(e.target.value))}
                      className="w-full bg-[#11131a] border border-slate-700 rounded-md px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Cutout Depth (ft)</label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, newRoomDepth - 1)}
                      value={notchDepth}
                      onChange={e => setNotchDepth(Number(e.target.value))}
                      className="w-full bg-[#11131a] border border-slate-700 rounded-md px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Connection Settings (Only in Connected Mode with existing rooms) */}
            {sceneData.rooms.length > 0 && creationMode === 'connected' ? (
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Attach To</label>
                    <select
                      value={targetRoomId}
                      onChange={e => setTargetRoomId(e.target.value)}
                      className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 transition truncate"
                    >
                      {sceneData.rooms.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Floor Surface</label>
                    <select
                      value={selectedMaterial}
                      onChange={e => setSelectedMaterial(e.target.value as RoomFloorMaterial)}
                      className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 transition truncate"
                    >
                      {FLOOR_MATERIALS.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Attach Direction (Auto-Doorway)</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: 'above', label: 'Above', icon: ArrowUp },
                      { id: 'right', label: 'Right', icon: ArrowRight },
                      { id: 'below', label: 'Below', icon: ArrowDown },
                      { id: 'left', label: 'Left', icon: ArrowLeft }
                    ].map(dir => {
                      const Icon = dir.icon;
                      const isSelected = connectionDirection === dir.id;
                      return (
                        <button
                          type="button"
                          key={dir.id}
                          onClick={() => setConnectionDirection(dir.id as any)}
                          className={`flex items-center justify-center gap-1 py-1 px-1 rounded-md border text-[11px] font-medium transition ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : 'bg-[#12141c] border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                          }`}
                        >
                          <Icon size={12} />
                          {dir.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wall Alignment Controls */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] text-slate-300">Wall Alignment</label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {connectionAlignment === 'start'
                        ? connectionDirection === 'above' || connectionDirection === 'below' ? 'Left aligned' : 'Top aligned'
                        : connectionAlignment === 'end'
                        ? connectionDirection === 'above' || connectionDirection === 'below' ? 'Right aligned' : 'Bottom aligned'
                        : 'Centered'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'start', label: connectionDirection === 'above' || connectionDirection === 'below' ? '⇤ Left' : '⇤ Top' },
                      { id: 'center', label: '⬌ Center' },
                      { id: 'end', label: connectionDirection === 'above' || connectionDirection === 'below' ? '⇥ Right' : '⇥ Bottom' }
                    ].map(a => (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() => setConnectionAlignment(a.id as any)}
                        className={`py-1 rounded border text-[10px] font-medium transition ${
                          connectionAlignment === a.id
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-[#12141c] border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Standalone Mode: Floor Surface */
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Floor Surface</label>
                <select
                  value={selectedMaterial}
                  onChange={e => setSelectedMaterial(e.target.value as RoomFloorMaterial)}
                  className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                >
                  {FLOOR_MATERIALS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Fixed Pinned Action Buttons (Always Visible!) */}
          <div className="p-3 bg-studio-surface border-t border-white/[0.08] flex gap-2 shrink-0">
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-glow-blue flex items-center justify-center gap-1 active:scale-[0.98]"
            >
              <Plus size={14} />
              {sceneData.rooms.length === 0
                ? 'Create Primary Space'
                : creationMode === 'connected'
                ? 'Create & Connect'
                : 'Create Standalone Space'}
            </button>
            <button
              type="button"
              onClick={() => setIsAddingRoom(false)}
              className="px-3.5 py-2 bg-studio-card hover:bg-studio-card/80 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Room Tree List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sceneData.rooms.length === 0 && !isAddingRoom && (
          <div className="text-center py-12 px-4 border border-dashed border-white/[0.10] rounded-2xl bg-studio-surface/40 my-2">
            <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 shadow-glow-blue">
              <Home size={20} />
            </div>
            <p className="text-xs font-semibold text-white mb-1">No spaces created yet</p>
            <p className="text-[11px] text-slate-400 mb-3.5 leading-relaxed text-pretty">
              Start building your floor plan by adding your primary architectural space.
            </p>
            <button
              onClick={handleOpenAddRoom}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-glow-blue active:scale-95"
            >
              <Plus size={13} />
              <span>Add Primary Space</span>
            </button>
          </div>
        )}

        {sceneData.rooms.map(room => {
          const isSelected = uiState.selectedId === room.id;
          const roomFurniture = sceneData.furniture.filter(f => f.roomId === room.id);
          const area = getRoomAreaSqFt(room);

          return (
            <div
              key={room.id}
              onClick={() => handleSelectRoom(room)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? 'bg-blue-600/15 border-blue-500/80 shadow-glow-blue ring-1 ring-blue-500/30'
                  : 'bg-studio-surface border-white/[0.08] hover:border-white/[0.16]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: room.colorTag || '#3b82f6' }}
                  />

                  {editingRoomId === room.id ? (
                    <form onSubmit={e => handleSaveRename(room.id, e)} className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        className="bg-[#11131a] border border-blue-500 rounded px-2 py-0.5 text-xs text-white w-full"
                      />
                      <button type="submit" className="p-1 text-emerald-400 hover:text-emerald-300">
                        <Check size={14} />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-white truncate">{room.name}</span>
                      {room.notch && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-mono shrink-0">
                          L-Shape
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {room.notch && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const child = sceneStore.nestRoomInNotch(room.id, `${room.name} Bath`);
                        if (child) {
                          uiStore.setSelected(child.id, 'room');
                          uiStore.addToast('Space Nested', `Added "${child.name}" inside cutout notch`, 'success');
                        }
                      }}
                      className="p-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded transition"
                      title="Nest Ensuite Bath / Space into Cutout Notch"
                    >
                      <Sparkles size={12} />
                    </button>
                  )}
                  {sceneData.rooms.length > 1 && (
                    <button
                      onClick={e => handleStartConnect(room, e)}
                      className={`p-1 transition ${
                        connectingRoomId === room.id
                          ? 'text-blue-400 bg-blue-500/20 rounded'
                          : 'text-slate-400 hover:text-blue-400'
                      }`}
                      title="Connect to Space (Create Doorway)"
                    >
                      <Link2 size={12} />
                    </button>
                  )}
                  <button
                    onClick={e => handleStartRename(room, e)}
                    className="p-1 text-slate-400 hover:text-slate-200"
                    title="Rename"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={e => handleToggleLock(room, e)}
                    className="p-1 text-slate-400 hover:text-slate-200"
                    title={room.locked ? 'Unlock' : 'Lock'}
                  >
                    {room.locked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} />}
                  </button>
                  <button
                    onClick={e => handleDeleteRoom(room.id, e)}
                    className="p-1 text-slate-400 hover:text-rose-400"
                    title="Delete Room"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Room Stats */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 mt-2 font-mono">
                <span>
                  {room.width} &times; {room.depth} ft ({area} sq.ft)
                </span>
                <span>{roomFurniture.length} items</span>
              </div>

              {/* Connected Gates Badges */}
              {sceneData.gates.filter(g => g.roomIdA === room.id || g.roomIdB === room.id).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1.5 mt-1.5 border-t border-slate-800/40">
                  {sceneData.gates
                    .filter(g => g.roomIdA === room.id || g.roomIdB === room.id)
                    .map(g => {
                      const otherId = g.roomIdA === room.id ? g.roomIdB : g.roomIdA;
                      const otherRoom = sceneData.rooms.find(r => r.id === otherId);
                      return (
                        <span
                          key={g.id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-mono"
                          title={`Doorway Gate (${g.width}ft wide)`}
                        >
                          <Link2 size={9} className="text-blue-400" />
                          {otherRoom?.name || 'Adjacent'} ({g.width}ft)
                        </span>
                      );
                    })}
                </div>
              )}

              {/* Expandable Connect Form */}
              {connectingRoomId === room.id && (
                <div
                  onClick={e => e.stopPropagation()}
                  className="mt-2.5 pt-2.5 border-t border-blue-900/40 bg-blue-950/20 -mx-3 -mb-3 p-3 rounded-b-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-300 flex items-center gap-1">
                      <Link2 size={11} /> Connect to Space
                    </span>
                    <button
                      onClick={() => setConnectingRoomId(null)}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Attach To Room</label>
                    <select
                      value={connectTargetId}
                      onChange={e => setConnectTargetId(e.target.value)}
                      className="w-full bg-[#11131a] border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {sceneData.rooms
                        .filter(r => r.id !== room.id)
                        .map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Wall Direction</label>
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
                            className={`flex items-center justify-center gap-1 py-1 rounded border text-[10px] transition ${
                              isSel
                                ? 'bg-blue-600 text-white border-blue-500 font-medium'
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
                      <span className="text-[10px] text-slate-400">Gate:</span>
                      {[3, 4, 5].map(w => (
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
                          {w}ft
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={e => handleExecuteConnect(room, e)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded text-[11px] flex items-center gap-1 transition shadow-sm"
                    >
                      <Check size={11} /> Connect
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
