import { sceneStore } from '../../state/sceneStore';
import { uiStore } from '../../state/uiStore';
import {
  CreateRoomInput,
  RenameRoomInput,
  MoveRoomInput,
  SetRoomDimensionsInput,
  DeleteRoomInput,
  ConnectRoomsInput
} from '../../types/webmcp';
import { getRoomAreaSqFt } from '../../geometry/roomGeometry';

export const roomTools = {
  create_room: {
    name: 'create_room',
    title: 'Create Room',
    category: 'Rooms' as const,
    description: 'Creates a new architectural room space on the floor plan with custom dimensions, position, and floor material.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Display name of the room (e.g. Study, Master Bedroom)' },
        width: { type: 'number', description: 'Width of room in feet' },
        depth: { type: 'number', description: 'Depth of room in feet' },
        height: { type: 'number', description: 'Ceiling height of room in feet (default 9.5)' },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          description: 'Center coordinates of the room in feet {x, y, z}'
        },
        floorMaterial: {
          type: 'string',
          enum: [
            'hardwood_oak',
            'hardwood_walnut',
            'marble_carrara',
            'marble_nero',
            'terrazzo',
            'concrete_polished',
            'ceramic_tile',
            'carpet_plush',
            'herringbone_wood'
          ],
          description: 'Floor surface material texture'
        },
        wallColor: { type: 'string', description: 'Wall paint hex color code (e.g. #f1f5f9)' },
        notch: {
          type: 'object',
          properties: {
            corner: {
              type: 'string',
              enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
              description: 'Which corner of the room is cut out to form the L-shape'
            },
            width: { type: 'number', description: 'Width of cutout in feet' },
            depth: { type: 'number', description: 'Depth of cutout in feet' }
          },
          required: ['corner', 'width', 'depth'],
          description: 'Optional corner notch cutout parameterizing an L-shaped room'
        }
      },
      required: ['name', 'width', 'depth']
    },
    execute: async (input: CreateRoomInput) => {
      const room = sceneStore.createRoom(input);
      uiStore.setSelected(room.id, 'room');
      const shapeDesc = room.notch ? `L-shaped ${room.width}x${room.depth} ft (notch: ${room.notch.corner})` : `${room.width}x${room.depth} ft`;
      uiStore.recordAgentAction('create_room', `Created room "${room.name}" (${shapeDesc})`, room.id);
      return {
        success: true,
        roomId: room.id,
        name: room.name,
        dimensions: { width: room.width, depth: room.depth, height: room.height },
        position: room.position,
        notch: room.notch,
        footprint: room.footprint,
        areaSqFt: getRoomAreaSqFt(room)
      };
    }
  },

  rename_room: {
    name: 'rename_room',
    title: 'Rename Room',
    category: 'Rooms' as const,
    description: 'Renames an existing room by its stable room ID.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: { type: 'string', description: 'Stable ID of the room (e.g. room-living)' },
        newName: { type: 'string', description: 'New display name for the room' }
      },
      required: ['roomId', 'newName']
    },
    execute: async (input: RenameRoomInput) => {
      const ok = sceneStore.renameRoom(input.roomId, input.newName);
      if (!ok) throw new Error(`Room with ID "${input.roomId}" not found.`);
      uiStore.recordAgentAction('rename_room', `Renamed room to "${input.newName}"`, input.roomId);
      return { success: true, roomId: input.roomId, newName: input.newName };
    }
  },

  move_room: {
    name: 'move_room',
    title: 'Move Room',
    category: 'Rooms' as const,
    description: 'Translates a room and all enclosed furniture to a new {x, y, z} position in feet.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: { type: 'string', description: 'Stable ID of the room' },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z'],
          description: 'New center coordinates in feet'
        }
      },
      required: ['roomId', 'position']
    },
    execute: async (input: MoveRoomInput) => {
      const ok = sceneStore.moveRoom(input.roomId, input.position);
      if (!ok) throw new Error(`Could not move room "${input.roomId}". Check if room exists and is unlocked.`);
      uiStore.recordAgentAction('move_room', `Moved room to (${input.position.x}, ${input.position.z}) ft`, input.roomId);
      return { success: true, roomId: input.roomId, position: input.position };
    }
  },

  set_room_dimensions: {
    name: 'set_room_dimensions',
    title: 'Set Room Dimensions',
    category: 'Rooms' as const,
    description: 'Resizes the width, depth, or ceiling height of an existing room in feet.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: { type: 'string', description: 'Stable ID of the room' },
        width: { type: 'number', description: 'New width in feet' },
        depth: { type: 'number', description: 'New depth in feet' },
        height: { type: 'number', description: 'Optional new ceiling height in feet' },
        notch: {
          type: 'object',
          properties: {
            corner: {
              type: 'string',
              enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
              description: 'Which corner of the room is cut out to form the L-shape'
            },
            width: { type: 'number', description: 'Width of cutout in feet' },
            depth: { type: 'number', description: 'Depth of cutout in feet' }
          },
          required: ['corner', 'width', 'depth'],
          description: 'Optional corner notch cutout parameterizing an L-shaped room'
        }
      },
      required: ['roomId', 'width', 'depth']
    },
    execute: async (input: SetRoomDimensionsInput) => {
      const ok = sceneStore.setRoomDimensions(input.roomId, input.width, input.depth, input.height, input.notch);
      if (!ok) throw new Error(`Could not resize room "${input.roomId}".`);
      const updatedRoom = sceneStore.getData().rooms.find(r => r.id === input.roomId)!;
      uiStore.recordAgentAction('set_room_dimensions', `Resized room to ${input.width}x${input.depth} ft`, input.roomId);
      return {
        success: true,
        roomId: input.roomId,
        width: input.width,
        depth: input.depth,
        height: input.height,
        notch: updatedRoom.notch,
        footprint: updatedRoom.footprint,
        areaSqFt: getRoomAreaSqFt(updatedRoom)
      };
    }
  },

  delete_room: {
    name: 'delete_room',
    title: 'Delete Room',
    category: 'Rooms' as const,
    description: 'Deletes a room and cleans up enclosed furniture, connection gates, and openings. Requires confirmation.',
    requiresConfirmation: true,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: { type: 'string', description: 'Stable ID of the room to delete' }
      },
      required: ['roomId']
    },
    execute: async (input: DeleteRoomInput) => {
      const room = sceneStore.getData().rooms.find(r => r.id === input.roomId);
      const name = room?.name || input.roomId;
      const ok = sceneStore.deleteRoom(input.roomId);
      if (!ok) throw new Error(`Room with ID "${input.roomId}" not found.`);
      uiStore.setSelected(null);
      uiStore.recordAgentAction('delete_room', `Deleted room "${name}"`, input.roomId);
      return { success: true, deletedRoomId: input.roomId, deletedRoomName: name };
    }
  },

  connect_rooms: {
    name: 'connect_rooms',
    title: 'Connect Rooms',
    category: 'Rooms' as const,
    description: 'Creates a shared doorway gate opening between two adjacent rooms.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomIdA: { type: 'string', description: 'ID of the first room' },
        roomIdB: { type: 'string', description: 'ID of the second room' },
        wallDirection: {
          type: 'string',
          enum: ['above', 'right', 'below', 'left'],
          description: 'Direction of room B relative to room A'
        },
        openingWidth: { type: 'number', description: 'Width of doorway opening in feet (default 4)' }
      },
      required: ['roomIdA', 'roomIdB']
    },
    execute: async (input: ConnectRoomsInput) => {
      const gate = sceneStore.connectRooms(
        input.roomIdA,
        input.roomIdB,
        input.wallDirection || 'right',
        input.openingWidth || 4
      );
      if (!gate) throw new Error(`Could not connect rooms "${input.roomIdA}" and "${input.roomIdB}".`);
      uiStore.recordAgentAction('connect_rooms', `Connected rooms with ${gate.width}ft doorway`, gate.id);
      return {
        success: true,
        gateId: gate.id,
        roomIdA: gate.roomIdA,
        roomIdB: gate.roomIdB,
        position: gate.position,
        width: gate.width,
        openingWidth: gate.width
      };
    }
  }
};
