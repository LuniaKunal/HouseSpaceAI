import React, { useState } from 'react';
import { CATALOG_ITEMS, CatalogItem } from '../../data/catalogData';
import { sceneStore } from '../../state/sceneStore';
import { uiStore } from '../../state/uiStore';
import { executeWebMCPTool } from '../../webmcp/registry';
import { FurnitureCategory } from '../../types/scene';
import {
  Search,
  Armchair,
  Bed,
  UtensilsCrossed,
  Tv,
  Lamp,
  Flower2,
  Sparkles,
  Bath,
  ChefHat,
  Laptop,
  Plus
} from 'lucide-react';

export const CatalogPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories: Array<{ id: string; label: string; icon: any }> = [
    { id: 'all', label: 'All Items', icon: Sparkles },
    { id: 'seating', label: 'Seating', icon: Armchair },
    { id: 'bedroom', label: 'Bedroom', icon: Bed },
    { id: 'tables', label: 'Tables', icon: UtensilsCrossed },
    { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
    { id: 'storage', label: 'Storage & TV', icon: Tv },
    { id: 'office', label: 'Office', icon: Laptop },
    { id: 'bathroom', label: 'Bathroom', icon: Bath },
    { id: 'lighting', label: 'Lighting', icon: Lamp },
    { id: 'outdoor', label: 'Outdoor', icon: Flower2 }
  ];

  const filteredItems = CATALOG_ITEMS.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleAddItem = async (item: CatalogItem) => {
    const uiState = uiStore.getState();
    const sceneData = sceneStore.getData();

    // Determine target room
    let targetRoom = sceneData.rooms.find(r => r.id === uiState.selectedId);
    if (!targetRoom && uiState.selectedType === 'furniture') {
      const selectedItem = sceneData.furniture.find(f => f.id === uiState.selectedId);
      if (selectedItem?.roomId) {
        targetRoom = sceneData.rooms.find(r => r.id === selectedItem.roomId);
      }
    }
    if (!targetRoom) {
      targetRoom = sceneData.rooms[0];
    }

    const pos = targetRoom
      ? {
          x: targetRoom.position.x + (Math.random() * 2 - 1),
          y: 0,
          z: targetRoom.position.z + (Math.random() * 2 - 1)
        }
      : { x: 0, y: 0, z: 0 };

    await executeWebMCPTool(
      'add_furniture',
      {
        type: item.type,
        roomId: targetRoom?.id,
        name: item.name,
        position: pos
      },
      'user'
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search Input */}
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search 3D furniture & decor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#11131a] border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-0.5 no-scrollbar">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#181c28] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon size={12} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Item Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="grid grid-cols-1 gap-2.5">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="p-3 bg-[#181c28] border border-slate-800 hover:border-slate-700 rounded-xl transition flex items-center justify-between group"
            >
              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-white group-hover:text-blue-400 transition">
                    {item.name}
                  </h4>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {item.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{item.description}</p>
                <div className="text-[10px] text-slate-500 font-mono">
                  Dim: {item.defaultDimensions.x} &times; {item.defaultDimensions.z} &times; {item.defaultDimensions.y} ft
                </div>
              </div>

              <button
                onClick={() => handleAddItem(item)}
                title="Place in selected room"
                className="w-8 h-8 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 flex items-center justify-center transition shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
