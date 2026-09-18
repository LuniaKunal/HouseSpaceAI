import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ConfirmationDialog } from './components/confirmation/ConfirmationDialog';
import { AgentActionFeed } from './components/toast/AgentActionFeed';
import { LandingPage } from './components/landing/LandingPage';
import { PricingPage } from './components/pricing/PricingPage';
import { uiStore, UIState } from './state/uiStore';
import { SiteSEO } from './seo';

const StudioWorkspace = lazy(() => import('./components/StudioWorkspace'));
const ProjectsDashboard = lazy(() => import('./components/dashboard/ProjectsDashboard').then(module => ({ default: module.ProjectsDashboard })));
const PhotoWorkspace = lazy(() => import('./features/photo-design/PhotoWorkspace'));
const AgentBridgeModal = lazy(() => import('./components/header/AgentBridgeModal').then(module => ({ default: module.AgentBridgeModal })));
let startup: Promise<unknown> | undefined;

export const App: React.FC = () => {
  const [uiState, setUiState] = useState<UIState>(uiStore.getState());

  useEffect(() => {
    startup ??= Promise.all([
      import('./state/projectStore').then(({ projectStore }) => projectStore.init()),
      import('./webmcp/bridge').then(module => module.initializeWebMCPBridge()),
    ]).catch(error => { startup = undefined; console.error('Unable to initialize the workspace', error); });
    const unsub = uiStore.subscribe(s => setUiState({ ...s }));

    const handlePopState = () => uiStore.syncViewFromLocation();
    window.addEventListener('popstate', handlePopState);

    return () => {
      unsub();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <div className={`flex flex-col w-full h-dvh overflow-hidden font-sans ${uiState.activeView === 'studio' ? 'studio-workspace bg-studio-canvas text-slate-100' : ''}`}>
      <SiteSEO view={uiState.activeView} />
      <Suspense fallback={<div className="p-8" role="status">Opening your workspace...</div>}>
      {uiState.activeView === 'landing' ? (
        <LandingPage />
      ) : uiState.activeView === 'pricing' ? (
        <PricingPage />
      ) : uiState.activeView === 'photos' ? (
        <PhotoWorkspace />
      ) : uiState.activeView === 'dashboard' ? (
        /* Workspace Projects Dashboard */
        <ProjectsDashboard />
      ) : (
        <StudioWorkspace />
      )}
      </Suspense>

      {/* WebMCP Agent Bridge Modal */}
      {uiState.isAgentBridgeModalOpen && <Suspense fallback={null}><AgentBridgeModal
        isOpen={uiState.isAgentBridgeModalOpen}
        onClose={() => uiStore.setAgentBridgeModalOpen(false)}
      /></Suspense>}

      {/* Trust Boundary Human-in-the-Loop Confirmation Gate */}
      <ConfirmationDialog request={uiState.confirmationRequest} />

      {/* Live Agent & Human Tool Call HUD Toasts */}
      <AgentActionFeed />

      {/* Vercel Web Analytics */}
      <Analytics />
    </div>
  );
};

export default App;
