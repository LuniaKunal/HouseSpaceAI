import { sceneStore } from '../../state/sceneStore';
import { uiStore } from '../../state/uiStore';
import { projectStore } from '../../state/projectStore';
import { agentStore } from '../../state/agentStore';
import { Build3DFromCADInput } from '../../types/webmcp';
import {
  analyzeFloorplanImage,
  parseUserDesignRequest,
  synthesizeArchitecturalPlan
} from '../imageFloorplanAnalyzer';
import { extractFloorPlanFromBlueprint } from '../../geometry/geometryExtractor';
import { furnishRoomsWithConstraints } from '../../geometry/constrainedFurniture';
import { validateFloorPlanGeometry } from '../../geometry/geometryValidator';
import { FloorPlan, RoomPolygon, Wall } from '../../types/floorPlan';

export const cadTools = {
  build_3d_from_cad: {
    name: 'build_3d_from_cad',
    title: 'Build 3D Plan from CAD',
    category: 'Structure' as const,
    description: 'Synthesizes a 2D CAD architectural blueprint into a fully structured 3D interior plan with deterministic walls, doors, and furniture matching the image and user instructions.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        cadDataUrl: { type: 'string', description: 'Base64/data URL of the 2D CAD blueprint or floorplan image' },
        blueprintName: { type: 'string', description: 'Display name of the blueprint drawing' },
        userPrompt: { type: 'string', description: 'Design requirements / instructions from the user (e.g. 2BHK with open kitchen)' },
        projectName: { type: 'string', description: 'Target project name for context' },
        description: { type: 'string', description: 'Project description or client design notes' },
        stylePreset: {
          type: 'string',
          enum: ['modern_luxury', 'minimalist', 'warm_contemporary', 'scandinavian', 'industrial'],
          description: 'Architectural theme preset'
        },
        furnished: { type: 'boolean', description: 'Whether to furnish the generated rooms (default true)' }
      }
    },
    execute: async (input: Build3DFromCADInput) => {
      const activeProj = projectStore.getState().activeProject;
      const blueprintName = input.blueprintName || activeProj?.cadData?.fileName || '2D Architectural Plan';
      const cadUrl = input.cadDataUrl || activeProj?.cadData?.dataUrl;
      const projectName = input.projectName || activeProj?.metadata.name || 'New Project';
      const description = input.description || activeProj?.metadata.description || '';
      const userPrompt = input.userPrompt || '';

      uiStore.recordAgentAction(
        'build_3d_from_cad',
        `Synthesizing deterministic 3D architectural plan from "${blueprintName}" with geometric validation`
      );

      // 1. Run deterministic geometry extraction & validation
      const extraction = await extractFloorPlanFromBlueprint({
        dataUrl: cadUrl,
        blueprintName,
        userPrompt
      });

      const floorPlan = extraction.floorPlan;
      const validation = extraction.validation;

      // 2. Clear scene and apply deterministic FloorPlan
      sceneStore.clearScene();
      sceneStore.setFloorPlan(floorPlan, validation);

      // 3. Connect room gates based on topology
      let gatesCreatedCount = 0;
      const roomsInStore = sceneStore.getData().rooms;
      const roomNameToId = new Map<string, string>();
      roomsInStore.forEach(r => {
        roomNameToId.set(r.name.toLowerCase().trim(), r.id);
        roomNameToId.set(r.id, r.id);
      });

      for (const roomPoly of floorPlan.rooms) {
        const idA = roomNameToId.get(roomPoly.name.toLowerCase().trim()) || roomPoly.id;
        if (!roomPoly.connections) continue;

        for (const connTarget of roomPoly.connections) {
          const idB = roomNameToId.get(connTarget.toLowerCase().trim()) || connTarget;
          const rA = roomsInStore.find(r => r.id === idA);
          const rB = roomsInStore.find(r => r.id === idB);

          if (rA && rB && idA !== idB) {
            // Determine relative direction between rooms
            const dx = rB.position.x - rA.position.x;
            const dz = rB.position.z - rA.position.z;
            let dir: 'right' | 'left' | 'above' | 'below' = 'right';

            if (Math.abs(dx) > Math.abs(dz)) {
              dir = dx > 0 ? 'right' : 'left';
            } else {
              dir = dz > 0 ? 'below' : 'above';
            }

            const gate = sceneStore.connectRooms(idA, idB, dir, 4.0);
            if (gate) {
              gatesCreatedCount++;
            }
          }
        }
      }

      // 4. Place constrained interior furniture
      let furnitureCount = 0;
      if (input.furnished !== false) {
        const furnitureItems = furnishRoomsWithConstraints(floorPlan, {
          stylePreset: input.stylePreset
        });

        for (const item of furnitureItems) {
          sceneStore.addFurniture({
            type: item.type,
            name: item.name,
            roomId: item.roomId,
            position: item.position,
            rotation: item.rotation,
            color: item.color
          });
          furnitureCount++;
        }
      }

      // 5. Orient Camera to 3D Orbit Perspective
      uiStore.setCameraMode('3d', 'perspective');
      const firstRoomId = roomsInStore[0]?.id;
      if (firstRoomId) {
        uiStore.setSelected(firstRoomId, 'room');
      }
      uiStore.setActiveSidebarTab('copilot');

      const totalAreaSqFt = floorPlan.rooms.reduce((acc, r) => acc + (r.width || 12) * (r.depth || 12), 0);

      uiStore.showToast(
        'Deterministic 3D Plan Synthesized',
        `Reconstructed ${floorPlan.rooms.length} rooms from geometry (Confidence: ${(validation.confidence * 100).toFixed(0)}%).`,
        'success'
      );

      return {
        success: true,
        roomsCreated: floorPlan.rooms.length,
        gatesCreated: gatesCreatedCount,
        furniturePlaced: furnitureCount,
        totalAreaSqFt,
        viewMode: '3d',
        validationConfidence: validation.confidence,
        validationErrors: validation.errors,
        validationWarnings: validation.warnings,
        message: `Successfully synthesized "${blueprintName}" into a ${floorPlan.rooms.length}-room deterministic 3D architectural plan with ${(validation.confidence * 100).toFixed(0)}% geometric validation score.`
      };
    }
  }
};

