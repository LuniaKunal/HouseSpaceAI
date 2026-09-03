import {
  Room,
  FurnitureObject,
  ConnectionGate,
  DoorOpening,
  WindowOpening,
  WallSegment,
  Vector3D,
  Vector2D,
  SceneStateSnapshot,
  RoomFloorMaterial,
  CornerNotch
} from '../types/scene';

import { historyManager, SceneHistorySnapshot } from './historyStore';
import { CATALOG_ITEMS } from '../data/catalogData';
import { FloorPlan, GeometryValidation } from '../types/floorPlan';
import {
  createNotchFootprint,
  getRoomFootprint,
  getRoomAreaSqFt,
  findSharedWallOverlap,
  isPointInRoom
} from '../geometry/roomGeometry';

export interface SceneData {
  rooms: Room[];
  furniture: FurnitureObject[];
  gates: ConnectionGate[];
  doors: DoorOpening[];
  windows: WindowOpening[];
  customWalls: WallSegment[];
  globalCeilingHeight: number;
  floorPlan?: FloorPlan;
  validation?: GeometryValidation;
}

type SceneListener = (data: SceneData) => void;

class SceneStore {
  private data: SceneData = {
    rooms: [],
    furniture: [],
    gates: [],
    doors: [],
    windows: [],
    customWalls: [],
    globalCeilingHeight: 9.5,
    floorPlan: undefined,
    validation: undefined
  };

  private listeners: SceneListener[] = [];

  constructor() {
    // Initial snapshot
    this.saveSnapshot();
  }

  public getData(): SceneData {
    return this.data;
  }

