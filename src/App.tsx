import React, { useState, useEffect } from 'react';
import { Header } from './components/header/Header';
import { LeftSidebar } from './components/sidebar/LeftSidebar';
import { StudioCanvas } from './canvas/StudioCanvas';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { AgentBridgeModal } from './components/header/AgentBridgeModal';
import { ConfirmationDialog } from './components/confirmation/ConfirmationDialog';
import { AgentActionFeed } from './components/toast/AgentActionFeed';
import { ProjectsDashboard } from './components/dashboard/ProjectsDashboard';
import { uiStore, UIState } from './state/uiStore';
import { projectStore } from './state/projectStore';
import { initializeWebMCPBridge } from './webmcp/bridge';

export const App: React.FC = () => {
  const [uiState, setUiState] = useState<UIState>(uiStore.getState());

  useEffect(() => {
    projectStore.init();
    const unsub = uiStore.subscribe(s => setUiState({ ...s }));

    // Ensure WebMCP registration runs after the app is initialized and does not fail silently
    initializeWebMCPBridge().catch(err => {
      console.error('[WebMCP] Bridge registration error after app initialization:', err);
    });

    return () => unsub();
  }, []);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#0f1117] text-slate-100 font-sans">
      {uiState.activeView === 'dashboard' ? (
        /* Workspace Projects Dashboard */
        <ProjectsDashboard />
      ) : (
        /* Active 3D CAD Design Studio Workspace */
        <>
          {/* Top Application Header */}
          <Header />

          {/* Main Studio Viewport Workspace */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Left Interactive Side Panels (Catalog, Spaces, Finishes, Copilot) */}
            <LeftSidebar />

            {/* Center 3D Three.js Studio Canvas */}
            <main className="flex-1 h-full relative overflow-hidden bg-[#0a0c10]">
              <StudioCanvas />
            </main>

            {/* Right Precision Inspector */}
            <InspectorPanel />
          </div>
        </>
      )}

      {/* WebMCP Agent Bridge Modal */}
      <AgentBridgeModal
        isOpen={uiState.isAgentBridgeModalOpen}
        onClose={() => uiStore.setAgentBridgeModalOpen(false)}
      />

      {/* Trust Boundary Human-in-the-Loop Confirmation Gate */}
      <ConfirmationDialog request={uiState.confirmationRequest} />

      {/* Live Agent & Human Tool Call HUD Toasts */}
      <AgentActionFeed />
    </div>
  );
};

export default App;
