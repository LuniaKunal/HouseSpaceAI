import React, { useState, useEffect } from 'react';
import { uiStore, UIState, ActiveSidebarTab } from '../../state/uiStore';
import { CatalogPanel } from './CatalogPanel';
import { SpacesPanel } from './SpacesPanel';
import { MaterialsPanel } from './MaterialsPanel';
import { AgentCopilotPanel } from './AgentCopilotPanel';
import {
  Armchair,
  Home,
  Palette,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const LeftSidebar: React.FC = () => {
  const [uiState, setUiState] = useState<UIState>(uiStore.getState());
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const unsub = uiStore.subscribe(s => setUiState({ ...s }));
    return () => unsub();
  }, []);

  const activeTab = uiState.activeSidebarTab;

  const handleTabClick = (tab: ActiveSidebarTab) => {
    if (isCollapsed) setIsCollapsed(false);
    uiStore.setActiveSidebarTab(tab);
  };

  const tabs: Array<{ id: ActiveSidebarTab; label: string; icon: any; badge?: string }> = [
    { id: 'catalog', label: 'Catalog', icon: Armchair },
    { id: 'spaces', label: 'Spaces', icon: Home },
    { id: 'materials', label: 'Materials', icon: Palette },
    { id: 'copilot', label: 'AI Co-Designer', icon: Sparkles, badge: 'Agent' }
  ];

  return (
    <div className="flex h-full border-r border-slate-800/80 bg-[#141721] z-20 select-none">
      {/* Icon Rail */}
      <div className="w-14 bg-[#11131a] border-r border-slate-800 flex flex-col items-center py-3 justify-between shrink-0">
        <div className="space-y-3 flex flex-col items-center w-full">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = !isCollapsed && activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                title={tab.label}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon size={18} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#11131a]" />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Expanded Panel Drawer */}
      {!isCollapsed && (
        <div className="w-80 h-full bg-[#131620] flex flex-col overflow-hidden">
          {activeTab === 'catalog' && <CatalogPanel />}
          {activeTab === 'spaces' && <SpacesPanel />}
          {activeTab === 'materials' && <MaterialsPanel />}
          {activeTab === 'copilot' && <AgentCopilotPanel />}
        </div>
      )}
    </div>
  );
};
