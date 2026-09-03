import { Vector3D, RoomFloorMaterial, DoorType, CameraViewMode, CameraAngle, SceneStateSnapshot, CornerNotch, WallAlcove } from './scene';

export interface WebMCPToolDefinition {
  name: string;
  title: string;
  category: 'Rooms' | 'Structure' | 'Objects' | 'Materials' | 'Scene / View' | 'Workflow';
  description: string;
  requiresConfirmation?: boolean;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
}

export interface WebMCPTool extends WebMCPToolDefinition {
  execute: (input: any) => Promise<any>;
  handler?: (input: any) => Promise<any>;
}

export interface ModelContextInterface extends EventTarget {
  registerTool: (tool: WebMCPTool | any) => Promise<void> | void;
  unregisterTool: (name: string) => Promise<boolean> | boolean;
  getTools: () => Promise<WebMCPTool[]> | WebMCPTool[];
  tools?: WebMCPTool[];
  call?: (name: string, input: any) => Promise<any>;
  executeTool?: (name: string, input: any) => Promise<any>;
}

export interface ConfirmationRequest {
  id: string;
  toolName: string;
  input: Record<string, any>;
  description: string;
  timestamp: number;
  resolve: (approved: boolean) => void;
}

export interface AgentLogEntry {
  id: string;
  timestamp: string;
  toolName: string;
  input: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  status: 'pending' | 'success' | 'failed' | 'rejected';
  caller: 'webmcp' | 'bridge' | 'copilot' | 'user';
}

// 27 WebMCP Tool Input/Output Types

// Rooms
export interface CreateRoomInput {
  name: string;
  width: number; // in feet
  depth: number; // in feet
  height?: number; // in feet (default 9.5)
  position?: Vector3D; // in feet
  floorMaterial?: RoomFloorMaterial;
  wallColor?: string;
  notch?: CornerNotch;
  alcove?: WallAlcove;
  connectedTo?: {
    roomId: string;
    direction: 'above' | 'right' | 'below' | 'left';
    openingWidth?: number;
    alignment?: 'start' | 'center' | 'end' | number;
  };
  autoPosition?: boolean;
}

export interface AddConnectedRoomInput {
  referenceRoomId: string;
  direction: 'above' | 'right' | 'below' | 'left';
  name: string;
  width?: number; // in feet (default 12)
  depth?: number; // in feet (default 12)
  floorMaterial?: RoomFloorMaterial;
  openingWidth?: number; // in feet (default 4)
  notch?: CornerNotch;
  alignment?: 'start' | 'center' | 'end' | number;
  alcove?: WallAlcove;
}

export interface AddWallAlcoveInput {
  roomId: string;
  edge: 'north' | 'south' | 'east' | 'west';
  type: 'recess' | 'protrusion';
  offset?: number;
  width: number;
  depth: number;
}

export interface FitRoomIntoNotchInput {
  parentRoomId: string;
  name: string;
  floorMaterial?: RoomFloorMaterial;
  openingWidth?: number;
}

export interface SetRoomNotchInput {
  roomId: string;
  enabled?: boolean; // if false, removes notch and reverts room to rectangle
  corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  width?: number; // width of cutout in feet
  depth?: number; // depth of cutout in feet
  nestAttachedSpace?: {
    name: string;
    floorMaterial?: RoomFloorMaterial;
    openingWidth?: number;
  };
}

export interface RenameRoomInput {
  roomId: string;
  newName: string;
}

export interface MoveRoomInput {
  roomId: string;
  position: Vector3D;
}

export interface SetRoomDimensionsInput {
  roomId: string;
  width: number;
  depth: number;
  height?: number;
  notch?: CornerNotch | null;
}

export interface DeleteRoomInput {
  roomId: string;
}

export interface ConnectRoomsInput {
  roomIdA: string;
  roomIdB: string;
  wallDirection?: 'above' | 'right' | 'below' | 'left';
  openingWidth?: number;
}

export interface DisconnectRoomsInput {
  roomIdA?: string;
  roomIdB?: string;
  gateId?: string;
}

// Structure
export interface AddWallInput {
  roomId: string;
  start: { x: number; z: number };
  end: { x: number; z: number };
  height?: number;
  thickness?: number;
}

export interface SetWallDimensionsInput {
  wallId: string;
  length?: number;
  height?: number;
  thickness?: number;
}

export interface PlaceDoorInput {
  roomId: string;
  wallId?: string;
  position: Vector3D;
  width?: number;
  height?: number;
  doorType?: DoorType;
}

