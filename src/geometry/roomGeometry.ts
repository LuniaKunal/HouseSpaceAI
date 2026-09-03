import { Room, CornerNotch, Vector2D } from '../types/scene';

export interface RoomEdge {
  id: string;
  start: Vector2D;
  end: Vector2D;
  direction: 'north' | 'south' | 'east' | 'west';
  length: number;
}

export interface SharedWallOverlap {
  direction: 'above' | 'right' | 'below' | 'left';
  start: Vector2D;
  end: Vector2D;
  midpoint: Vector2D;
  sharedLength: number;
}

/**
 * Generates an ordered list of polygon vertices (in room-local coordinates centered at 0,0)
 * for a rectangular room or an L-shaped room with a corner notch.
 */
export function createNotchFootprint(
  width: number,
  depth: number,
  notch?: CornerNotch
): Vector2D[] {
  const halfW = width / 2;
  const halfD = depth / 2;

  // Standard 4-corner rectangle (Special case)
  if (!notch || notch.width <= 0 || notch.depth <= 0) {
    return [
      { x: -halfW, z: -halfD }, // Top-Left
      { x: halfW, z: -halfD },  // Top-Right
      { x: halfW, z: halfD },   // Bottom-Right
      { x: -halfW, z: halfD }   // Bottom-Left
    ];
  }

  const nw = Math.min(notch.width, width - 0.5);
  const nd = Math.min(notch.depth, depth - 0.5);

  switch (notch.corner) {
    case 'top-right':
      // Cutout in quadrant [+X, -Z]
      return [
        { x: -halfW, z: -halfD },         // Top-Left
        { x: halfW - nw, z: -halfD },     // Top Wall before notch
        { x: halfW - nw, z: -halfD + nd },// Concave inside corner
        { x: halfW, z: -halfD + nd },     // Right Wall below notch
        { x: halfW, z: halfD },           // Bottom-Right
        { x: -halfW, z: halfD }           // Bottom-Left
      ];

    case 'top-left':
      // Cutout in quadrant [-X, -Z]
      return [
        { x: -halfW + nw, z: -halfD },    // Top Wall after notch
        { x: halfW, z: -halfD },          // Top-Right
        { x: halfW, z: halfD },           // Bottom-Right
        { x: -halfW, z: halfD },          // Bottom-Left
        { x: -halfW, z: -halfD + nd },    // Left Wall below notch
        { x: -halfW + nw, z: -halfD + nd }// Concave inside corner
      ];

    case 'bottom-right':
      // Cutout in quadrant [+X, +Z] (e.g. Master Bedroom with attached Toilet)
      return [
        { x: -halfW, z: -halfD },         // Top-Left
        { x: halfW, z: -halfD },          // Top-Right
        { x: halfW, z: halfD - nd },      // Right Wall above notch
        { x: halfW - nw, z: halfD - nd }, // Concave inside corner
        { x: halfW - nw, z: halfD },      // Bottom Wall left of notch
        { x: -halfW, z: halfD }           // Bottom-Left
      ];

    case 'bottom-left':
      // Cutout in quadrant [-X, +Z]
      return [
        { x: -halfW, z: -halfD },         // Top-Left
        { x: halfW, z: -halfD },          // Top-Right
        { x: halfW, z: halfD },           // Bottom-Right
        { x: -halfW + nw, z: halfD },     // Bottom Wall right of notch
        { x: -halfW + nw, z: halfD - nd },// Concave inside corner
        { x: -halfW, z: halfD - nd }      // Left Wall above notch
      ];

    default:
      return [
        { x: -halfW, z: -halfD },
        { x: halfW, z: -halfD },
        { x: halfW, z: halfD },
        { x: -halfW, z: halfD }
      ];
  }
}

/**
 * Returns the room-local polygon footprint for any room.
 */
export function getRoomFootprint(room: Room): Vector2D[] {
  if (room.footprint && room.footprint.length >= 4) {
    return room.footprint;
  }
  return createNotchFootprint(room.width, room.depth, room.notch);
}

/**
 * Returns the world-space polygon vertices for any room (local footprint translated by room.position).
 */
export function getRoomWorldPolygon(room: Room): Vector2D[] {
  const local = getRoomFootprint(room);
  return local.map(pt => ({
    x: Number((pt.x + room.position.x).toFixed(2)),
    z: Number((pt.z + room.position.z).toFixed(2))
  }));
}

/**
 * Calculates the exact floor surface area in square feet.
 * Subtracts the notch area from bounding box if present.
 */
export function getRoomAreaSqFt(room: Room): number {
  if (room.notch && room.notch.width > 0 && room.notch.depth > 0) {
    return Number((room.width * room.depth - room.notch.width * room.notch.depth).toFixed(2));
  }
  const pts = getRoomFootprint(room);
  if (pts.length === 4) {
    return Number((room.width * room.depth).toFixed(2));
  }
  // Standard Shoelace algorithm for general polygons
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].z - pts[j].x * pts[i].z;
  }
  return Number((Math.abs(area) / 2).toFixed(2));
}

/**
 * Decomposes a room's world-space footprint into ordered boundary wall edges.
 */
