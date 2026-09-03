/**
 * Zero hardcoded project geometry.
 * Projects are generated exclusively from CAD/floor-plan inputs or user geometry.
 */

import { SceneData } from '../state/sceneStore';
import { Project } from '../types/project';

export const FREIENDS_3BHK_SCENE: SceneData = {
  rooms: [],
  furniture: [],
  gates: [],
  doors: [],
  windows: [],
  customWalls: [],
  globalCeilingHeight: 9.5
};

export function buildFreiends3BHKProject(): Project {
  return {
    metadata: {
      id: 'proj-friends-3bhk',
      name: 'Friends 3BHK Workspace',
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
    sceneData: FREIENDS_3BHK_SCENE
  };
}
