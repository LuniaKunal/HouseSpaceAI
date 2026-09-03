import { AgentLogEntry } from '../types/webmcp';

export interface AgentState {
  logs: AgentLogEntry[];
  requireConfirmation: boolean;
  allowedActions: string[];
  totalToolCalls: number;
  activeBridgeConnections: number;
}

type AgentListener = (state: AgentState) => void;

class AgentStore {
  private state: AgentState = {
    logs: [],
    requireConfirmation: true, // Confirmation gates on irreversible actions
    allowedActions: [
      'get_scene_state',
      'switch_view',
      'take_screenshot',
      'add_furniture',
      'move_object',
      'rotate_object',
      'scale_object',
      'apply_material',
      'change_texture',
      'generate_floor_plan',
      'rename_room',
      'set_room_dimensions',
      'connect_rooms',
      'add_wall',
      'set_wall_dimensions',
      'place_door',
      'place_window',
      'change_ceiling_height',
      'create_room',
      'set_transform_lock',
      'build_3d_from_cad',
      'create_project',
      'open_project',
      'list_projects',
      'set_furniture_dimensions',
      'fit_furniture_to_wall',
      'auto_fit_room_furniture',
      'undo',
      'redo'
    ],
    totalToolCalls: 0,
    activeBridgeConnections: 1
  };

  private listeners: AgentListener[] = [];

  public getState(): AgentState {
    return this.state;
  }

  public subscribe(listener: AgentListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.state));
  }

  public setRequireConfirmation(required: boolean, allowedActions?: string[]) {
    this.state = {
      ...this.state,
      requireConfirmation: required,
      allowedActions: allowedActions || this.state.allowedActions
    };
    this.notify();
  }

  public addLog(entry: Omit<AgentLogEntry, 'id' | 'timestamp'>): AgentLogEntry {
    const fullEntry: AgentLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      ...entry
    };

    this.state = {
      ...this.state,
      logs: [fullEntry, ...this.state.logs].slice(0, 100),
      totalToolCalls: this.state.totalToolCalls + 1
    };
    this.notify();
    return fullEntry;
  }

  public updateLog(id: string, updates: Partial<AgentLogEntry>) {
    this.state = {
      ...this.state,
      logs: this.state.logs.map(l => (l.id === id ? { ...l, ...updates } : l))
    };
    this.notify();
  }

  public clearLogs() {
    this.state = {
      ...this.state,
      logs: []
    };
    this.notify();
  }
}

export const agentStore = new AgentStore();
