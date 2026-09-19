'use client';

import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';
import { uiStore, UIState, viewFromPath } from '@/state/uiStore';
import { ConfirmationDialog } from '@/components/confirmation/ConfirmationDialog';
import { AgentActionFeed } from '@/components/toast/AgentActionFeed';

const AgentBridgeModal = lazy(() =>
  import('@/components/header/AgentBridgeModal').then(module => ({ default: module.AgentBridgeModal }))
);

let startup: Promise<unknown> | undefined;

export function ClientAppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [uiState, setUiState] = useState<UIState>(uiStore.getState());

  useEffect(() => {
    startup ??= Promise.all([
      import('@/state/projectStore').then(({ projectStore }) => projectStore.init()),
      import('@/webmcp/bridge').then(module => module.initializeWebMCPBridge()),
    ]).catch(error => {
      startup = undefined;
      console.error('Unable to initialize the workspace', error);
    });

    const unsub = uiStore.subscribe(s => setUiState({ ...s }));
    return () => {
      unsub();
    };
  }, []);

  // Connect uiStore.setActiveView to Next.js router
  useEffect(() => {
    uiStore.setRouterNavigate((path, options) => {
      if (options?.replace) {
        router.replace(path);
      } else {
        router.push(path);
      }
    });

    return () => {
      uiStore.setRouterNavigate(null);
    };
  }, [router]);

  // Sync Next.js pathname changes to uiStore
  useEffect(() => {
    if (!pathname) return;
    const view = viewFromPath(pathname);
    if (uiStore.getState().activeView !== view) {
      uiStore.setActiveView(view, { fromHistory: true });
    }
  }, [pathname]);

  return (
    <div
      className={`flex flex-col w-full h-dvh overflow-hidden font-sans ${
        uiState.activeView === 'studio' ? 'studio-workspace bg-studio-canvas text-slate-100' : ''
      }`}
    >
      {children}

      {/* WebMCP Agent Bridge Modal */}
      {uiState.isAgentBridgeModalOpen && (
        <Suspense fallback={null}>
          <AgentBridgeModal
            isOpen={uiState.isAgentBridgeModalOpen}
            onClose={() => uiStore.setAgentBridgeModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Trust Boundary Confirmation Gate */}
      <ConfirmationDialog request={uiState.confirmationRequest} />

      {/* Agent Activity Live Feed & Toast stream */}
      <AgentActionFeed />
      <Analytics />
    </div>
  );
}
