/**
 * Zero hardcoded project geometry.
 * Projects are generated exclusively from CAD/floor-plan inputs or user geometry.
 */

import { SceneData } from '../state/sceneStore';
import { CADReferenceData, Project } from '../types/project';

export const FLOORPLAN_3BHK_SCENE: SceneData = {
  rooms: [],
  furniture: [],
  gates: [],
  doors: [],
  windows: [],
  customWalls: [],
  globalCeilingHeight: 9.5
};

export const FLOORPLAN_3BHK_CAD_DATA: CADReferenceData = {
  fileName: 'floorplan_3bhk.jpg',
  dataUrl: '/cad/floorplan_3bhk.jpg',
  opacity: 0.75,
  visible: true
};

export function build3BHKFloorPlanProject(): Project {
  return {
    metadata: {
      id: 'proj-3bhk-blueprint-residence',
      name: '3BHK Floor Plan Workspace',
      description: 'Dynamic residential workspace generated from CAD input',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      roomCount: 0,
      furnitureCount: 0,
      totalAreaSqFt: 0,
      tags: ['residential'],
      unit: 'feet',
      version: '1.0.0'
    },
    sceneData: FLOORPLAN_3BHK_SCENE,
    cadData: FLOORPLAN_3BHK_CAD_DATA
  };
}
