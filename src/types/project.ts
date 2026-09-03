import { SceneData } from '../state/sceneStore';

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // base64 or inline SVG data URL
  roomCount: number;
  furnitureCount: number;
  totalAreaSqFt: number;
  tags?: string[];
  unit: 'feet' | 'meters';
  version: string;
}

export interface CADReferenceData {
  fileName?: string;
  fileSize?: number;
  uploadedAt?: number;
  dataUrl?: string; // image / PDF / SVG base64
  scale?: number; // pixels per foot
  opacity?: number;
  position?: { x: number; z: number };
  visible?: boolean;
}

export interface ProjectSettings {
  defaultWallColor?: string;
  defaultFloorMaterial?: string;
  wallThickness?: number;
  globalCeilingHeight?: number;
}

export interface Project {
  metadata: ProjectMetadata;
  sceneData: SceneData;
  cadData?: CADReferenceData;
  aiChatHistory?: Array<{ id: string; role: 'user' | 'agent'; text: string; timestamp: number }>;
  settings?: ProjectSettings;
}

export type AutosaveStatus = 'saved' | 'saving' | 'error' | 'idle';
