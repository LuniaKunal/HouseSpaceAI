import { sceneStore } from '../../state/sceneStore';
import { uiStore } from '../../state/uiStore';
import {
  CreateRoomInput,
  AddConnectedRoomInput,
  FitRoomIntoNotchInput,
  RenameRoomInput,
  MoveRoomInput,
  SetRoomDimensionsInput,
  DeleteRoomInput,
  ConnectRoomsInput,
  DisconnectRoomsInput
} from '../../types/webmcp';
import { getRoomAreaSqFt } from '../../geometry/roomGeometry';

export const roomTools = {
  create_room: {
    name: 'create_room',
    title: 'Create Room',
    category: 'Rooms' as const,
    description: 'Creates a new architectural room space on the floor plan with custom dimensions, position, and floor material. Automatically positions non-overlapping standalone rooms when position is omitted.',
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
            x: { type: 'number', description: 'Center X coordinate in feet' },
            y: { type: 'number', description: 'Floor elevation Y (default 0)' },
            z: { type: 'number', description: 'Center Z coordinate in feet' }
          },
          required: ['x', 'z'],
          description: 'Center point position of the room in 3D scene feet'
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
        },
        connectedTo: {
          type: 'object',
          properties: {
            roomId: { type: 'string', description: 'ID of reference room to attach to' },
            direction: {
              type: 'string',
              enum: ['above', 'right', 'below', 'left'],
              description: 'Cardinal direction relative to reference room'
            },
            openingWidth: { type: 'number', description: 'Doorway opening width in feet' }
          },
          required: ['roomId', 'direction'],
          description: 'Optional reference room attachment configuration'
        }
      },
      required: ['name', 'width', 'depth']
    },
    execute: async (input: CreateRoomInput) => {
      if (input.connectedTo) {
        const connected = sceneStore.addConnectedRoom(
          input.connectedTo.roomId,
          input.connectedTo.direction,
          input.name,
          input.width,
          input.depth,
          input.floorMaterial,
          input.connectedTo.openingWidth || 4,
          input.notch
        );
        if (!connected) throw new Error(`Could not connect room to "${input.connectedTo.roomId}". Reference room not found.`);
        uiStore.setSelected(connected.id, 'room');
        uiStore.recordAgentAction('create_room', `Created connected room "${connected.name}"`, connected.id);
        return {
          success: true,
          roomId: connected.id,
          name: connected.name,
          dimensions: { width: connected.width, depth: connected.depth, height: connected.height },
          position: connected.position,
          notch: connected.notch,
          footprint: connected.footprint,
          areaSqFt: getRoomAreaSqFt(connected)
        };
      }

      let position = input.position;
      if (!position) {
        const existingRooms = sceneStore.getData().rooms;
        if (existingRooms.length > 0) {
          const maxX = Math.max(...existingRooms.map(r => r.position.x + r.width / 2));
          const avgZ = existingRooms.reduce((acc, r) => acc + r.position.z, 0) / existingRooms.length;
          position = { x: Math.round(maxX + input.width / 2 + 2), y: 0, z: Math.round(avgZ) };
        } else {
          position = { x: 0, y: 0, z: 0 };
        }
      }

      const room = sceneStore.createRoom({
        ...input,
        position
      });
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

  add_connected_room: {
    name: 'add_connected_room',
    title: 'Add Connected Room',
    category: 'Rooms' as const,
    description: 'Creates a new room attached directly to an existing reference room in a cardinal direction (above, right, below, left) with automatic shared wall alignment, doorway gate, and optional corner notch cutout.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        referenceRoomId: { type: 'string', description: 'ID of the existing room to attach to' },
        direction: {
          type: 'string',
          enum: ['above', 'right', 'below', 'left'],
          description: 'Direction of the new room relative to the reference room'
        },
        name: { type: 'string', description: 'Display name of the new room (e.g. Kitchen, Balcony, Master Bedroom)' },
        width: { type: 'number', description: 'Width of new room in feet (default 12)' },
        depth: { type: 'number', description: 'Depth of new room in feet (default 12)' },
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
        openingWidth: { type: 'number', description: 'Doorway gate opening width in feet (default 4)' },
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
      required: ['referenceRoomId', 'direction', 'name']
    },
    execute: async (input: AddConnectedRoomInput) => {
      const room = sceneStore.addConnectedRoom(
        input.referenceRoomId,
        input.direction,
        input.name,
        input.width || 12,
        input.depth || 12,
        input.floorMaterial,
        input.openingWidth || 4,
        input.notch
      );
      if (!room) {
        throw new Error(`Failed to add connected room. Reference room "${input.referenceRoomId}" not found.`);
      }
      uiStore.setSelected(room.id, 'room');
      const gate = sceneStore.getData().gates.find(g => (g.roomIdA === room.id || g.roomIdB === room.id));
      const shapeDesc = room.notch ? `L-shaped ${room.width}x${room.depth} ft` : `${room.width}x${room.depth} ft`;
      uiStore.recordAgentAction('add_connected_room', `Added ${shapeDesc} "${room.name}" connected ${input.direction} of ${input.referenceRoomId}`, room.id);
      return {
        success: true,
        roomId: room.id,
        name: room.name,
        dimensions: { width: room.width, depth: room.depth, height: room.height },
        position: room.position,
        notch: room.notch,
        footprint: room.footprint,
        connectedTo: input.referenceRoomId,
        direction: input.direction,
        gateId: gate?.id,
        areaSqFt: getRoomAreaSqFt(room)
      };
    }
  },

  fit_room_into_notch: {
    name: 'fit_room_into_notch',
    title: 'Fit Room into Cutout Notch',
    category: 'Rooms' as const,
    description: 'Creates a secondary room (e.g. ensuite bathroom, walk-in closet, pantry) that snugly fits inside the corner notch cutout of an L-shaped parent room, and connects them with an interior doorway gate.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        parentRoomId: { type: 'string', description: 'ID of the L-shaped parent room containing the cutout notch' },
        name: { type: 'string', description: 'Display name for the nested room (e.g. Master Bath, Ensuite, Walk-in Closet)' },
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
          description: 'Floor surface material texture (default: ceramic_tile)'
        },
        openingWidth: { type: 'number', description: 'Doorway gate opening width in feet (default: 2.5)' }
      },
      required: ['parentRoomId', 'name']
    },
    execute: async (input: FitRoomIntoNotchInput) => {
      const room = sceneStore.nestRoomInNotch(
        input.parentRoomId,
        input.name,
        input.floorMaterial,
        input.openingWidth || 2.5
      );
      if (!room) {
        throw new Error(`Failed to fit room into notch. Parent room "${input.parentRoomId}" not found or does not have a valid cutout notch.`);
      }
      uiStore.setSelected(room.id, 'room');
      const gate = sceneStore.getData().gates.find(g => (g.roomIdA === room.id || g.roomIdB === room.id));
      uiStore.recordAgentAction('fit_room_into_notch', `Nested "${room.name}" (${room.width}x${room.depth} ft) into cutout notch of parent room`, room.id);
      return {
        success: true,
        roomId: room.id,
        name: room.name,
        dimensions: { width: room.width, depth: room.depth, height: room.height },
        position: room.position,
        parentRoomId: input.parentRoomId,
        gateId: gate?.id,
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
    description: 'Creates a shared doorway gate opening between two adjacent rooms. Automatically snaps standalone rooms flush to eliminate gaps and cuts the doorway opening on both rooms.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomIdA: { type: 'string', description: 'ID of the first room' },
        roomIdB: { type: 'string', description: 'ID of the second room' },
        wallDirection: {
          type: 'string',
          enum: ['above', 'right', 'below', 'left'],
          description: 'Direction of room B relative to room A (auto-detected if omitted)'
        },
        openingWidth: { type: 'number', description: 'Width of doorway opening in feet (default 4)' }
      },
      required: ['roomIdA', 'roomIdB']
    },
    execute: async (input: ConnectRoomsInput) => {
      const data = sceneStore.getData();
      const rA = data.rooms.find(r => r.id === input.roomIdA);
      const rB = data.rooms.find(r => r.id === input.roomIdB);
      if (!rA || !rB) throw new Error(`Could not find rooms "${input.roomIdA}" and "${input.roomIdB}".`);

      let dir = input.wallDirection;
      if (!dir) {
        const dx = rB.position.x - rA.position.x;
        const dz = rB.position.z - rA.position.z;
        dir = Math.abs(dx) >= Math.abs(dz) ? (dx >= 0 ? 'right' : 'left') : (dz >= 0 ? 'below' : 'above');
      }

      const gate = sceneStore.connectRooms(
        input.roomIdA,
        input.roomIdB,
        dir,
        input.openingWidth || 4
      );
      if (!gate) throw new Error(`Could not connect rooms "${input.roomIdA}" and "${input.roomIdB}".`);
      uiStore.recordAgentAction('connect_rooms', `Connected rooms "${rA.name}" and "${rB.name}" with ${gate.width}ft doorway`, gate.id);
      
      const updatedData = sceneStore.getData();
      const updatedA = updatedData.rooms.find(r => r.id === input.roomIdA);
      const updatedB = updatedData.rooms.find(r => r.id === input.roomIdB);

      return {
        success: true,
        gateId: gate.id,
        roomIdA: gate.roomIdA,
        roomIdB: gate.roomIdB,
        wallDirection: gate.wallDirection,
        position: gate.position,
        width: gate.width,
        openingWidth: gate.width,
        roomAPosition: updatedA?.position,
        roomBPosition: updatedB?.position
      };
    }
  },

  disconnect_rooms: {
    name: 'disconnect_rooms',
    title: 'Disconnect Rooms',
    category: 'Rooms' as const,
    description: 'Removes the doorway gate connection between two rooms, restoring a solid partition wall.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomIdA: { type: 'string', description: 'ID of the first room' },
        roomIdB: { type: 'string', description: 'ID of the second room' },
        gateId: { type: 'string', description: 'Optional specific gate ID to remove' }
      }
    },
    execute: async (input: DisconnectRoomsInput) => {
      let rAId = input.roomIdA;
      let rBId = input.roomIdB;

      if (input.gateId && (!rAId || !rBId)) {
        const foundGate = sceneStore.getData().gates.find(g => g.id === input.gateId);
        if (foundGate) {
          rAId = foundGate.roomIdA;
          rBId = foundGate.roomIdB;
        }
      }

      if (!rAId || !rBId) {
        throw new Error('Please provide either roomIdA and roomIdB, or a valid gateId to disconnect rooms.');
      }

      const ok = sceneStore.disconnectRooms(rAId, rBId);
      if (!ok) {
        throw new Error(`Failed to disconnect rooms "${rAId}" and "${rBId}".`);
      }

      uiStore.recordAgentAction('disconnect_rooms', `Removed doorway connection between rooms`, input.gateId);
      return {
        success: true,
        roomIdA: rAId,
        roomIdB: rBId,
        message: 'Rooms disconnected; solid partition wall restored.'
      };
    }
  }
};
