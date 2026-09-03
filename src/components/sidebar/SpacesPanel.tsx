import React, { useState, useEffect } from 'react';
import { sceneStore, SceneData } from '../../state/sceneStore';
import { uiStore, UIState } from '../../state/uiStore';
import { executeWebMCPTool } from '../../webmcp/registry';
import {
  Plus,
  Trash2,
  Lock,
  Unlock,
  Maximize2,
  Edit2,
  Check,
  Compass,
  Layers,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  ArrowLeft
} from 'lucide-react';
import { Room } from '../../types/scene';

export const SpacesPanel: React.FC = () => {
  const [sceneData, setSceneData] = useState<SceneData>(sceneStore.getData());
  const [uiState, setUiState] = useState<UIState>(uiStore.getState());

  // New room modal / form state
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('Home Office / Study');
  const [newRoomWidth, setNewRoomWidth] = useState(12);
  const [newRoomDepth, setNewRoomDepth] = useState(12);
  const [connectionDirection, setConnectionDirection] = useState<'above' | 'right' | 'below' | 'left'>('right');

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

  const selectedRoom = sceneData.rooms.find(r => r.id === uiState.selectedId);

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

  const handleAddConnectedRoom = () => {
    if (!selectedRoom) return;
    sceneStore.addConnectedRoom(
      selectedRoom.id,
      connectionDirection,
      newRoomName,
      newRoomWidth,
      newRoomDepth
    );
    setIsAddingRoom(false);
    uiStore.addToast('Room Created', `Added "${newRoomName}" connected to ${selectedRoom.name}`, 'success');
  };

  const totalArea = sceneData.rooms.reduce((acc, r) => acc + r.width * r.depth, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Summary */}
      <div className="p-3 border-b border-slate-800 bg-[#141721] flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-white">Residence Spaces</span>
          <p className="text-[11px] text-slate-400">
            {sceneData.rooms.length} Rooms &bull; <strong className="text-blue-400 font-mono">{totalArea.toLocaleString()} sq.ft</strong> total
          </p>
        </div>

        <button
          onClick={() => setIsAddingRoom(!isAddingRoom)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
        >
          <Plus size={14} />
          Add Space
        </button>
      </div>

      {/* Directional Room Creation Card */}
      {isAddingRoom && (
        <div className="p-3.5 bg-[#1a1e2d] border-b border-slate-800 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
              <Compass size={14} /> Directional Room Addition
            </span>
            <span className="text-[10px] text-slate-400">
              Attached to: <strong className="text-white">{selectedRoom?.name || 'Living Room'}</strong>
            </span>
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 mb-1">Room Name</label>
            <input
              type="text"
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Width (ft)</label>
              <input
                type="number"
                min={6}
                max={40}
                value={newRoomWidth}
                onChange={e => setNewRoomWidth(Number(e.target.value))}
                className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Depth (ft)</label>
              <input
                type="number"
                min={6}
                max={40}
                value={newRoomDepth}
                onChange={e => setNewRoomDepth(Number(e.target.value))}
                className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 mb-1.5">Attach Direction (Auto-Gate)</label>
            <div className="grid grid-cols-4 gap-1.5">
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
                    key={dir.id}
                    onClick={() => setConnectionDirection(dir.id as any)}
                    className={`flex flex-col items-center py-1.5 rounded-lg border text-[10px] font-medium transition ${
                      isSelected
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                        : 'bg-[#12141c] border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon size={13} className="mb-0.5" />
                    {dir.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAddConnectedRoom}
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
            >
              + Create & Connect
            </button>
            <button
              onClick={() => setIsAddingRoom(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Room Tree List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sceneData.rooms.map(room => {
          const isSelected = uiState.selectedId === room.id;
          const roomFurniture = sceneData.furniture.filter(f => f.roomId === room.id);
          const area = room.width * room.depth;

          return (
            <div
              key={room.id}
              onClick={() => handleSelectRoom(room)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? 'bg-blue-950/30 border-blue-500 shadow-md shadow-blue-500/10'
                  : 'bg-[#181c28] border-slate-800 hover:border-slate-700'
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
                    <span className="text-xs font-semibold text-white truncate">{room.name}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
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
                <span>{room.width} &times; {room.depth} ft ({area} sq.ft)</span>
                <span>{roomFurniture.length} items</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
