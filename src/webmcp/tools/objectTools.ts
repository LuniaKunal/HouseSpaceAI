import { sceneStore } from '../../state/sceneStore';
import { uiStore } from '../../state/uiStore';
import {
  AddFurnitureInput,
  MoveObjectInput,
  RotateObjectInput,
  ScaleObjectInput,
  DeleteObjectInput,
  SetTransformLockInput,
  SetFurnitureDimensionsInput,
  FitFurnitureToWallInput,
  AutoFitRoomFurnitureInput
} from '../../types/webmcp';
import { isPointInRoom } from '../../geometry/roomGeometry';

export const objectTools = {
  add_furniture: {
    name: 'add_furniture',
    title: 'Add Furniture',
    category: 'Objects' as const,
    description: 'Instantiates a furniture, appliance, lighting, or decor piece into a designated room at specific coordinates.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          description: 'Catalog object type identifier (e.g. sofa_sectional, sofa_3seater, armchair_lounge, bed_king, bed_queen, dining_table_6s, kitchen_island, pooja_mandir, etc.)'
        },
        roomId: { type: 'string', description: 'Enclosing room ID' },
        name: { type: 'string', description: 'Custom display label' },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          required: ['x', 'y', 'z'],
          description: 'Placement coordinates in feet {x, y, z}'
        },
        rotation: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          description: 'Euler rotation angles in degrees {x, y, z}'
        },
        scale: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          description: 'Scale multiplier vector'
        },
        material: { type: 'string', description: 'PBR material finish ID' },
        color: { type: 'string', description: 'Hex tint color override' }
      },
      required: ['type', 'position']
    },
    execute: async (input: AddFurnitureInput) => {
      let insideRoomBounds = true;
      let boundsWarning: string | undefined = undefined;
      if (input.roomId) {
        const room = sceneStore.getData().rooms.find(r => r.id === input.roomId);
        if (room) {
          insideRoomBounds = isPointInRoom(input.position, room);
          if (!insideRoomBounds) {
            boundsWarning = `Object centroid (${input.position.x}, ${input.position.z}) falls outside room "${room.name}" polygon boundary (inside notch cutout area).`;
          }
        }
      }

      const item = sceneStore.addFurniture(input);
      sceneStore.highlightObject(item.id, 2500);
      uiStore.setSelected(item.id, 'furniture');
      uiStore.recordAgentAction('add_furniture', `Placed ${item.name} at (${item.position.x}, ${item.position.z}) ft`, item.id);
      return {
        success: true,
        objectId: item.id,
        name: item.name,
        type: item.type,
        category: item.category,
        roomId: item.roomId,
        position: item.position,
        rotation: item.rotation,
        dimensions: item.dimensions,
        insideRoomBounds,
        warning: boundsWarning
      };
    }
  },

  move_object: {
    name: 'move_object',
    title: 'Move Object',
    category: 'Objects' as const,
    description: 'Moves an existing furniture piece or accessory to a new {x, y, z} position in feet.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectId: { type: 'string', description: 'Stable ID of the object (e.g. obj-sofa-01)' },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          required: ['x', 'y', 'z'],
          description: 'Target coordinates in feet'
        }
      },
      required: ['objectId', 'position']
    },
    execute: async (input: MoveObjectInput) => {
      const ok = sceneStore.moveObject(input.objectId, input.position);
      if (!ok) throw new Error(`Could not move object "${input.objectId}". It may be locked or not found.`);
      sceneStore.highlightObject(input.objectId, 2000);
      uiStore.recordAgentAction('move_object', `Moved object to (${input.position.x}, ${input.position.z}) ft`, input.objectId);
      return { success: true, objectId: input.objectId, position: input.position };
    }
  },

  rotate_object: {
    name: 'rotate_object',
    title: 'Rotate Object',
    category: 'Objects' as const,
    description: 'Rotates an object in degrees around the {x, y, z} axes (primarily Y-axis yaw in architectural floor plans).',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectId: { type: 'string', description: 'Stable ID of the object' },
        rotation: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          required: ['x', 'y', 'z'],
          description: 'Rotation angles in degrees {x, y, z}'
        }
      },
      required: ['objectId', 'rotation']
    },
    execute: async (input: RotateObjectInput) => {
      const ok = sceneStore.rotateObject(input.objectId, input.rotation);
      if (!ok) throw new Error(`Could not rotate object "${input.objectId}".`);
      sceneStore.highlightObject(input.objectId, 1500);
      uiStore.recordAgentAction('rotate_object', `Rotated object (Y: ${input.rotation.y}°)`, input.objectId);
      return { success: true, objectId: input.objectId, rotation: input.rotation };
    }
  },

  scale_object: {
    name: 'scale_object',
    title: 'Scale Object',
    category: 'Objects' as const,
    description: 'Scales an object along its width (x), height (y), and depth (z) dimensions.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectId: { type: 'string', description: 'Stable ID of the object' },
        scale: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          required: ['x', 'y', 'z'],
          description: 'Scale multipliers vector {x, y, z}'
        }
      },
      required: ['objectId', 'scale']
    },
    execute: async (input: ScaleObjectInput) => {
      const ok = sceneStore.scaleObject(input.objectId, input.scale);
      if (!ok) throw new Error(`Could not scale object "${input.objectId}".`);
      sceneStore.highlightObject(input.objectId, 1500);
      uiStore.recordAgentAction('scale_object', `Scaled object [${input.scale.x}x, ${input.scale.y}x, ${input.scale.z}x]`, input.objectId);
      return { success: true, objectId: input.objectId, scale: input.scale };
    }
  },

  delete_object: {
    name: 'delete_object',
    title: 'Delete Object',
    category: 'Objects' as const,
    description: 'Removes a furniture or decor piece from the 3D scene.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectId: { type: 'string', description: 'Stable ID of the object to remove' }
      },
      required: ['objectId']
    },
    execute: async (input: DeleteObjectInput) => {
      const item = sceneStore.getData().furniture.find(f => f.id === input.objectId);
      const name = item?.name || input.objectId;
      const ok = sceneStore.deleteObject(input.objectId);
      if (!ok) throw new Error(`Object with ID "${input.objectId}" not found.`);
      uiStore.setSelected(null);
      uiStore.recordAgentAction('delete_object', `Deleted object "${name}"`, input.objectId);
      return { success: true, deletedObjectId: input.objectId, name };
    }
  },

  set_transform_lock: {
    name: 'set_transform_lock',
    title: 'Set Transform Lock',
    category: 'Objects' as const,
    description: 'Locks or unlocks a furniture piece or room to prevent accidental movement or edits.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        targetId: { type: 'string', description: 'ID of the room or furniture item' },
        locked: { type: 'boolean', description: 'True to lock transforms, false to unlock' }
      },
      required: ['targetId', 'locked']
    },
    execute: async (input: SetTransformLockInput) => {
      const ok = sceneStore.setTransformLock(input.targetId, input.locked);
      if (!ok) throw new Error(`Target with ID "${input.targetId}" not found.`);
      uiStore.recordAgentAction('set_transform_lock', `${input.locked ? 'Locked' : 'Unlocked'} ${input.targetId}`, input.targetId);
      return { success: true, targetId: input.targetId, locked: input.locked };
    }
  },

  set_furniture_dimensions: {
    name: 'set_furniture_dimensions',
    title: 'Set Furniture Dimensions',
    category: 'Objects' as const,
    description: 'Sets the exact physical dimensions (width, height, depth in feet) of a furniture object.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectId: { type: 'string', description: 'ID of the furniture object' },
        width: { type: 'number', description: 'Target width in feet' },
        height: { type: 'number', description: 'Target height in feet' },
        depth: { type: 'number', description: 'Target depth in feet' }
      },
      required: ['objectId']
    },
    execute: async (input: SetFurnitureDimensionsInput) => {
      const res = sceneStore.setObjectDimensions(input.objectId, {
        width: input.width,
        height: input.height,
        depth: input.depth
      });
      if (!res) throw new Error(`Could not set dimensions for object "${input.objectId}".`);
      sceneStore.highlightObject(input.objectId, 1500);
      uiStore.recordAgentAction(
        'set_furniture_dimensions',
        `Adjusted dimensions of ${input.objectId} to (${res.dimensions.x.toFixed(1)} x ${res.dimensions.y.toFixed(1)} x ${res.dimensions.z.toFixed(1)}) ft`,
        input.objectId
      );
      return {
        success: true,
        objectId: input.objectId,
        dimensions: res.dimensions,
        scale: res.scale
      };
    }
  },

  fit_furniture_to_wall: {
    name: 'fit_furniture_to_wall',
    title: 'Fit Furniture to Wall',
    category: 'Objects' as const,
    description: 'Resizes furniture (such as oversized wardrobes, beds, or credenzas) to fit adjacent to the floor plan layout wall with clean clearance.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectId: { type: 'string', description: 'ID of the furniture object to fit' },
        wallDirection: {
          type: 'string',
          enum: ['nearest', 'top', 'bottom', 'left', 'right'],
          description: 'Which room wall to fit and snap against (default "nearest")'
        },
        maxWidth: { type: 'number', description: 'Optional maximum width constraint in feet' },
        maxDepth: { type: 'number', description: 'Optional maximum depth constraint in feet' },
        margin: { type: 'number', description: 'Clearance margin from wall in feet (default 0.25)' },
        snapToWall: { type: 'boolean', description: 'Whether to snap position flush against the wall (default true)' }
      },
      required: ['objectId']
    },
    execute: async (input: FitFurnitureToWallInput) => {
      const res = sceneStore.fitFurnitureToWall(input.objectId, {
        wallDirection: input.wallDirection,
        maxWidth: input.maxWidth,
        maxDepth: input.maxDepth,
        margin: input.margin,
        snapToWall: input.snapToWall
      });
      if (!res) throw new Error(`Could not fit furniture "${input.objectId}" to wall.`);
      sceneStore.highlightObject(input.objectId, 2000);
      uiStore.recordAgentAction(
        'fit_furniture_to_wall',
        `Fitted "${res.name}" adjacent to ${res.wallDirection} wall in ${res.roomName} (${res.newDimensions.x.toFixed(1)}x${res.newDimensions.z.toFixed(1)}ft)`,
        input.objectId
      );
      return res;
    }
  },

  auto_fit_room_furniture: {
    name: 'auto_fit_room_furniture',
    title: 'Auto-Fit Room Furniture',
    category: 'Objects' as const,
    description: 'Automatically detects and resizes any oversized furniture in a room (e.g. wardrobes that exceed safe room clearance) to fit adjacent room walls.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: { type: 'string', description: 'ID of the room' },
        category: {
          type: 'string',
          enum: ['storage', 'bedroom', 'seating', 'tables', 'all'],
          description: 'Category of furniture to fit (default "all")'
        }
      },
      required: ['roomId']
    },
    execute: async (input: AutoFitRoomFurnitureInput) => {
      const results = sceneStore.autoFitRoomFurniture(input.roomId, input.category);
      uiStore.recordAgentAction(
        'auto_fit_room_furniture',
        `Auto-fitted ${results.length} furniture item(s) in room ${input.roomId}`,
        input.roomId
      );
      return {
        success: true,
        roomId: input.roomId,
        fittedCount: results.length,
        items: results
      };
    }
  }
};
