export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Vector2D {
  x: number;
  z: number;
}

export type RoomFloorMaterial =
  | 'hardwood_oak'
  | 'hardwood_walnut'
  | 'marble_carrara'
  | 'marble_nero'
  | 'terrazzo'
  | 'concrete_polished'
  | 'ceramic_tile'
  | 'carpet_plush'
  | 'herringbone_wood';

export type DoorType = 'standard' | 'double' | 'sliding' | 'pocket' | 'arch';

export type CornerNotch = {
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  width: number; // cutout width in feet
  depth: number; // cutout depth in feet
};

export interface Room {
  id: string;
  name: string;
  width: number; // in feet (bounding box width)
  depth: number; // in feet (bounding box depth)
  height: number; // in feet
  position: Vector3D; // center position in feet (x, y=0, z)
  footprint?: Vector2D[]; // ordered polygon vertices in room-local coordinates
  notch?: CornerNotch; // optional L-shaped corner cutout
  floorMaterial: RoomFloorMaterial;
  wallColor: string; // hex color
  wallThickness: number; // feet (e.g. 0.5)
  locked: boolean;
  connections: string[]; // room IDs connected to this room
  colorTag?: string;
}

export interface WallSegment {
  id: string;
  roomId: string;
  start: Vector2D;
  end: Vector2D;
  height: number;
  thickness: number;
  color?: string;
}

export interface DoorOpening {
  id: string;
  roomId: string;
  wallId?: string;
  position: Vector3D; // in feet
  width: number; // in feet
  height: number; // in feet
  doorType: DoorType;
  rotation: number; // in degrees (yaw)
}

export interface WindowOpening {
  id: string;
  roomId: string;
  wallId?: string;
  position: Vector3D; // in feet
  width: number; // in feet
  height: number; // in feet
  elevation: number; // height above floor in feet
  rotation: number; // in degrees
}

export interface ConnectionGate {
  id: string;
  roomIdA: string;
  roomIdB: string;
  wallDirection: 'above' | 'right' | 'below' | 'left';
  width: number; // in feet
  height: number; // in feet
  position: Vector3D; // in feet
}

export type FurnitureCategory =
  | 'seating'
  | 'tables'
  | 'bedroom'
  | 'storage'
  | 'kitchen'
  | 'bathroom'
  | 'decor'
  | 'lighting'
  | 'outdoor'
  | 'spiritual'
  | 'office';

export interface FurnitureObject {
  id: string;
  name: string;
  type: string;
  category: FurnitureCategory;
  roomId?: string;
  position: Vector3D; // in feet
  rotation: Vector3D; // in degrees
  scale: Vector3D; // scale multiplier
  dimensions: Vector3D; // natural size in feet (width, height, depth)
  material: string;
  color?: string;
  locked: boolean;
  highlightedByAgent?: boolean;
}

export type CameraViewMode = '3d' | '2d' | 'walk';
export type CameraAngle = 'perspective' | 'top' | 'north' | 'east' | 'south' | 'west' | 'inside';

export interface SceneMeasurement {
  id: string;
  label: string;
  from: Vector3D;
  to: Vector3D;
  distanceFeet: number;
  roomId?: string;
}

import type { FloorPlan, GeometryValidation } from './floorPlan';

export interface SceneStateSnapshot {
  version: string;
  timestamp: string;
  unit: 'feet';
  dimensions: {
    totalAreaSqFt: number;
    roomCount: number;
    furnitureCount: number;
    ceilingHeightAvg: number;
  };
  rooms: Room[];
  furniture: FurnitureObject[];
  doors: DoorOpening[];
  windows: WindowOpening[];
  connectionGates: ConnectionGate[];
  gates?: ConnectionGate[];
  customWalls: WallSegment[];
  floorPlan?: FloorPlan;
  geometryValidation?: GeometryValidation;
}

export const FT_TO_M = 0.3048;
export const M_TO_FT = 3.28084;

