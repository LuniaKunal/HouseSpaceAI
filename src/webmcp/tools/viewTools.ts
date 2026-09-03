import { sceneStore } from '../../state/sceneStore';
import { uiStore } from '../../state/uiStore';
import {
  GenerateFloorPlanInput,
  SwitchViewInput,
  TakeScreenshotInput,
  GetSceneStateInput,
  SelectItemInput,
  SetGridSnapInput,
  AutofitViewInput
} from '../../types/webmcp';

export const viewTools = {
  generate_floor_plan: {
    name: 'generate_floor_plan',
    title: 'Generate Floor Plan',
    category: 'Scene / View' as const,
    description: 'Switches to the 2D CAD architectural schematic layout view and generates floor plan annotations.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        style: {
          type: 'string',
          enum: ['architectural', 'schematic', 'blueprint', 'minimal'],
          description: 'Stylistic rendering preset for the floor plan'
        },
        includeDimensions: { type: 'boolean', description: 'Whether to display dimensional annotations' }
      }
    },
    execute: async (input: GenerateFloorPlanInput) => {
      uiStore.setCameraMode('2d', 'top');
      if (input.includeDimensions !== undefined) {
        uiStore.setShowDimensions(input.includeDimensions);
      }
      uiStore.recordAgentAction('generate_floor_plan', `Generated ${input.style || 'architectural'} 2D floor plan`);
      const state = sceneStore.getSceneState();
      return {
        success: true,
        style: input.style || 'architectural',
        roomCount: state.dimensions.roomCount,
        totalAreaSqFt: state.dimensions.totalAreaSqFt,
        viewMode: '2d'
      };
    }
  },

  switch_view: {
    name: 'switch_view',
    title: 'Switch View',
    category: 'Scene / View' as const,
    description: 'Switches viewport camera mode between 3D orbit, 2D floorplan/elevations (top/north/east/south/west/inside), and 1st-person Walk mode.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        view: {
          type: 'string',
          enum: ['3d', '2d', 'walk'],
          description: 'Primary camera mode'
        },
        mode: {
          type: 'string',
          enum: ['3d', '2d', 'walk'],
          description: 'Alias for view mode'
        },
        angle: {
          type: 'string',
          enum: ['perspective', 'top', 'north', 'east', 'south', 'west', 'inside'],
          description: 'Specific orientation angle'
        },
        targetRoomId: { type: 'string', description: 'Focus camera on a specific room ID' }
      }
    },
    execute: async (input: SwitchViewInput) => {
      const mode = input.mode || input.view || '3d';
      const angle = input.angle || (mode === '2d' ? 'top' : 'perspective');
      uiStore.setCameraMode(mode, angle);

      if (input.targetRoomId) {
        uiStore.setSelected(input.targetRoomId, 'room');
      }

      uiStore.recordAgentAction('switch_view', `Switched camera to ${mode.toUpperCase()} (${angle})`);
      return { success: true, mode, angle, targetRoomId: input.targetRoomId };
    }
  },

  take_screenshot: {
    name: 'take_screenshot',
    title: 'Take Screenshot',
    category: 'Scene / View' as const,
    description: 'Captures a high-resolution snapshot rendering of the active canvas viewport.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        format: { type: 'string', enum: ['png', 'jpeg'], description: 'Image file format' },
        resolution: { type: 'string', enum: ['standard', 'hd', '4k'], description: 'Output resolution preset' },
        viewMode: { type: 'string', enum: ['3d', '2d', 'walk'], description: 'Optional view mode override' }
      }
    },
    execute: async (input: TakeScreenshotInput) => {
      if (input.viewMode) {
        uiStore.setCameraMode(input.viewMode);
      }

      // Read WebGL canvas if present (browser-safe)
      const canvas = typeof document !== 'undefined' ? (document.querySelector('canvas') as HTMLCanvasElement | null) : null;
      let dataUrl = '';
      if (canvas) {
        dataUrl = canvas.toDataURL(input.format === 'jpeg' ? 'image/jpeg' : 'image/png');
      }

      uiStore.recordAgentAction('take_screenshot', `Captured ${input.resolution || 'standard'} viewport screenshot`);
      return {
        success: true,
        format: input.format || 'png',
        resolution: input.resolution || 'standard',
        dataLength: dataUrl.length,
        capturedAt: new Date().toISOString()
      };
    }
  },

  get_scene_state: {
    name: 'get_scene_state',
    title: 'Get Scene State',
    category: 'Scene / View' as const,
    description: 'Returns the full source of truth: rooms, furniture items, connection gates, doors, windows, walls, and dimensions in feet.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        includeFurniture: { type: 'boolean', description: 'Include furniture items (default true)' },
        includeMeasurements: { type: 'boolean', description: 'Include spatial measurements (default true)' },
        roomId: { type: 'string', description: 'Optional room ID filter' }
      }
    },
    execute: async (input: GetSceneStateInput) => {
      const state = sceneStore.getSceneState(input);
      uiStore.recordAgentAction('get_scene_state', `Queried scene state (${state.dimensions.roomCount} rooms, ${state.dimensions.furnitureCount} objects)`);
      return state;
    }
  },

  select_item: {
    name: 'select_item',
    title: 'Select Item',
    category: 'Scene / View' as const,
    description: 'Selects a room, furniture piece, door, window, or wall in the 3D studio viewport and opens the inspector.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID of the element to select (or null to clear selection)' },
        type: {
          type: 'string',
          enum: ['room', 'furniture', 'wall', 'door', 'window', 'gate'],
          description: 'Type of item to select'
        }
      }
    },
    execute: async (input: SelectItemInput) => {
      uiStore.setSelected(input.id || null, input.type || null);
      uiStore.recordAgentAction(
        'select_item',
        input.id ? `Selected ${input.type || 'item'} "${input.id}"` : 'Cleared selection',
        input.id || undefined
      );
      return { success: true, selectedId: input.id, selectedType: input.type || null };
    }
  },

  set_grid_snap: {
    name: 'set_grid_snap',
    title: 'Set Grid Snap',
    category: 'Scene / View' as const,
    description: 'Toggles viewport grid snapping and configures snap grid increment in feet.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        enabled: { type: 'boolean', description: 'Enable or disable grid snapping' },
        size: { type: 'number', description: 'Grid snap interval in feet (e.g. 0.5, 1.0)' }
      },
      required: ['enabled']
    },
    execute: async (input: SetGridSnapInput) => {
      uiStore.setGridSnap(input.enabled, input.size);
      uiStore.recordAgentAction(
        'set_grid_snap',
        `Grid snap ${input.enabled ? 'enabled' : 'disabled'}${input.size ? ` (${input.size} ft)` : ''}`
      );
      return { success: true, enabled: input.enabled, size: input.size || uiStore.getState().gridSnapSize };
    }
  },

  autofit_view: {
    name: 'autofit_view',
    title: 'Auto-Fit View',
    category: 'Scene / View' as const,
    description: 'Auto-fits camera viewport framing for human visual inspection, centering on the entire residence floor plan, a designated room, or a selected furniture element with optimal human eye height and perspective.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        target: {
          type: 'string',
          enum: ['scene', 'room', 'selection'],
          description: 'Framing focus target (default "scene")'
        },
        roomId: {
          type: 'string',
          description: 'Room ID to focus on when target is "room"'
        },
        viewMode: {
          type: 'string',
          enum: ['3d', '2d', 'walk'],
          description: 'Optional view mode override'
        },
        framing: {
          type: 'string',
          enum: ['overview', 'close_up', 'human_eye'],
          description: 'Camera framing style (default "overview")'
        },
        padding: {
          type: 'number',
          description: 'Clearance padding around target in feet (default 4.0)'
        }
      }
    },
    execute: async (input: AutofitViewInput = {}) => {
      const target = input.target || 'scene';
      const framing = input.framing || 'overview';
      const padding = input.padding ?? 4.0;

      if (input.viewMode) {
        uiStore.setCameraMode(input.viewMode);
      }

      const activeUI = uiStore.getState();
      let targetId = input.roomId;
      if (target === 'selection') {
        targetId = activeUI.selectedId || undefined;
      } else if (target === 'room' && !targetId) {
        targetId = activeUI.selectedId || undefined;
      }

      const bbox = sceneStore.getSceneBoundingBox(target, targetId);
      const maxSpan = Math.max(bbox.size.x, bbox.size.z) + padding;
      const cameraMode = input.viewMode || activeUI.cameraMode;

      let cameraPos: { x: number; y: number; z: number };
      let cameraLookTarget: { x: number; y: number; z: number };
      let fov = 45;

      if (framing === 'human_eye' || cameraMode === 'walk') {
        cameraPos = {
          x: bbox.center.x,
          y: 5.5,
          z: bbox.center.z + bbox.size.z * 0.45
        };
        cameraLookTarget = {
          x: bbox.center.x,
          y: 4.5,
          z: bbox.center.z - bbox.size.z * 0.25
        };
        fov = 72;
      } else if (cameraMode === '2d') {
        cameraPos = {
          x: bbox.center.x,
          y: Math.max(35, maxSpan * 1.5),
          z: bbox.center.z + 0.001
        };
        cameraLookTarget = {
          x: bbox.center.x,
          y: 0,
          z: bbox.center.z
        };
      } else {
        const mult = framing === 'close_up' ? 0.9 : 1.35;
        cameraPos = {
          x: bbox.center.x,
          y: Math.max(18, maxSpan * mult * 0.8),
          z: bbox.center.z + Math.max(22, maxSpan * mult)
        };
        cameraLookTarget = {
          x: bbox.center.x,
          y: bbox.center.y * 0.5,
          z: bbox.center.z
        };
      }

      uiStore.autofitCamera({
        position: cameraPos,
        target: cameraLookTarget,
        fov
      });

      uiStore.recordAgentAction(
        'autofit_view',
        `Auto-fitted camera view on ${target}${targetId ? ` ("${targetId}")` : ''} for human inspection (${framing})`
      );

      return {
        success: true,
        target,
        targetId: targetId || null,
        framing,
        cameraMode,
        boundingCenter: bbox.center,
        boundingSize: bbox.size,
        cameraPosition: cameraPos,
        cameraLookTarget
      };
    }
  }
};
