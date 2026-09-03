import { RoomFloorMaterial, Vector2D, Vector3D } from './scene';

export interface Point {
  x: number; // in feet (canonical world coordinate X)
  y: number; // in feet (canonical world coordinate Z, or 2D Y)
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number; // in feet (e.g. 0.5 for exterior, 0.4 for interior)
  isExterior: boolean;
  height?: number; // in feet (default 9.5)
  color?: string;
  roomId?: string; // primary adjacent room
}

export type OpeningType = 'door' | 'window';

export interface Opening {
  id: string;
  type: OpeningType;
  wallId: string;
  position: number; // 0.0 to 1.0 parametric offset along host wall segment
  width: number; // width in feet (e.g. 3.0, 4.5, 6.0)
  height?: number; // height in feet (e.g. 7.0 for doors, 4.5 for windows)
  elevation?: number; // sill elevation in feet above floor (0 for doors, ~3.0 for windows)
  doorType?: 'standard' | 'double' | 'sliding' | 'pocket' | 'arch';
  swingAngle?: number; // degrees (e.g. 90)
}

export interface DimensionAnnotation {
  id: string;
  rawText: string;
  widthFeet: number;
  depthFeet: number;
  position: Point;
  matchedRoomName?: string;
}

export interface RoomPolygon {
  id: string;
  name: string;
  role: 'living' | 'master_bed' | 'bedroom' | 'kitchen' | 'bathroom' | 'balcony' | 'study' | 'dining' | 'wash' | 'store' | 'utility' | 'lift';
  polygon: Point[]; // Closed perimeter vertices in canonical feet
  width?: number; // Bounding box or explicit dimension in feet
  depth?: number; // Bounding box or explicit dimension in feet
  floorMaterial?: RoomFloorMaterial;
  wallColor?: string;
  center?: Point;
  explicitDimensionText?: string;
  connections?: string[];
}

export interface FloorPlan {
  id: string;
  name: string;
  walls: Wall[];
  rooms: RoomPolygon[];
  openings: Opening[];
  columns?: Point[];
  scale: number; // pixels per foot or CAD units per foot
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    widthFeet: number;
    depthFeet: number;
  };
  sourceDimensions?: {
    widthFeet: number;
    depthFeet: number;
  };
  unit: 'feet';
}

export interface GeometryValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number; // 0.0 to 1.0 (1.0 = 100% verified)
  metrics: {
    wallCount: number;
    roomCount: number;
    openingCount: number;
    unclosedPolygons: number;
    overlappingWalls: number;
    dimensionDeviations: number;
  };
}

/**
 * Coordinate conversions:
 * Canonical feet <-> Three.js meters (FT_TO_M = 0.3048)
 */
export const FT_TO_METERS = 0.3048;
export const METERS_TO_FT = 3.28084;

export function pointToVector3D(p: Point, y: number = 0): Vector3D {
  return { x: p.x, y, z: p.y };
}

export function pointToVector2D(p: Point): Vector2D {
  return { x: p.x, z: p.y };
}
