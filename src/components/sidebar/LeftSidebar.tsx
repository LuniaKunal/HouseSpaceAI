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
    <div className="flex h-full border-r border-white/[0.08] bg-studio-surface z-20 select-none">
      {/* Icon Rail */}
      <div className="w-14 bg-studio-canvas/90 border-r border-white/[0.08] flex flex-col items-center py-3 justify-between shrink-0">
        <div className="space-y-2.5 flex flex-col items-center w-full">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = !isCollapsed && activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                title={tab.label}
                aria-label={tab.label}
                className={`relative size-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-glow-blue border border-blue-400/30'
                    : 'text-slate-400 hover:text-white hover:bg-studio-card/80 border border-transparent hover:border-white/[0.06]'
                }`}
              >
                <Icon size={18} />
                {tab.badge && (
                  <span className="absolute top-1 right-1 size-2 bg-emerald-400 rounded-full border border-studio-canvas animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-studio-card transition active:scale-95"
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Expanded Panel Drawer */}
      {!isCollapsed && (
        <div className="w-[340px] h-full bg-studio-panel flex flex-col overflow-hidden border-r border-white/[0.08]">
          {activeTab === 'catalog' && <CatalogPanel />}
          {activeTab === 'spaces' && <SpacesPanel />}
          {activeTab === 'materials' && <MaterialsPanel />}
          {activeTab === 'copilot' && <AgentCopilotPanel />}
        </div>
      )}
    </div>
  );
};
