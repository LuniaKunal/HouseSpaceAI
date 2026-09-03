import { Room, FurnitureObject, ConnectionGate, DoorOpening, WindowOpening, WallSegment } from '../types/scene';

export interface SceneHistorySnapshot {
  rooms: Room[];
  furniture: FurnitureObject[];
  gates: ConnectionGate[];
  doors: DoorOpening[];
  windows: WindowOpening[];
  walls: WallSegment[];
  ceilingHeight: number;
}

class HistoryManager {
  private past: SceneHistorySnapshot[] = [];
  private future: SceneHistorySnapshot[] = [];
  private listeners: Array<() => void> = [];
  private maxHistory = 60;
  private isApplyingHistory = false;

  public get isApplying(): boolean {
    return this.isApplyingHistory;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public push(snapshot: SceneHistorySnapshot) {
    if (this.isApplyingHistory) return;
    // Deep clone snapshot
    const cloned = JSON.parse(JSON.stringify(snapshot));
    this.past.push(cloned);
    if (this.past.length > this.maxHistory) {
      this.past.shift();
    }
    this.future = [];
    this.notify();
  }

  public undo(currentSnapshot: SceneHistorySnapshot): SceneHistorySnapshot | null {
    if (this.past.length === 0) return null;
    this.isApplyingHistory = true;
    try {
      const previous = this.past.pop()!;
      this.future.unshift(JSON.parse(JSON.stringify(currentSnapshot)));
      this.notify();
      return previous;
    } finally {
      this.isApplyingHistory = false;
    }
  }

  public redo(currentSnapshot: SceneHistorySnapshot): SceneHistorySnapshot | null {
    if (this.future.length === 0) return null;
    this.isApplyingHistory = true;
    try {
      const next = this.future.shift()!;
      this.past.push(JSON.parse(JSON.stringify(currentSnapshot)));
      this.notify();
      return next;
    } finally {
      this.isApplyingHistory = false;
    }
  }

  public canUndo(): boolean {
    return this.past.length > 0;
  }

  public canRedo(): boolean {
    return this.future.length > 0;
  }

  public clear() {
    this.past = [];
    this.future = [];
    this.notify();
  }
}

export const historyManager = new HistoryManager();
