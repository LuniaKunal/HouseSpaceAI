import { sceneStore } from '../../state/sceneStore';
import { DoorOpening } from '../../types/scene';

const base = { category: 'Structure' as const, requiresConfirmation: false };
export const architectureTools = {
  list_space_boundaries: {
    ...base, name: 'list_space_boundaries', title: 'List Walls & Openings',
    description: 'Lists stable wall IDs, endpoints, length in feet, adjoining room IDs, and existing openings. Read before editing; room names do not imply walls should be removed.',
    inputSchema: { type: 'object' as const, properties: { roomId: { type: 'string' } }, additionalProperties: false },
    execute: async (input: { roomId?: string }) => ({ boundaries: sceneStore.listSpaceBoundaries(input.roomId),
      openConnections: sceneStore.getData().rooms.flatMap(r => (r.openConnections ?? []).map(o => ({ ...o, roomId: r.id }))),
      doors: sceneStore.getData().doors }),
  },
  set_space_boundary: {
    ...base, name: 'set_space_boundary', title: 'Set Wall or Open Connection',
    description: 'Creates or resizes a full-height wall-free span without moving rooms. Offset is feet from listed wall start. Defaults to whole wall. To restore a wall, supply kind=wall and the exact openingId. Preserves other openings and furniture. Undo supported.',
    inputSchema: { type: 'object' as const, properties: { wallId: { type: 'string' }, kind: { type: 'string', enum: ['open', 'wall'] },
      offset: { type: 'number', minimum: 0 }, width: { type: 'number', exclusiveMinimum: 0 }, openingId: { type: 'string' } }, required: ['wallId', 'kind'], additionalProperties: false },
    execute: async (input: Parameters<typeof sceneStore.setSpaceBoundary>[0]) => ({ ...sceneStore.setSpaceBoundary(input), validation: sceneStore.validateLayout() }),
  },
  update_door: {
    ...base, name: 'update_door', title: 'Edit Door',
    description: 'Moves/resizes a door along its wall, or changes hinge and swing. All lengths in feet from wall start. Uses the same validation as the human editor. Does not move furniture.',
    inputSchema: { type: 'object' as const, properties: { doorId: { type: 'string' }, offset: { type: 'number', minimum: 0 },
      width: { type: 'number', exclusiveMinimum: 0 }, height: { type: 'number', exclusiveMinimum: 0 },
      hinge: { type: 'string', enum: ['left', 'right'] }, swing: { type: 'string', enum: ['inward', 'outward'] } }, required: ['doorId'], additionalProperties: false },
    execute: async ({ doorId, ...changes }: { doorId: string; offset?: number; width?: number; height?: number; hinge?: DoorOpening['hinge']; swing?: DoorOpening['swing'] }) =>
      ({ success: true, door: sceneStore.updateDoor(doorId, changes), validation: sceneStore.validateLayout() }),
  },
  remove_opening: {
    ...base, name: 'remove_opening', title: 'Remove Opening',
    description: 'Removes exactly one door/open connection and restores its wall span. Preserves furniture; validation reports any new wall collision. Undo supported.',
    inputSchema: { type: 'object' as const, properties: { openingId: { type: 'string' } }, required: ['openingId'], additionalProperties: false },
    execute: async (input: { openingId: string }) => ({ ...sceneStore.removeOpening(input.openingId), validation: sceneStore.validateLayout() }),
  },
  validate_layout: {
    ...base, name: 'validate_layout', title: 'Check Walls & Furniture',
    description: 'Read-only check for physical wall collisions, furniture overlaps, opening dimensions, and conservative door swing / 2.5-foot approach clearance. Not a building-code certification.',
    inputSchema: { type: 'object' as const, properties: {}, additionalProperties: false },
    execute: async () => sceneStore.validateLayout(),
  },
};
