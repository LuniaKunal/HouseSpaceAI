import { sceneStore } from '../../state/sceneStore';
import { uiStore } from '../../state/uiStore';
import {
  GenerateFloorPlanInput,
  SwitchViewInput,
  TakeScreenshotInput,
  GetSceneStateInput,
  SelectItemInput,
  SetGridSnapInput
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
  }
};
