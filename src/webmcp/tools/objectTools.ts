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
  AutoFitRoomFurnitureInput,
  AutofitHumanCirculationInput,
  AutofitRoomForHumansInput,
  GetFurnitureCatalogInput
} from '../../types/webmcp';
import { isPointInRoom } from '../../geometry/roomGeometry';
import { CATALOG_ITEMS } from '../../data/catalogData';

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
          enum: [
            // Seating
            'sofa_4seater',
            'sofa_3seater_lounger',
            'armchair_accent',
            'sofa_sectional',
            // Tables
            'dining_table_6s',
            'coffee_table_center',
            'table_drinks_round',
            'nightstand_modern',
            // Bedroom
            'bed_double',
            'bed_guest_double',
            // Storage & Media
            'wardrobe_sliding',
            'consol_low_ht',
            'study_table_desk',
            'storage_low_ht',
            'shoe_unit_foyer',
            'dumb_waiter_counter',
            'tv_unit_grand',
            'tv_console_bedroom',
            'store_pantry_rack',
            // Kitchen & Appliances
            'kitchen_counter_hob',
            'kitchen_counter_sink',
            'refrigerator_french_door',
            'utility_washing_machine',
            'utility_counter_sink',
            // Spiritual
            'pooja_mandir_sanctuary',
            // Bathroom
            'bathroom_wc_commode',
            'bathroom_vanity_basin',
            'bathroom_shower_cubicle',
            // Greenery & Outdoor
            'planter_garden_strip',
            'planter_balcony_pots',
            // Lighting
            'chandelier_modern',
            'lamp_floor',
            // Supported Aliases & Common Shorthands
            'bed_king',
            'bed_queen',
            'armchair_lounge',
            'table_dining',
            'table_coffee',
            'kitchen_counter',
            'bathroom_vanity',
            'outdoor_table'
          ],
          description: 'Catalog furniture identifier. Choose from the 32 architectural catalog items or standard aliases.'
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
    description: 'Rotates an object (furniture item, window opening, or door) in degrees around the {x, y, z} axes (primarily Y-axis yaw in architectural floor plans).',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        objectId: { type: 'string', description: 'Stable ID of the object, window, or opening' },
        rotation: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          required: ['y'],
          description: 'Rotation angles in degrees {x, y, z} (yaw on Y is standard for architectural plans)'
        }
      },
      required: ['objectId', 'rotation']
    },
    execute: async (input: RotateObjectInput) => {
      const rot = {
        x: input.rotation?.x || 0,
        y: input.rotation?.y || 0,
        z: input.rotation?.z || 0
      };
      const ok = sceneStore.rotateObject(input.objectId, rot);
      if (!ok) throw new Error(`Could not rotate object "${input.objectId}". Object ID not found.`);
      sceneStore.highlightObject(input.objectId, 1500);
      uiStore.recordAgentAction('rotate_object', `Rotated object (Y: ${rot.y}°)`, input.objectId);
      return { success: true, objectId: input.objectId, rotation: rot };
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
  },

  autofit_human_circulation: {
    name: 'autofit_human_circulation',
    title: 'Auto-Fit Human Circulation',
    category: 'Objects' as const,
    description: 'Evaluates and auto-adjusts furniture arrangements for human ergonomics, anthropometric comfort, and unobstructed circulation corridors (doorway clearances, bed approach paths, dining perimeter, and minimum 3ft walkways).',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: {
          type: 'string',
          description: 'Optional room ID filter. If omitted, optimizes circulation for all rooms across the whole residence.'
        },
        minWalkwayWidth: {
          type: 'number',
          description: 'Minimum walkway width in feet (default 3.0)'
        },
        doorwayClearance: {
          type: 'number',
          description: 'Clearance in front of doors and gates in feet (default 3.0)'
        },
        bedSideClearance: {
          type: 'number',
          description: 'Clearance on accessible bed sides in feet (default 2.5)'
        },
        resolveOverlaps: {
          type: 'boolean',
          description: 'Whether to shift overlapping furniture items (default true)'
        },
        alignToWalls: {
          type: 'boolean',
          description: 'Whether to snap wardrobes, storage, and beds to adjacent walls (default true)'
        }
      }
    },
    execute: async (input: AutofitHumanCirculationInput = {}) => {
      const res = sceneStore.autofitHumanCirculation(input);
      uiStore.recordAgentAction(
        'autofit_human_circulation',
        `Auto-fitted human circulation: ${res.itemsAdjusted.length} items adjusted across ${res.roomsProcessed} room(s). Human Ergonomics Score: ${res.humanErgonomicsScore}%`,
        input.roomId
      );
      return res;
    }
  },

  autofit_room_for_humans: {
    name: 'autofit_room_for_humans',
    title: 'Auto-Fit Room for Humans',
    category: 'Objects' as const,
    description: 'Comprehensive one-shot human spatial solver for a designated room: fits wardrobes to walls, ensures 3ft doorway swing clearances, and resolves human circulation.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        roomId: {
          type: 'string',
          description: 'ID of the room to optimize for human occupants'
        },
        optimizeCirculation: {
          type: 'boolean',
          description: 'Whether to resolve human walkway and doorway clearances (default true)'
        },
        fitWardrobes: {
          type: 'boolean',
          description: 'Whether to resize oversized storage and snap to wall (default true)'
        },
        ensureDoorClearance: {
          type: 'boolean',
          description: 'Whether to unblock entry door swing corridors (default true)'
        }
      },
      required: ['roomId']
    },
    execute: async (input: AutofitRoomForHumansInput) => {
      const res = sceneStore.autofitRoomForHumans(input.roomId, {
        optimizeCirculation: input.optimizeCirculation,
        fitWardrobes: input.fitWardrobes,
        ensureDoorClearance: input.ensureDoorClearance
      });
      if (!res.success) {
        throw new Error(res.summary);
      }
      uiStore.recordAgentAction(
        'autofit_room_for_humans',
        res.summary,
        input.roomId
      );
      return res;
    }
  },

  get_furniture_catalog: {
    name: 'get_furniture_catalog',
    title: 'Get Furniture Catalog',
    category: 'Objects' as const,
    description: 'Returns the full catalog of 32 architectural furniture items, fixtures, appliances, lighting, and decor pieces with types, default dimensions in feet, materials, and categories.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'seating', 'bedroom', 'tables', 'kitchen', 'storage', 'office', 'bathroom', 'lighting', 'outdoor', 'decor', 'spiritual'],
          description: 'Optional category filter matching the human designer catalog'
        },
        searchQuery: {
          type: 'string',
          description: 'Optional search keyword to filter by name, description, or tags'
        }
      }
    },
    execute: async (input: GetFurnitureCatalogInput = {}) => {
      let items = [...CATALOG_ITEMS];
      if (input.category && input.category !== 'all') {
        items = items.filter(i => i.category === input.category);
      }
      if (input.searchQuery?.trim()) {
        const q = input.searchQuery.toLowerCase();
        items = items.filter(i =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some(t => t.toLowerCase().includes(q))
        );
      }
      return {
        success: true,
        totalCount: items.length,
        items: items.map(i => ({
          type: i.type,
          name: i.name,
          category: i.category,
          description: i.description,
          defaultDimensions: i.defaultDimensions,
          defaultMaterial: i.defaultMaterial,
          defaultColor: i.defaultColor,
          tags: i.tags
        }))
      };
    }
  }
};