export interface TriggerCadAutoBuildOptions {
  cadDataUrl?: string;
  blueprintName?: string;
  userPrompt?: string;
  projectName?: string;
  description?: string;
  stylePreset?: 'modern_luxury' | 'minimalist' | 'warm_contemporary' | 'scandinavian' | 'industrial';
  furnished?: boolean;
}

/**
 * Autonomous bridge trigger: Checks if AI Agent is connected,
 * and if so, initiates the CAD-to-3D build sequence.
 * Supports both options object and legacy (cadDataUrl, blueprintName) signatures.
 */
export async function triggerCadAutoBuildIfConnected(
  optionsOrUrl?: TriggerCadAutoBuildOptions | string,
  legacyBlueprintName?: string
): Promise<boolean> {
  const agentState = agentStore.getState();
  const isAgentConnected = agentState.activeBridgeConnections > 0;

  if (!isAgentConnected) {
    console.log('[triggerCadAutoBuild] AI Agent is not connected, skipping autonomous build.');
    return false;
  }

  let options: TriggerCadAutoBuildOptions = {};
  if (typeof optionsOrUrl === 'string') {
    options = {
      cadDataUrl: optionsOrUrl,
      blueprintName: legacyBlueprintName || 'Uploaded CAD Drawing'
    };
  } else if (optionsOrUrl) {
    options = optionsOrUrl;
  }

  try {
    uiStore.showToast('AI Agent Detected', 'Analyzing 2D CAD Blueprint and building 3D layout...', 'agent');
    await cadTools.build_3d_from_cad.execute({
      cadDataUrl: options.cadDataUrl,
      blueprintName: options.blueprintName || 'Uploaded CAD Drawing',
      userPrompt: options.userPrompt,
      projectName: options.projectName,
      description: options.description,
      stylePreset: options.stylePreset,
      furnished: options.furnished !== false
    });
    return true;
  } catch (err) {
    console.error('Error during autonomous CAD-to-3D build:', err);
    return false;
  }
}
