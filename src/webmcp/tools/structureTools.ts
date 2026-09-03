import { sceneStore } from '../../state/sceneStore';
import { uiStore } from '../../state/uiStore';
import {
  AddWallInput,
  SetWallDimensionsInput,
  PlaceDoorInput,
  PlaceWindowInput,
  ChangeCeilingHeightInput
} from '../../types/webmcp';

export const structureTools = {
  add_wall: {
    name: 'add_wall',
    title: 'Add Wall',
    category: 'Structure' as const,
    description: 'Adds an interior structural wall partition segment inside or across a room.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: { type: 'string', description: 'Associated room ID' },
        start: {
          type: 'object',
          properties: { x: { type: 'number' }, z: { type: 'number' } },
          required: ['x', 'z'],
          description: 'Start point in feet {x, z}'
        },
        end: {
          type: 'object',
          properties: { x: { type: 'number' }, z: { type: 'number' } },
          required: ['x', 'z'],
          description: 'End point in feet {x, z}'
        },
        height: { type: 'number', description: 'Wall height in feet' },
        thickness: { type: 'number', description: 'Wall thickness in feet (default 0.5)' }
      },
      required: ['roomId', 'start', 'end']
    },
    execute: async (input: AddWallInput) => {
      const wall = sceneStore.addWall(input);
      uiStore.setSelected(wall.id, 'wall');
      uiStore.recordAgentAction('add_wall', `Added interior wall in ${input.roomId}`, wall.id);
      return {
        success: true,
        wallId: wall.id,
        roomId: wall.roomId,
        start: wall.start,
        end: wall.end,
        height: wall.height,
        thickness: wall.thickness
      };
    }
  },

  set_wall_dimensions: {
    name: 'set_wall_dimensions',
    title: 'Set Wall Dimensions',
    category: 'Structure' as const,
    description: 'Modifies the length, height, or thickness of an existing custom wall segment.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        wallId: { type: 'string', description: 'Stable ID of the wall segment' },
        length: { type: 'number', description: 'New total length in feet' },
        height: { type: 'number', description: 'New height in feet' },
        thickness: { type: 'number', description: 'New thickness in feet' }
      },
      required: ['wallId']
    },
    execute: async (input: SetWallDimensionsInput) => {
      const ok = sceneStore.setWallDimensions(input.wallId, input.length, input.height, input.thickness);
      if (!ok) throw new Error(`Wall with ID "${input.wallId}" not found.`);
      uiStore.recordAgentAction('set_wall_dimensions', `Updated wall dimensions`, input.wallId);
      return { success: true, wallId: input.wallId };
    }
  },

  place_door: {
    name: 'place_door',
    title: 'Place Door',
    category: 'Structure' as const,
    description: 'Places an architectural door opening with standard, double, sliding, or pocket style.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: { type: 'string', description: 'Target room ID' },
        wallId: { type: 'string', description: 'Optional wall ID' },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          required: ['x', 'y', 'z'],
          description: 'Doorway position in feet {x, y, z}'
        },
        width: { type: 'number', description: 'Door width in feet (default 3.2)' },
        height: { type: 'number', description: 'Door height in feet (default 7.0)' },
        doorType: {
          type: 'string',
          enum: ['standard', 'double', 'sliding', 'pocket', 'arch'],
          description: 'Type of door construction'
        }
      },
      required: ['roomId', 'position']
    },
    execute: async (input: PlaceDoorInput) => {
      const door = sceneStore.placeDoor(input);
      uiStore.setSelected(door.id, 'door');
      uiStore.recordAgentAction('place_door', `Placed ${door.doorType} door in ${input.roomId}`, door.id);
      return {
        success: true,
        doorId: door.id,
        roomId: door.roomId,
        position: door.position,
        width: door.width,
        height: door.height,
        doorType: door.doorType
      };
    }
  },

  place_window: {
    name: 'place_window',
    title: 'Place Window',
    category: 'Structure' as const,
    description: 'Places a glass window opening on a room exterior or partition wall with elevation.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: { type: 'string', description: 'Target room ID' },
        wallId: { type: 'string', description: 'Optional wall ID' },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          required: ['x', 'y', 'z'],
          description: 'Center coordinates of the window opening in feet'
        },
        width: { type: 'number', description: 'Window width in feet (default 4.5)' },
        height: { type: 'number', description: 'Window height in feet (default 4.5)' },
        elevation: { type: 'number', description: 'Sill height above floor in feet (default 3.0)' }
      },
      required: ['roomId', 'position']
    },
    execute: async (input: PlaceWindowInput) => {
      const win = sceneStore.placeWindow(input);
      uiStore.setSelected(win.id, 'window');
      uiStore.recordAgentAction('place_window', `Placed window (${win.width}x${win.height} ft)`, win.id);
      return {
        success: true,
        windowId: win.id,
        roomId: win.roomId,
        position: win.position,
        width: win.width,
        height: win.height,
        elevation: win.elevation
      };
    }
  },

  change_ceiling_height: {
    name: 'change_ceiling_height',
    title: 'Change Ceiling Height',
    category: 'Structure' as const,
    description: 'Adjusts the ceiling height for a specific room or across the entire residence.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        height: { type: 'number', description: 'New ceiling height in feet (e.g. 9.5, 10.5, 12)' },
        roomId: { type: 'string', description: 'Optional room ID. If omitted, applies to all rooms.' }
      },
      required: ['height']
    },
    execute: async (input: ChangeCeilingHeightInput) => {
      const ok = sceneStore.changeCeilingHeight(input.height, input.roomId);
      if (!ok) throw new Error(`Could not update ceiling height.`);
      uiStore.recordAgentAction(
        'change_ceiling_height',
        `Adjusted ceiling height to ${input.height} ft ${input.roomId ? `in ${input.roomId}` : 'globally'}`
      );
      return { success: true, height: input.height, roomId: input.roomId || 'all' };
    }
  }
};
