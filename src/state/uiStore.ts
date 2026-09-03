import { CameraViewMode, CameraAngle } from '../types/scene';
import { ConfirmationRequest } from '../types/webmcp';

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'agent' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export type ActiveSidebarTab = 'catalog' | 'spaces' | 'materials' | 'copilot' | 'none';
export type ActiveView = 'dashboard' | 'studio';

export interface UIState {
  activeView: ActiveView;
  selectedId: string | null;
  selectedType: 'room' | 'furniture' | 'wall' | 'door' | 'window' | 'gate' | null;
  cameraMode: CameraViewMode;
  cameraAngle: CameraAngle;
  activeSidebarTab: ActiveSidebarTab;
  isInspectorOpen: boolean;
  gridSnap: boolean;
  gridSnapSize: number; // in feet (e.g. 0.5 or 1)
  showDimensions: boolean;
  showWallCutaways: boolean;
  isAgentBridgeModalOpen: boolean;
  confirmationRequest: ConfirmationRequest | null;
  walkTargetPosition: { x: number; z: number } | null;
  cameraFrameTarget: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    fov?: number;
    timestamp: number;
  } | null;
  toasts: ToastMessage[];
  lastAgentAction: {
    toolName: string;
    description: string;
    timestamp: number;
    targetId?: string;
  } | null;
}

type UIListener = (state: UIState) => void;

class UIStore {
  private state: UIState = {
    activeView: 'studio',
    selectedId: 'room-living',
    selectedType: 'room',
    cameraMode: '3d',
    cameraAngle: 'perspective',
    activeSidebarTab: 'catalog',
    isInspectorOpen: true,
    gridSnap: true,
    gridSnapSize: 0.5,
    showDimensions: true,
    showWallCutaways: true,
    isAgentBridgeModalOpen: false,
    confirmationRequest: null,
    walkTargetPosition: null,
    cameraFrameTarget: null,
    toasts: [],
    lastAgentAction: null
  };

  private listeners: UIListener[] = [];

  public getState(): UIState {
    return this.state;
  }

  public setActiveView(view: ActiveView) {
    this.state = { ...this.state, activeView: view };
    this.notify();
  }

  public subscribe(listener: UIListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.state));
  }

  public setSelected(id: string | null, type: UIState['selectedType'] = null) {
    this.state = {
      ...this.state,
      selectedId: id,
      selectedType: id ? (type || 'furniture') : null
    };
    this.notify();
  }

  public setCameraMode(mode: CameraViewMode, angle: CameraAngle = 'perspective') {
    this.state = {
      ...this.state,
      cameraMode: mode,
      cameraAngle: angle
    };
    this.notify();
  }

  public teleportWalk(x: number, z: number, roomId?: string) {
    this.state = {
      ...this.state,
      cameraMode: 'walk',
      walkTargetPosition: { x, z },
      ...(roomId ? { selectedId: roomId, selectedType: 'room' as const } : {})
    };
    this.notify();
  }

  public clearWalkTarget() {
    if (this.state.walkTargetPosition) {
      this.state = {
        ...this.state,
        walkTargetPosition: null
      };
      this.notify();
    }
  }

  public autofitCamera(target: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    fov?: number;
  }) {
    this.state = {
      ...this.state,
      cameraFrameTarget: {
        ...target,
        timestamp: Date.now()
      }
    };
    this.notify();
  }

  public clearCameraFrameTarget() {
    if (this.state.cameraFrameTarget) {
      this.state = {
        ...this.state,
        cameraFrameTarget: null
      };
      this.notify();
    }
  }

  public setActiveSidebarTab(tab: ActiveSidebarTab) {
    this.state = {
      ...this.state,
      activeSidebarTab: tab
    };
    this.notify();
  }

  public toggleInspector(open?: boolean) {
    this.state = {
      ...this.state,
      isInspectorOpen: open !== undefined ? open : !this.state.isInspectorOpen
    };
    this.notify();
  }

  public setGridSnap(enabled: boolean, size?: number) {
    this.state = {
      ...this.state,
      gridSnap: enabled,
      gridSnapSize: size || this.state.gridSnapSize
    };
    this.notify();
  }

  public setShowDimensions(show: boolean) {
    this.state = {
      ...this.state,
      showDimensions: show
    };
    this.notify();
  }

  public setShowWallCutaways(show: boolean) {
    this.state = {
      ...this.state,
      showWallCutaways: show
    };
    this.notify();
  }

  public setAgentBridgeModalOpen(open: boolean) {
    this.state = {
      ...this.state,
      isAgentBridgeModalOpen: open
    };
    this.notify();
  }

  public requestConfirmation(req: ConfirmationRequest) {
    this.state = {
      ...this.state,
      confirmationRequest: req
    };
    this.notify();
  }

  public clearConfirmation() {
    this.state = {
      ...this.state,
      confirmationRequest: null
    };
    this.notify();
  }

  public addToast(title: string, description: string, type: ToastMessage['type'] = 'info') {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = {
      id,
      title,
      description,
      type,
      timestamp: Date.now()
    };
    this.state = {
      ...this.state,
      toasts: [...this.state.toasts.slice(-4), newToast]
    };
    this.notify();

    setTimeout(() => {
      this.removeToast(id);
    }, 4500);
  }

  public showToast(title: string, description: string, type: ToastMessage['type'] = 'info') {
    this.addToast(title, description, type);
  }

  public removeToast(id: string) {
    this.state = {
      ...this.state,
      toasts: this.state.toasts.filter(t => t.id !== id)
    };
    this.notify();
  }

  public recordAgentAction(toolName: string, description: string, targetId?: string) {
    this.state = {
      ...this.state,
      lastAgentAction: {
        toolName,
        description,
        timestamp: Date.now(),
        targetId
      }
    };
    this.addToast(`Agent: ${toolName}`, description, 'agent');
    this.notify();
  }
}

export const uiStore = new UIStore();
