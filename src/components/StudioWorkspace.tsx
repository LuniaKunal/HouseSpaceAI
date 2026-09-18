import React from 'react';
import { Header } from './header/Header';
import { LeftSidebar } from './sidebar/LeftSidebar';
import { InspectorPanel } from './inspector/InspectorPanel';
import { StudioCanvas } from '../canvas/StudioCanvas';

export default function StudioWorkspace() {
  return <><Header /><div className="flex-1 flex overflow-hidden relative">
    <LeftSidebar /><main className="flex-1 h-full relative overflow-hidden bg-[#0a0c10]"><StudioCanvas /></main><InspectorPanel />
  </div></>;
}