export function getRoomEdges(room: Room): RoomEdge[] {
  const poly = getRoomWorldPolygon(room);
  const n = poly.length;
  const edges: RoomEdge[] = [];

  for (let i = 0; i < n; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % n];
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const len = Math.hypot(dx, dz);

    let direction: 'north' | 'south' | 'east' | 'west' = 'north';
    if (Math.abs(dz) < 0.05) {
      // Horizontal wall: facing north (-Z) or south (+Z)
      // Clockwise polygon: top edge moves +X (facing north), bottom moves -X (facing south)
      direction = dx > 0 ? 'north' : 'south';
    } else {
      // Vertical wall: facing east (+X) or west (-X)
      // Clockwise polygon: right edge moves +Z (facing east), left moves -Z (facing west)
      direction = dz > 0 ? 'east' : 'west';
    }

    edges.push({
      id: `edge-${room.id}-${i}`,
      start: p1,
      end: p2,
      direction,
      length: Number(len.toFixed(2))
    });
  }

  return edges;
}

/**
 * Ray-casting point-in-polygon algorithm.
 * Returns true if {x, z} is strictly inside the room's boundary.
 * Points falling into the cutout notch return false.
 */
export function isPointInRoom(point: { x: number; z: number }, room: Room): boolean {
  const poly = getRoomWorldPolygon(room);
  let inside = false;
  const px = point.x;
  const pz = point.z;

  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, zi = poly[i].z;
    const xj = poly[j].x, zj = poly[j].z;

    const intersect =
      zi > pz !== zj > pz &&
      px < ((xj - xi) * (pz - zi)) / (zj - zi + Number.EPSILON) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Finds shared overlapping wall segment between two adjacent rooms.
 * Handles standard rectangular rooms as well as 6-edge L-shaped rooms.
 */
export function findSharedWallOverlap(
  roomA: Room,
  roomB: Room,
  preferredDirection?: 'above' | 'right' | 'below' | 'left'
): SharedWallOverlap | null {
  const edgesA = getRoomEdges(roomA);
  const edgesB = getRoomEdges(roomB);

  let bestOverlap: SharedWallOverlap | null = null;
  let maxSharedLen = 0;

  for (const eA of edgesA) {
    for (const eB of edgesB) {
      // Check if edges are parallel and opposite-facing
      const isHorizontal = Math.abs(eA.start.z - eA.end.z) < 0.05 && Math.abs(eB.start.z - eB.end.z) < 0.05;
      const isVertical = Math.abs(eA.start.x - eA.end.x) < 0.05 && Math.abs(eB.start.x - eB.end.x) < 0.05;

      if (isHorizontal) {
        // Must be on the same Z plane (within 0.6ft tolerance to cover 0.5ft wall thickness)
        if (Math.abs(eA.start.z - eB.start.z) < 0.6) {
          const minXA = Math.min(eA.start.x, eA.end.x);
          const maxXA = Math.max(eA.start.x, eA.end.x);
          const minXB = Math.min(eB.start.x, eB.end.x);
          const maxXB = Math.max(eB.start.x, eB.end.x);

          const startX = Math.max(minXA, minXB);
          const endX = Math.min(maxXA, maxXB);
          const sharedLen = endX - startX;

          if (sharedLen > 0.5 && sharedLen > maxSharedLen) {
            maxSharedLen = sharedLen;
            const zPlane = (eA.start.z + eB.start.z) / 2;
            const dir: 'above' | 'below' = roomB.position.z < roomA.position.z ? 'above' : 'below';

            bestOverlap = {
              direction: preferredDirection && (preferredDirection === 'above' || preferredDirection === 'below') ? preferredDirection : dir,
              start: { x: startX, z: zPlane },
              end: { x: endX, z: zPlane },
              midpoint: { x: (startX + endX) / 2, z: zPlane },
              sharedLength: Number(sharedLen.toFixed(2))
            };
          }
        }
      } else if (isVertical) {
        // Must be on the same X plane (within 0.6ft tolerance to cover 0.5ft wall thickness)
        if (Math.abs(eA.start.x - eB.start.x) < 0.6) {
          const minZA = Math.min(eA.start.z, eA.end.z);
          const maxZA = Math.max(eA.start.z, eA.end.z);
          const minZB = Math.min(eB.start.z, eB.end.z);
          const maxZB = Math.max(eB.start.z, eB.end.z);

          const startZ = Math.max(minZA, minZB);
          const endZ = Math.min(maxZA, maxZB);
          const sharedLen = endZ - startZ;

          if (sharedLen > 0.5 && sharedLen > maxSharedLen) {
            maxSharedLen = sharedLen;
            const xPlane = (eA.start.x + eB.start.x) / 2;
            const dir: 'right' | 'left' = roomB.position.x > roomA.position.x ? 'right' : 'left';

            bestOverlap = {
              direction: preferredDirection && (preferredDirection === 'right' || preferredDirection === 'left') ? preferredDirection : dir,
              start: { x: xPlane, z: startZ },
              end: { x: xPlane, z: endZ },
              midpoint: { x: xPlane, z: (startZ + endZ) / 2 },
              sharedLength: Number(sharedLen.toFixed(2))
            };
          }
        }
      }
    }
  }

  return bestOverlap;
}