  public subscribe(listener: SceneListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.data));
  }

  private saveSnapshot() {
    if (historyManager.isApplying) return;
    const snapshot: SceneHistorySnapshot = {
      rooms: this.data.rooms,
      furniture: this.data.furniture,
      gates: this.data.gates,
      doors: this.data.doors,
      windows: this.data.windows,
      walls: this.data.customWalls,
      ceilingHeight: this.data.globalCeilingHeight
    };
    historyManager.push(snapshot);
  }

  public undo(): boolean {
    const currentSnapshot: SceneHistorySnapshot = {
      rooms: this.data.rooms,
      furniture: this.data.furniture,
      gates: this.data.gates,
      doors: this.data.doors,
      windows: this.data.windows,
      walls: this.data.customWalls,
      ceilingHeight: this.data.globalCeilingHeight
    };
    const previous = historyManager.undo(currentSnapshot);
    if (!previous) return false;
    this.data = {
      rooms: previous.rooms,
      furniture: previous.furniture,
      gates: previous.gates,
      doors: previous.doors,
      windows: previous.windows,
      customWalls: previous.walls,
      globalCeilingHeight: previous.ceilingHeight
    };
    this.notify();
    return true;
  }

  public redo(): boolean {
    const currentSnapshot: SceneHistorySnapshot = {
      rooms: this.data.rooms,
      furniture: this.data.furniture,
      gates: this.data.gates,
      doors: this.data.doors,
      windows: this.data.windows,
      walls: this.data.customWalls,
      ceilingHeight: this.data.globalCeilingHeight
    };
    const next = historyManager.redo(currentSnapshot);
    if (!next) return false;
    this.data = {
      rooms: next.rooms,
      furniture: next.furniture,
      gates: next.gates,
      doors: next.doors,
      windows: next.windows,
      customWalls: next.walls,
      globalCeilingHeight: next.ceilingHeight
    };
    this.notify();
    return true;
  }

  // --- Rooms Management ---

  public createRoom(input: {
    name: string;
    width: number;
    depth: number;
    height?: number;
    position?: Vector3D;
    floorMaterial?: RoomFloorMaterial;
    wallColor?: string;
    notch?: CornerNotch;
    footprint?: Vector2D[];
  }): Room {
    this.saveSnapshot();
    const id = `room-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const w = Math.max(4, input.width || 12);
    const d = Math.max(4, input.depth || 12);
    const footprint = input.footprint && input.footprint.length >= 4
      ? input.footprint
      : createNotchFootprint(w, d, input.notch);

    const newRoom: Room = {
      id,
      name: input.name || 'New Room',
      width: w,
      depth: d,
      height: input.height || this.data.globalCeilingHeight,
      position: input.position || { x: 0, y: 0, z: 0 },
      footprint,
      notch: input.notch,
      floorMaterial: input.floorMaterial || 'hardwood_oak',
      wallColor: input.wallColor || '#f1f5f9',
      wallThickness: 0.5,
      locked: false,
      connections: []
    };

    this.data = {
      ...this.data,
      rooms: [...this.data.rooms, newRoom]
    };
    this.notify();
    return newRoom;
  }

  public renameRoom(roomId: string, newName: string): boolean {
    const room = this.data.rooms.find(r => r.id === roomId);
    if (!room) return false;
    this.saveSnapshot();
    this.data = {
      ...this.data,
      rooms: this.data.rooms.map(r => (r.id === roomId ? { ...r, name: newName } : r))
    };
    this.notify();
    return true;
  }

  private syncGatesForRoom(roomId: string, currentRooms: Room[]): ConnectionGate[] {
    return this.data.gates.map(gate => {
      if (gate.roomIdA !== roomId && gate.roomIdB !== roomId) return gate;
      const rA = currentRooms.find(r => r.id === gate.roomIdA);
      const rB = currentRooms.find(r => r.id === gate.roomIdB);
      if (!rA || !rB) return gate;

      const overlap = findSharedWallOverlap(rA, rB, gate.wallDirection);
      if (overlap) {
        return {
          ...gate,
          wallDirection: overlap.direction,
          width: Math.min(gate.width, Math.max(1.5, overlap.sharedLength - 0.2)),
          position: { x: overlap.midpoint.x, y: 0, z: overlap.midpoint.z }
        };
      }

      if (gate.wallDirection === 'right' || gate.wallDirection === 'left') {
        const sharedX = gate.wallDirection === 'right' ? rA.position.x + rA.width / 2 : rA.position.x - rA.width / 2;
        const minZ = Math.max(rA.position.z - rA.depth / 2, rB.position.z - rB.depth / 2);
        const maxZ = Math.min(rA.position.z + rA.depth / 2, rB.position.z + rB.depth / 2);
        const sharedLen = Math.max(1, maxZ - minZ);
        return {
          ...gate,
          width: Math.min(gate.width, Math.max(1.5, sharedLen - 0.2)),
          position: { x: sharedX, y: 0, z: (minZ + maxZ) / 2 }
        };
      } else {
        const sharedZ = gate.wallDirection === 'above' ? rA.position.z - rA.depth / 2 : rA.position.z + rA.depth / 2;
        const minX = Math.max(rA.position.x - rA.width / 2, rB.position.x - rB.width / 2);
        const maxX = Math.min(rA.position.x + rA.width / 2, rB.position.x + rB.width / 2);
        const sharedLen = Math.max(1, maxX - minX);
        return {
          ...gate,
          width: Math.min(gate.width, Math.max(1.5, sharedLen - 0.2)),
          position: { x: (minX + maxX) / 2, y: 0, z: sharedZ }
        };
      }
    });
  }

  public moveRoom(roomId: string, position: Vector3D): boolean {
    const room = this.data.rooms.find(r => r.id === roomId);
    if (!room || room.locked) return false;
    this.saveSnapshot();

    const dx = position.x - room.position.x;
    const dz = position.z - room.position.z;

    const updatedRooms = this.data.rooms.map(r => (r.id === roomId ? { ...r, position: { ...position, y: 0 } } : r));

    // Move room, associated furniture, and synchronize gates to prevent desync
    this.data = {
      ...this.data,
      rooms: updatedRooms,
      gates: this.syncGatesForRoom(roomId, updatedRooms),
      furniture: this.data.furniture.map(f => {
        if (f.roomId === roomId) {
          return {
            ...f,
            position: {
              x: f.position.x + dx,
              y: f.position.y,
              z: f.position.z + dz
            }
          };
        }
        return f;
      })
    };
    this.notify();
    return true;
  }

  public setRoomDimensions(
    roomId: string,
    width: number,
    depth: number,
    height?: number,
    notch?: CornerNotch
  ): boolean {
    const room = this.data.rooms.find(r => r.id === roomId);
    if (!room || room.locked) return false;
    this.saveSnapshot();

    const w = Math.max(3, width);
    const d = Math.max(3, depth);
    const activeNotch = notch !== undefined ? notch : room.notch;
    const footprint = createNotchFootprint(w, d, activeNotch);

    const updatedRooms = this.data.rooms.map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          width: w,
          depth: d,
          height: height !== undefined ? Math.max(6, height) : r.height,
          notch: activeNotch,
          footprint
        };
      }
      return r;
    });

    // Update dimensions and synchronize connected gates dynamically
    this.data = {
      ...this.data,
      rooms: updatedRooms,
      gates: this.syncGatesForRoom(roomId, updatedRooms)
    };
    this.notify();
    return true;
  }

  public deleteRoom(roomId: string): boolean {
    const room = this.data.rooms.find(r => r.id === roomId);
    if (!room) return false;
    this.saveSnapshot();

    this.data = {
      ...this.data,
      rooms: this.data.rooms.filter(r => r.id !== roomId),
      furniture: this.data.furniture.filter(f => f.roomId !== roomId),
      gates: this.data.gates.filter(g => g.roomIdA !== roomId && g.roomIdB !== roomId),
      doors: this.data.doors.filter(d => d.roomId !== roomId),
      windows: this.data.windows.filter(w => w.roomId !== roomId)
    };
    this.notify();
    return true;
  }

  public connectRooms(
    roomIdA: string,
    roomIdB: string,
    wallDirection: 'above' | 'right' | 'below' | 'left' = 'right',
    openingWidth: number = 4
  ): ConnectionGate | null {
    let roomA = this.data.rooms.find(r => r.id === roomIdA);
    let roomB = this.data.rooms.find(r => r.id === roomIdB);
    if (!roomA || !roomB) return null;

    this.saveSnapshot();

    // Check if gate already exists between these two rooms to prevent duplicates
    const existingGateIndex = this.data.gates.findIndex(
      g => (g.roomIdA === roomIdA && g.roomIdB === roomIdB) || (g.roomIdA === roomIdB && g.roomIdB === roomIdA)
    );

    // 1. Check if rooms already share an overlapping wall
    let overlap = findSharedWallOverlap(roomA, roomB, wallDirection) || findSharedWallOverlap(roomA, roomB);

    // 2. If rooms do not share a wall (or overlap is negligible, e.g. standalone rooms with gap),
    // automatically snap the standalone/unlocked room flush to the other room.
    let updatedRooms = [...this.data.rooms];
    let updatedFurniture = [...this.data.furniture];

    if (!overlap || overlap.sharedLength < 0.5) {
      // Determine which room moves:
      // If roomB is locked, or roomB is the primary origin room at (0,0) while roomA is offset, snap roomA.
      // Otherwise, snap roomB against roomA.
      const shouldSnapA = roomB.locked || (roomB.position.x === 0 && roomB.position.z === 0 && (roomA.position.x !== 0 || roomA.position.z !== 0));
      const targetRoom = shouldSnapA ? roomB : roomA;
      const movingRoom = shouldSnapA ? roomA : roomB;

      const oppositeDir: Record<'above' | 'right' | 'below' | 'left', 'above' | 'right' | 'below' | 'left'> = {
        above: 'below',
        below: 'above',
        left: 'right',
        right: 'left'
      };

      const dir = shouldSnapA ? oppositeDir[wallDirection] : wallDirection;

      let newX = movingRoom.position.x;
      let newZ = movingRoom.position.z;

      if (dir === 'right') {
        newX = targetRoom.position.x + targetRoom.width / 2 + movingRoom.width / 2;
        const zOverlapMin = Math.max(targetRoom.position.z - targetRoom.depth / 2, movingRoom.position.z - movingRoom.depth / 2);
        const zOverlapMax = Math.min(targetRoom.position.z + targetRoom.depth / 2, movingRoom.position.z + movingRoom.depth / 2);
        newZ = zOverlapMax - zOverlapMin > 1 ? movingRoom.position.z : targetRoom.position.z;
      } else if (dir === 'left') {
        newX = targetRoom.position.x - targetRoom.width / 2 - movingRoom.width / 2;
        const zOverlapMin = Math.max(targetRoom.position.z - targetRoom.depth / 2, movingRoom.position.z - movingRoom.depth / 2);
        const zOverlapMax = Math.min(targetRoom.position.z + targetRoom.depth / 2, movingRoom.position.z + movingRoom.depth / 2);
        newZ = zOverlapMax - zOverlapMin > 1 ? movingRoom.position.z : targetRoom.position.z;
      } else if (dir === 'above') {
        newZ = targetRoom.position.z - targetRoom.depth / 2 - movingRoom.depth / 2;
        const xOverlapMin = Math.max(targetRoom.position.x - targetRoom.width / 2, movingRoom.position.x - movingRoom.width / 2);
        const xOverlapMax = Math.min(targetRoom.position.x + targetRoom.width / 2, movingRoom.position.x + movingRoom.width / 2);
        newX = xOverlapMax - xOverlapMin > 1 ? movingRoom.position.x : targetRoom.position.x;
      } else if (dir === 'below') {
        newZ = targetRoom.position.z + targetRoom.depth / 2 + movingRoom.depth / 2;
        const xOverlapMin = Math.max(targetRoom.position.x - targetRoom.width / 2, movingRoom.position.x - movingRoom.width / 2);
        const xOverlapMax = Math.min(targetRoom.position.x + targetRoom.width / 2, movingRoom.position.x + movingRoom.width / 2);
        newX = xOverlapMax - xOverlapMin > 1 ? movingRoom.position.x : targetRoom.position.x;
      }

      const deltaX = newX - movingRoom.position.x;
      const deltaZ = newZ - movingRoom.position.z;

      const snappedRoom: Room = {
        ...movingRoom,
        position: { x: newX, y: 0, z: newZ }
      };

      updatedRooms = updatedRooms.map(r => (r.id === movingRoom.id ? snappedRoom : r));

      // Translate furniture inside moving room
      if (deltaX !== 0 || deltaZ !== 0) {
        updatedFurniture = updatedFurniture.map(f =>
          f.roomId === movingRoom.id
            ? { ...f, position: { x: f.position.x + deltaX, y: f.position.y, z: f.position.z + deltaZ } }
            : f
        );
      }

      // Re-assign local room references after snap
      roomA = updatedRooms.find(r => r.id === roomIdA)!;
      roomB = updatedRooms.find(r => r.id === roomIdB)!;

      // Re-evaluate overlap with the newly snapped rooms
      overlap = findSharedWallOverlap(roomA, roomB, wallDirection) || findSharedWallOverlap(roomA, roomB);
    }

    let gatePos: Vector3D;
    let sharedLen: number;
    let effectiveDirection = wallDirection;

    if (overlap) {
      gatePos = { x: overlap.midpoint.x, y: 0, z: overlap.midpoint.z };
      sharedLen = overlap.sharedLength;
      effectiveDirection = overlap.direction;
    } else {
      if (wallDirection === 'right' || wallDirection === 'left') {
        const sharedX = wallDirection === 'right' ? roomA.position.x + roomA.width / 2 : roomA.position.x - roomA.width / 2;
        const minZ = Math.max(roomA.position.z - roomA.depth / 2, roomB.position.z - roomB.depth / 2);
        const maxZ = Math.min(roomA.position.z + roomA.depth / 2, roomB.position.z + roomB.depth / 2);
        sharedLen = Math.max(1, maxZ - minZ);
        gatePos = {
          x: sharedX,
          y: 0,
          z: (minZ + maxZ) / 2
        };
      } else {
        const sharedZ = wallDirection === 'above' ? roomA.position.z - roomA.depth / 2 : roomA.position.z + roomA.depth / 2;
        const minX = Math.max(roomA.position.x - roomA.width / 2, roomB.position.x - roomB.width / 2);
        const maxX = Math.min(roomA.position.x + roomA.width / 2, roomB.position.x + roomB.width / 2);
        sharedLen = Math.max(1, maxX - minX);
        gatePos = {
          x: (minX + maxX) / 2,
          y: 0,
          z: sharedZ
        };
      }
    }

    // Gate width must not exceed shared wall length (Pass/Fail Check 5)
    const validWidth = Math.min(openingWidth, Math.max(1.5, sharedLen - 0.2));

    const gateId = existingGateIndex >= 0 ? this.data.gates[existingGateIndex].id : `gate-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newGate: ConnectionGate = {
      id: gateId,
      roomIdA,
      roomIdB,
      wallDirection: effectiveDirection,
      width: validWidth,
      height: 7.5,
      position: gatePos
    };

    updatedRooms = updatedRooms.map(r => {
      if (r.id === roomIdA && !r.connections.includes(roomIdB)) {
        return { ...r, connections: [...r.connections, roomIdB] };
      }
      if (r.id === roomIdB && !r.connections.includes(roomIdA)) {
        return { ...r, connections: [...r.connections, roomIdA] };
      }
      return r;
    });

    let updatedGates: ConnectionGate[];
    if (existingGateIndex >= 0) {
      updatedGates = this.data.gates.map((g, idx) => (idx === existingGateIndex ? newGate : g));
    } else {
      updatedGates = [...this.data.gates, newGate];
    }

    this.data = {
      ...this.data,
      rooms: updatedRooms,
      furniture: updatedFurniture,
      gates: updatedGates
    };
    this.notify();
    return newGate;
  }

  // Directional room addition: Above, Right, Below, Left of an existing room with auto gate
  public addConnectedRoom(
    referenceRoomId: string,
    direction: 'above' | 'right' | 'below' | 'left',
    name: string,
    width: number = 12,
    depth: number = 12,
    floorMaterial?: RoomFloorMaterial,
    openingWidth: number = 4
  ): Room | null {
    const ref = this.data.rooms.find(r => r.id === referenceRoomId);
    if (!ref) return null;

    let targetX = ref.position.x;
    let targetZ = ref.position.z;

    if (direction === 'above') {
      targetZ = ref.position.z - (ref.depth / 2 + depth / 2);
    } else if (direction === 'below') {
      targetZ = ref.position.z + (ref.depth / 2 + depth / 2);
    } else if (direction === 'right') {
      targetX = ref.position.x + (ref.width / 2 + width / 2);
    } else if (direction === 'left') {
      targetX = ref.position.x - (ref.width / 2 + width / 2);
    }

    const newRoom = this.createRoom({
      name,
      width,
      depth,
      height: ref.height,
      position: { x: targetX, y: 0, z: targetZ },
      floorMaterial: floorMaterial || ref.floorMaterial,
      wallColor: ref.wallColor
    });

    this.connectRooms(ref.id, newRoom.id, direction, openingWidth);
    return newRoom;
  }

  public disconnectRooms(
    roomIdA: string,
    roomIdB: string
  ): boolean {
    const roomA = this.data.rooms.find(r => r.id === roomIdA);
    const roomB = this.data.rooms.find(r => r.id === roomIdB);
    if (!roomA || !roomB) return false;

    this.saveSnapshot();

    const updatedGates = this.data.gates.filter(
      g => !((g.roomIdA === roomIdA && g.roomIdB === roomIdB) || (g.roomIdA === roomIdB && g.roomIdB === roomIdA))
    );

    const updatedRooms = this.data.rooms.map(r => {
      if (r.id === roomIdA) {
        return { ...r, connections: r.connections.filter(id => id !== roomIdB) };
      }
      if (r.id === roomIdB) {
        return { ...r, connections: r.connections.filter(id => id !== roomIdA) };
      }
      return r;
    });

    this.data = {
      ...this.data,
      rooms: updatedRooms,
      gates: updatedGates
    };
    this.notify();
    return true;
  }

  // --- Furniture & Objects Management ---

  public addFurniture(input: {
    type: string;
    roomId?: string;
    name?: string;
    position: Vector3D;
    rotation?: Vector3D;
    scale?: Vector3D;
    material?: string;
    color?: string;
  }): FurnitureObject {
    this.saveSnapshot();
    const catalogItem = CATALOG_ITEMS.find(c => c.type === input.type);
    const id = `obj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;

    const newObject: FurnitureObject = {
      id,
      name: input.name || catalogItem?.name || input.type.replace(/_/g, ' '),
      type: input.type,
      category: catalogItem?.category || 'decor',
      roomId: input.roomId,
      position: input.position,
      rotation: input.rotation || { x: 0, y: 0, z: 0 },
      scale: input.scale || { x: 1, y: 1, z: 1 },
      dimensions: catalogItem?.defaultDimensions || { x: 3, y: 3, z: 3 },
      material: input.material || catalogItem?.defaultMaterial || 'standard_wood',
      color: input.color || catalogItem?.defaultColor,
      locked: false
    };

    this.data = {
      ...this.data,
      furniture: [...this.data.furniture, newObject]
    };
    this.notify();
    return newObject;
  }

  public moveObject(objectId: string, position: Vector3D): boolean {
    const item = this.data.furniture.find(f => f.id === objectId);
    if (!item || item.locked) return false;
    this.saveSnapshot();

    // Auto-detect enclosing room if position moved
    let assignedRoomId = item.roomId;
    for (const r of this.data.rooms) {
      const minX = r.position.x - r.width / 2;
      const maxX = r.position.x + r.width / 2;
      const minZ = r.position.z - r.depth / 2;
      const maxZ = r.position.z + r.depth / 2;
      if (position.x >= minX && position.x <= maxX && position.z >= minZ && position.z <= maxZ) {
        assignedRoomId = r.id;
        break;
      }
    }

    this.data = {
      ...this.data,
      furniture: this.data.furniture.map(f =>
        f.id === objectId ? { ...f, position, roomId: assignedRoomId } : f
      )
    };
    this.notify();
    return true;
  }

  public rotateObject(objectId: string, rotation: Vector3D): boolean {
    const item = this.data.furniture.find(f => f.id === objectId);
    if (!item || item.locked) return false;
    this.saveSnapshot();

    this.data = {
      ...this.data,
      furniture: this.data.furniture.map(f => (f.id === objectId ? { ...f, rotation } : f))
    };
    this.notify();
    return true;
  }

  public scaleObject(objectId: string, scale: Vector3D): boolean {
    const item = this.data.furniture.find(f => f.id === objectId);
    if (!item || item.locked) return false;
    this.saveSnapshot();

    this.data = {
      ...this.data,
      furniture: this.data.furniture.map(f => (f.id === objectId ? { ...f, scale } : f))
    };
    this.notify();
    return true;
  }

  public setObjectDimensions(
    objectId: string,
    dims: { width?: number; height?: number; depth?: number }
  ): { success: boolean; dimensions: Vector3D; scale: Vector3D } | null {
    const item = this.data.furniture.find(f => f.id === objectId);
    if (!item || item.locked) return null;
    this.saveSnapshot();

    const natural = item.dimensions;
    let scaleX = item.scale.x;
    let scaleY = item.scale.y;
    let scaleZ = item.scale.z;

    if (dims.width !== undefined && dims.width > 0 && natural.x > 0) {
      scaleX = dims.width / natural.x;
    }
    if (dims.height !== undefined && dims.height > 0 && natural.y > 0) {
      scaleY = dims.height / natural.y;
    }
    if (dims.depth !== undefined && dims.depth > 0 && natural.z > 0) {
      scaleZ = dims.depth / natural.z;
    }

    const newScale: Vector3D = { x: scaleX, y: scaleY, z: scaleZ };
    const effectiveDims: Vector3D = {
      x: natural.x * scaleX,
      y: natural.y * scaleY,
      z: natural.z * scaleZ
    };

    this.data = {
      ...this.data,
      furniture: this.data.furniture.map(f => (f.id === objectId ? { ...f, scale: newScale } : f))
    };
    this.notify();
    return { success: true, dimensions: effectiveDims, scale: newScale };
  }

  public fitFurnitureToWall(
    objectId: string,
    options: {
      wallDirection?: 'nearest' | 'top' | 'bottom' | 'left' | 'right';
      maxWidth?: number;
      maxDepth?: number;
      margin?: number;
      snapToWall?: boolean;
    } = {}
  ): {
    success: boolean;
    objectId: string;
    name: string;
    roomName: string;
    wallDirection: 'top' | 'bottom' | 'left' | 'right';
    previousDimensions: Vector3D;
    newDimensions: Vector3D;
    position: Vector3D;
  } | null {
    const item = this.data.furniture.find(f => f.id === objectId);
    if (!item || item.locked) return null;

    // Find enclosing room
    let room = item.roomId ? this.data.rooms.find(r => r.id === item.roomId) : null;
    if (!room) {
      for (const r of this.data.rooms) {
        const minX = r.position.x - r.width / 2;
        const maxX = r.position.x + r.width / 2;
        const minZ = r.position.z - r.depth / 2;
        const maxZ = r.position.z + r.depth / 2;
        if (item.position.x >= minX && item.position.x <= maxX && item.position.z >= minZ && item.position.z <= maxZ) {
          room = r;
          break;
        }
      }
    }
    if (!room) return null;

    this.saveSnapshot();

    const roomMinX = room.position.x - room.width / 2;
    const roomMaxX = room.position.x + room.width / 2;
    const roomMinZ = room.position.z - room.depth / 2;
    const roomMaxZ = room.position.z + room.depth / 2;

    const curDimX = item.dimensions.x * item.scale.x;
    const curDimY = item.dimensions.y * item.scale.y;
    const curDimZ = item.dimensions.z * item.scale.z;
    const prevDimensions = { x: curDimX, y: curDimY, z: curDimZ };

    // Determine nearest wall
    const dTop = Math.abs(item.position.z - roomMinZ);
    const dBottom = Math.abs(roomMaxZ - item.position.z);
    const dLeft = Math.abs(item.position.x - roomMinX);
    const dRight = Math.abs(roomMaxX - item.position.x);

    let chosenWall: 'top' | 'bottom' | 'left' | 'right' = 'top';
    if (options.wallDirection && options.wallDirection !== 'nearest') {
      chosenWall = options.wallDirection;
    } else {
      const minD = Math.min(dTop, dBottom, dLeft, dRight);
      if (minD === dTop) chosenWall = 'top';
      else if (minD === dBottom) chosenWall = 'bottom';
      else if (minD === dLeft) chosenWall = 'left';
      else chosenWall = 'right';
    }

    const margin = options.margin !== undefined ? options.margin : 0.25;
    const snapToWall = options.snapToWall !== false;

    const yaw = ((item.rotation.y % 360) + 360) % 360;
    const isRotated90 = (yaw >= 45 && yaw <= 135) || (yaw >= 225 && yaw <= 315);

    let newDimX = curDimX;
    let newDimY = curDimY;
    let newDimZ = curDimZ;
    let newPosX = item.position.x;
    let newPosZ = item.position.z;

    const isWardrobe = item.type.includes('wardrobe') || item.category === 'storage';

    if (chosenWall === 'top' || chosenWall === 'bottom') {
      // Wall runs along X axis
      const availableWallSpan = Math.max(2.5, room.width - 2.0);
      let targetW = options.maxWidth || Math.min(curDimX, availableWallSpan);

      // Wardrobe sizing heuristic for small/compact rooms
      if (isWardrobe) {
        if (room.width <= 11) {
          targetW = Math.min(targetW, 4.5);
        } else if (room.width <= 14) {
          targetW = Math.min(targetW, 5.5);
        }
      }

      newDimX = Math.max(2.0, targetW);
      if (options.maxDepth) {
        newDimZ = Math.min(curDimZ, options.maxDepth);
      } else if (isWardrobe && curDimZ > 2.0) {
        newDimZ = 1.9;
      }

      if (snapToWall) {
        if (chosenWall === 'top') {
          newPosZ = roomMinZ + margin + newDimZ / 2;
        } else {
          newPosZ = roomMaxZ - margin - newDimZ / 2;
        }
        const halfW = newDimX / 2;
        newPosX = Math.max(roomMinX + margin + halfW, Math.min(roomMaxX - margin - halfW, newPosX));
      }
    } else {
      // Wall runs along Z axis
      const availableWallSpan = Math.max(2.5, room.depth - 2.0);
      let targetSpan = options.maxWidth || Math.min(isRotated90 ? curDimX : curDimZ, availableWallSpan);

      if (isWardrobe) {
        if (room.depth <= 11) {
          targetSpan = Math.min(targetSpan, 4.5);
        } else if (room.depth <= 14) {
          targetSpan = Math.min(targetSpan, 5.5);
        }
      }

      if (isRotated90) {
        newDimX = Math.max(2.0, targetSpan);
        if (options.maxDepth) {
          newDimZ = Math.min(curDimZ, options.maxDepth);
        } else if (isWardrobe && curDimZ > 2.0) {
          newDimZ = 1.9;
        }
      } else {
        newDimZ = Math.max(2.0, targetSpan);
        if (options.maxDepth) {
          newDimX = Math.min(curDimX, options.maxDepth);
        } else if (isWardrobe && curDimX > 2.0) {
          newDimX = 1.9;
        }
      }

      if (snapToWall) {
        const halfThick = isRotated90 ? newDimZ / 2 : newDimX / 2;
        if (chosenWall === 'left') {
          newPosX = roomMinX + margin + halfThick;
        } else {
          newPosX = roomMaxX - margin - halfThick;
        }
        const halfLen = isRotated90 ? newDimX / 2 : newDimZ / 2;
        newPosZ = Math.max(roomMinZ + margin + halfLen, Math.min(roomMaxZ - margin - halfLen, newPosZ));
      }
    }

    const scaleX = item.dimensions.x > 0 ? newDimX / item.dimensions.x : 1;
    const scaleY = item.dimensions.y > 0 ? newDimY / item.dimensions.y : 1;
    const scaleZ = item.dimensions.z > 0 ? newDimZ / item.dimensions.z : 1;

    const newScale: Vector3D = { x: scaleX, y: scaleY, z: scaleZ };
    const newPosition: Vector3D = { x: newPosX, y: item.position.y, z: newPosZ };

    this.data = {
      ...this.data,
      furniture: this.data.furniture.map(f =>
        f.id === objectId ? { ...f, scale: newScale, position: newPosition, roomId: room.id } : f
      )
    };
    this.notify();

    return {
      success: true,
      objectId,
      name: item.name,
      roomName: room.name,
      wallDirection: chosenWall,
      previousDimensions: prevDimensions,
      newDimensions: { x: newDimX, y: newDimY, z: newDimZ },
      position: newPosition
    };
  }

  public autoFitRoomFurniture(roomId: string, category?: string): Array<{
    objectId: string;
    name: string;
    wallDirection: string;
    newDimensions: Vector3D;
  }> {
    const room = this.data.rooms.find(r => r.id === roomId);
    if (!room) return [];

    const items = this.data.furniture.filter(f => {
      if (f.roomId !== roomId) return false;
      if (category && category !== 'all' && f.category !== category) return false;
      return true;
    });

    const results: Array<any> = [];
    for (const item of items) {
      const res = this.fitFurnitureToWall(item.id, { snapToWall: true });
      if (res) results.push(res);
    }
    return results;
  }

  public deleteObject(objectId: string): boolean {
    const item = this.data.furniture.find(f => f.id === objectId);
    if (!item) return false;
    this.saveSnapshot();

    this.data = {
      ...this.data,
      furniture: this.data.furniture.filter(f => f.id !== objectId)
    };
    this.notify();
    return true;
  }

  public setTransformLock(targetId: string, locked: boolean): boolean {
    const item = this.data.furniture.find(f => f.id === targetId);
    const room = this.data.rooms.find(r => r.id === targetId);
    if (!item && !room) return false;

    this.saveSnapshot();
    if (item) {
      this.data = {
        ...this.data,
        furniture: this.data.furniture.map(f => (f.id === targetId ? { ...f, locked } : f))
      };
    } else if (room) {
      this.data = {
        ...this.data,
        rooms: this.data.rooms.map(r => (r.id === targetId ? { ...r, locked } : r))
      };
    }
    this.notify();
    return true;
  }

  // --- Structural Wall / Door / Window Tools ---

  public addWall(input: {
    roomId: string;
    start: { x: number; z: number };
    end: { x: number; z: number };
    height?: number;
    thickness?: number;
  }): WallSegment {
    this.saveSnapshot();
    const id = `wall-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newWall: WallSegment = {
      id,
      roomId: input.roomId,
      start: input.start,
      end: input.end,
      height: input.height || this.data.globalCeilingHeight,
      thickness: input.thickness || 0.5,
      color: '#f1f5f9'
    };
    this.data = {
      ...this.data,
      customWalls: [...this.data.customWalls, newWall]
    };
    this.notify();
    return newWall;
  }

  public setWallDimensions(wallId: string, length?: number, height?: number, thickness?: number): boolean {
    const wall = this.data.customWalls.find(w => w.id === wallId);
    if (!wall) return false;
    this.saveSnapshot();

    this.data = {
      ...this.data,
      customWalls: this.data.customWalls.map(w => {
        if (w.id === wallId) {
          let start = w.start;
          let end = w.end;
          if (length !== undefined && length > 0) {
            const dx = end.x - start.x;
            const dz = end.z - start.z;
            const currentLen = Math.sqrt(dx * dx + dz * dz) || 1;
            const scale = length / currentLen;
            end = {
              x: start.x + dx * scale,
              z: start.z + dz * scale
            };
          }
          return {
            ...w,
            start,
            end,
            height: height !== undefined ? height : w.height,
            thickness: thickness !== undefined ? thickness : w.thickness
          };
        }
        return w;
      })
    };
    this.notify();
    return true;
  }

  public placeDoor(input: {
    roomId: string;
    wallId?: string;
    position: Vector3D;
    width?: number;
    height?: number;
    doorType?: any;
  }): DoorOpening {
    this.saveSnapshot();
    const id = `door-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newDoor: DoorOpening = {
      id,
      roomId: input.roomId,
      wallId: input.wallId,
      position: input.position,
      width: input.width || 3.2,
      height: input.height || 7.0,
      doorType: input.doorType || 'standard',
      rotation: 0
    };
    this.data = {
      ...this.data,
      doors: [...this.data.doors, newDoor]
    };
    this.notify();
    return newDoor;
  }

  public placeWindow(input: {
    roomId: string;
    wallId?: string;
    position: Vector3D;
    width?: number;
    height?: number;
    elevation?: number;
  }): WindowOpening {
    this.saveSnapshot();
    const id = `win-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newWin: WindowOpening = {
      id,
      roomId: input.roomId,
      wallId: input.wallId,
      position: input.position,
      width: input.width || 4.5,
      height: input.height || 4.5,
      elevation: input.elevation || 3.0,
      rotation: 0
    };
    this.data = {
      ...this.data,
      windows: [...this.data.windows, newWin]
    };
    this.notify();
    return newWin;
  }

  public changeCeilingHeight(height: number, roomId?: string): boolean {
    this.saveSnapshot();
    if (roomId) {
      this.data = {
        ...this.data,
        rooms: this.data.rooms.map(r => (r.id === roomId ? { ...r, height } : r))
      };
    } else {
      this.data = {
        ...this.data,
        globalCeilingHeight: height,
        rooms: this.data.rooms.map(r => ({ ...r, height }))
      };
    }
    this.notify();
    return true;
  }

  // --- Material Tools ---

  public applyMaterial(
    targetId: string,
    targetType: 'room_floor' | 'room_wall' | 'object',
    materialId: string,
    color?: string
  ): boolean {
    this.saveSnapshot();
    if (targetType === 'room_floor') {
      this.data = {
        ...this.data,
        rooms: this.data.rooms.map(r =>
          r.id === targetId ? { ...r, floorMaterial: materialId as RoomFloorMaterial } : r
        )
      };
    } else if (targetType === 'room_wall') {
      this.data = {
        ...this.data,
        rooms: this.data.rooms.map(r => (r.id === targetId ? { ...r, wallColor: color || materialId } : r))
      };
    } else {
      this.data = {
        ...this.data,
        furniture: this.data.furniture.map(f =>
          f.id === targetId ? { ...f, material: materialId, color: color || f.color } : f
        )
      };
    }
    this.notify();
    return true;
  }

  public changeTexture(targetId: string, textureType: string, options?: any): boolean {
    this.saveSnapshot();
    this.data = {
      ...this.data,
      furniture: this.data.furniture.map(f => (f.id === targetId ? { ...f, material: textureType } : f)),
      rooms: this.data.rooms.map(r =>
        r.id === targetId ? { ...r, floorMaterial: textureType as RoomFloorMaterial } : r
      )
    };
    this.notify();
    return true;
  }

  // --- Scene Inspection & State Snapshot ---

  public getSceneState(options?: {
    includeFurniture?: boolean;
    includeMeasurements?: boolean;
    roomId?: string;
  }): SceneStateSnapshot {
    const rooms = options?.roomId
      ? this.data.rooms.filter(r => r.id === options.roomId)
      : this.data.rooms;

    const furniture = options?.roomId
      ? this.data.furniture.filter(f => f.roomId === options.roomId)
      : options?.includeFurniture !== false
      ? this.data.furniture
      : [];

    const totalAreaSqFt = rooms.reduce((acc, r) => acc + getRoomAreaSqFt(r), 0);
    const enrichedRooms = rooms.map(r => ({
      ...r,
      footprint: getRoomFootprint(r)
    }));

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      unit: 'feet',
      dimensions: {
        totalAreaSqFt,
        roomCount: rooms.length,
        furnitureCount: furniture.length,
        ceilingHeightAvg: this.data.globalCeilingHeight
      },
      rooms: enrichedRooms,
      furniture,
      doors: this.data.doors,
      windows: this.data.windows,
      connectionGates: this.data.gates,
      gates: this.data.gates,
      customWalls: this.data.customWalls
    };
  }

  public highlightObject(objectId: string, durationMs: number = 2500) {
    this.data = {
      ...this.data,
      furniture: this.data.furniture.map(f =>
        f.id === objectId ? { ...f, highlightedByAgent: true } : f
      )
    };
    this.notify();

    setTimeout(() => {
      this.data = {
        ...this.data,
        furniture: this.data.furniture.map(f =>
          f.id === objectId ? { ...f, highlightedByAgent: false } : f
        )
      };
      this.notify();
    }, durationMs);
  }

  public resetToDefault() {
    this.saveSnapshot();
    this.data = {
      rooms: [],
      furniture: [],
      gates: [],
      doors: [],
      windows: [],
      customWalls: [],
      globalCeilingHeight: 9.5,
      floorPlan: undefined,
      validation: undefined
    };
    historyManager.clear();
    this.notify();
  }

  public loadSceneData(data: Partial<SceneData>) {
    this.data = {
      rooms: data.rooms ? [...data.rooms] : [],
      furniture: data.furniture ? [...data.furniture] : [],
      gates: data.gates ? [...data.gates] : [],
      doors: data.doors ? [...data.doors] : [],
      windows: data.windows ? [...data.windows] : [],
      customWalls: data.customWalls ? [...data.customWalls] : [],
      globalCeilingHeight: data.globalCeilingHeight ?? 9.5
    };
    historyManager.clear();
    this.notify();
  }

  public setFloorPlan(plan: FloorPlan, validation?: GeometryValidation) {
    this.data.floorPlan = plan;
    if (validation) {
      this.data.validation = validation;
    }

    // Synchronize into legacy Room[] structures for complete backward compatibility
    const synchedRooms: Room[] = plan.rooms.map(r => {
      const center = r.center || { x: 0, y: 0 };
      return {
        id: r.id,
        name: r.name,
        width: r.width || 12,
        depth: r.depth || 12,
        height: 9.5,
        position: { x: center.x, y: 0, z: center.y },
        floorMaterial: r.floorMaterial || 'hardwood_oak',
        wallColor: r.wallColor || '#f8fafc',
        wallThickness: 0.5,
        locked: false,
        connections: r.connections || []
      };
    });

    const synchedDoors: DoorOpening[] = plan.openings
      .filter(o => o.type === 'door')
      .map(o => {
        const hostWall = plan.walls.find(w => w.id === o.wallId);
        let posX = 0, posZ = 0;
        if (hostWall) {
          posX = hostWall.start.x + (hostWall.end.x - hostWall.start.x) * o.position;
          posZ = hostWall.start.y + (hostWall.end.y - hostWall.start.y) * o.position;
        }
        return {
          id: o.id,
          roomId: hostWall?.roomId || synchedRooms[0]?.id || 'room-0',
          wallId: o.wallId,
          position: { x: posX, y: 0, z: posZ },
          width: o.width,
          height: o.height || 7.0,
          doorType: o.doorType || 'standard',
          rotation: 0
        };
      });

    const synchedWindows: WindowOpening[] = plan.openings
      .filter(o => o.type === 'window')
      .map(o => {
        const hostWall = plan.walls.find(w => w.id === o.wallId);
        let posX = 0, posZ = 0;
        if (hostWall) {
          posX = hostWall.start.x + (hostWall.end.x - hostWall.start.x) * o.position;
          posZ = hostWall.start.y + (hostWall.end.y - hostWall.start.y) * o.position;
        }
        return {
          id: o.id,
          roomId: hostWall?.roomId || synchedRooms[0]?.id || 'room-0',
          wallId: o.wallId,
          position: { x: posX, y: 0, z: posZ },
          width: o.width,
          height: o.height || 4.5,
          elevation: o.elevation || 3.0,
          rotation: 0
        };
      });

    const synchedWalls: WallSegment[] = plan.walls.map(w => ({
      id: w.id,
      roomId: w.roomId || synchedRooms[0]?.id || 'room-0',
      start: { x: w.start.x, z: w.start.y },
      end: { x: w.end.x, z: w.end.y },
      height: w.height || 9.5,
      thickness: w.thickness || 0.5,
      color: w.color || '#f1f5f9'
    }));

    this.data.rooms = synchedRooms;
    this.data.doors = synchedDoors;
    this.data.windows = synchedWindows;
    this.data.customWalls = synchedWalls;

    this.saveSnapshot();
    this.notify();
  }

  public getFloorPlan(): FloorPlan | undefined {
    return this.data.floorPlan;
  }

  public clearScene() {
    this.data = {
      rooms: [],
      furniture: [],
      gates: [],
      doors: [],
      windows: [],
      customWalls: [],
      globalCeilingHeight: 9.5,
      floorPlan: undefined,
      validation: undefined
    };
    historyManager.clear();
    this.notify();
  }

  public getThumbnailSVG(): string {
    const rooms = this.data.rooms;
    if (rooms.length === 0) {
      const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
        <rect width="320" height="200" fill="#0f172a"/>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="320" height="200" fill="url(#grid)"/>
        <text x="160" y="105" fill="#475569" font-family="sans-serif" font-size="13" text-anchor="middle" font-weight="500">Blank Workspace</text>
      </svg>`;
      return `data:image/svg+xml;utf8,${encodeURIComponent(emptySvg)}`;
    }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const r of rooms) {
      minX = Math.min(minX, r.position.x - r.width / 2);
      maxX = Math.max(maxX, r.position.x + r.width / 2);
      minZ = Math.min(minZ, r.position.z - r.depth / 2);
      maxZ = Math.max(maxZ, r.position.z + r.depth / 2);
    }

    const pad = 4;
    minX -= pad;
    maxX += pad;
    minZ -= pad;
    maxZ += pad;
    const w = Math.max(10, maxX - minX);
    const h = Math.max(10, maxZ - minZ);

    const roomElements = rooms.map(r => {
      const rx = r.position.x - r.width / 2;
      const rz = r.position.z - r.depth / 2;
      return `<rect x="${rx}" y="${rz}" width="${r.width}" height="${r.depth}" fill="#1e293b" stroke="#3b82f6" stroke-width="0.3" rx="0.3" opacity="0.9"/>
      <text x="${r.position.x}" y="${r.position.z + 0.3}" fill="#93c5fd" font-family="sans-serif" font-size="${Math.min(1.2, r.width * 0.18)}" text-anchor="middle" font-weight="600" opacity="0.8">${r.name.length > 12 ? r.name.substring(0, 11) + '..' : r.name}</text>`;
    }).join('\n');

    const furnElements = this.data.furniture.slice(0, 40).map(f => {
      const fw = f.dimensions.x || 2;
      const fd = f.dimensions.z || 2;
      const fx = f.position.x - fw / 2;
      const fz = f.position.z - fd / 2;
      return `<rect x="${fx}" y="${fz}" width="${fw}" height="${fd}" fill="#60a5fa" opacity="0.6" rx="0.2"/>`;
    }).join('\n');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minZ} ${w} ${h}" width="320" height="200">
      <rect x="${minX}" y="${minZ}" width="${w}" height="${h}" fill="#0b0f19"/>
      <g>${roomElements}</g>
      <g>${furnElements}</g>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}

export const sceneStore = new SceneStore();