export interface PlaceWindowInput {
  roomId: string;
  wallId?: string;
  position: Vector3D;
  width?: number;
  height?: number;
  elevation?: number;
}

export interface ChangeCeilingHeightInput {
  roomId?: string; // if not provided, changes global ceiling height
  height: number;
}

// Objects
export interface AddFurnitureInput {
  type: string;
  roomId?: string;
  name?: string;
  position: Vector3D;
  rotation?: Vector3D;
  scale?: Vector3D;
  material?: string;
  color?: string;
}

export interface MoveObjectInput {
  objectId: string;
  position: Vector3D;
}

export interface RotateObjectInput {
  objectId: string;
  rotation: Vector3D; // in degrees
}

export interface ScaleObjectInput {
  objectId: string;
  scale: Vector3D;
}

export interface DeleteObjectInput {
  objectId: string;
}

export interface SetTransformLockInput {
  targetId: string;
  locked: boolean;
}

export interface SetFurnitureDimensionsInput {
  objectId: string;
  width?: number; // width in feet
  height?: number; // height in feet
  depth?: number; // depth in feet
}

export interface FitFurnitureToWallInput {
  objectId: string;
  wallDirection?: 'nearest' | 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number; // max allowed width in feet
  maxDepth?: number; // max allowed depth in feet
  margin?: number; // wall clearance margin in feet (default 0.25)
  snapToWall?: boolean; // whether to align position flush against adjacent wall (default true)
}

export interface AutoFitRoomFurnitureInput {
  roomId: string;
  category?: 'storage' | 'bedroom' | 'seating' | 'tables' | 'all';
}

export interface GetFurnitureCatalogInput {
  category?: string;
  searchQuery?: string;
}

// Materials
export interface ApplyMaterialInput {
  targetId: string;
  targetType: 'room_floor' | 'room_wall' | 'object';
  materialId: string;
  color?: string;
}

export interface ChangeTextureInput {
  targetId: string;
  textureType: string;
  scale?: number;
  roughness?: number;
  metalness?: number;
}

// Scene / View
export interface GenerateFloorPlanInput {
  style?: 'architectural' | 'schematic' | 'blueprint' | 'minimal';
  includeDimensions?: boolean;
}

export interface SwitchViewInput {
  view?: CameraViewMode; // '3d' | '2d' | 'walk'
  mode?: CameraViewMode;
  angle?: CameraAngle;
  targetRoomId?: string;
}

export interface TakeScreenshotInput {
  format?: 'png' | 'jpeg';
  resolution?: 'standard' | 'hd' | '4k';
  viewMode?: CameraViewMode;
}

export interface GetSceneStateInput {
  includeFurniture?: boolean;
  includeMeasurements?: boolean;
  roomId?: string;
}

// Workflow
export interface UndoInput { }
export interface RedoInput { }

export interface ExportModelInput {
  format: 'glb' | 'obj' | 'ifc4' | 'json';
  includeMetadata?: boolean;
}

export interface Build3DFromCADInput {
  cadDataUrl?: string;
  blueprintName?: string;
  userPrompt?: string;
  projectName?: string;
  description?: string;
  stylePreset?: 'modern_luxury' | 'minimalist' | 'warm_contemporary' | 'scandinavian' | 'industrial';
  furnished?: boolean;
}

// Project Management Tools
export interface CreateProjectInput {
  name: string;
  description?: string;
  template?: 'blank';
  cadDataUrl?: string;
  cadFileName?: string;
  userPrompt?: string;
  stylePreset?: 'modern_luxury' | 'minimalist' | 'warm_contemporary' | 'scandinavian' | 'industrial';
  autoBuild3D?: boolean;
}

export interface OpenProjectInput {
  projectId: string;
}

export interface ListProjectsInput {
  searchQuery?: string;
  sortBy?: 'updated' | 'name' | 'created';
}

export interface DeleteProjectInput {
  projectId?: string;
}

export interface DuplicateProjectInput {
  projectId?: string;
}

export interface LoadSampleProjectInput {
  sampleName: '3BHK_Sample' | '4BHK_Sample' | string;
}

export interface SelectItemInput {
  id: string | null;
  type?: 'room' | 'furniture' | 'wall' | 'door' | 'window' | 'gate' | null;
}

export interface SetGridSnapInput {
  enabled: boolean;
  size?: number; // in feet (e.g. 0.5 or 1.0)
}

export interface ClearSceneInput { }
