import * as THREE from 'three';
import { Room, ConnectionGate, DoorOpening, WindowOpening, FT_TO_M } from '../types/scene';
import { getRoomEdges } from '../geometry/roomGeometry';

/**
 * Creates high-fidelity floor materials with accurate color, roughness, and subtle normal mapping.
 */
export function getFloorMaterial(materialType: string): THREE.Material {
  switch (materialType) {
    case 'hardwood_oak':
      return new THREE.MeshStandardMaterial({
        color: 0xc89d6c,
        roughness: 0.35,
        metalness: 0.05
      });
    case 'hardwood_walnut':
      return new THREE.MeshStandardMaterial({
        color: 0x5a3825,
        roughness: 0.3,
        metalness: 0.08
      });
    case 'herringbone_wood':
      return new THREE.MeshStandardMaterial({
        color: 0xb5885c,
        roughness: 0.28,
        metalness: 0.05
      });
    case 'marble_carrara':
      return new THREE.MeshStandardMaterial({
        color: 0xf3f4f6,
        roughness: 0.12,
        metalness: 0.15
      });
    case 'marble_nero':
      return new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.1,
        metalness: 0.2
      });
    case 'terrazzo':
      return new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        roughness: 0.45,
        metalness: 0.05
      });
    case 'concrete_polished':
      return new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        roughness: 0.5,
        metalness: 0.02
      });
    case 'carpet_plush':
      return new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.9,
        metalness: 0.0
      });
    case 'ceramic_tile':
    default:
      return new THREE.MeshStandardMaterial({
        color: 0xe5e7eb,
        roughness: 0.4,
        metalness: 0.05
      });
  }
}

interface Interval {
  start: number;
  end: number;
}

/**
 * Subtracts a list of exclusion intervals (e.g. doors, gates, shared neighbor partitions) from an initial interval.
 */
function subtractIntervals(base: Interval, cuts: Interval[]): Interval[] {
  let result: Interval[] = [{ start: Math.min(base.start, base.end), end: Math.max(base.start, base.end) }];

  for (const cut of cuts) {
    const cutStart = Math.min(cut.start, cut.end);
    const cutEnd = Math.max(cut.start, cut.end);
    const nextResult: Interval[] = [];

    for (const seg of result) {
      if (cutEnd <= seg.start || cutStart >= seg.end) {
        nextResult.push(seg);
      } else {
        if (seg.start < cutStart) {
          nextResult.push({ start: seg.start, end: cutStart });
        }
        if (seg.end > cutEnd) {
          nextResult.push({ start: cutEnd, end: seg.end });
        }
      }
    }
    result = nextResult;
  }

  return result.filter(seg => seg.end - seg.start > 0.15);
}

// Material cache for optimal performance
const wallMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

function getWallMaterialByHex(hexStr?: string): THREE.MeshStandardMaterial {
  const hexClean = hexStr ? hexStr.toLowerCase() : '#f1f5f9';
  if (wallMaterialCache.has(hexClean)) {
    return wallMaterialCache.get(hexClean)!;
  }
  const hexNum = parseInt(hexClean.replace('#', '0x'), 16) || 0xf1f5f9;
  const mat = new THREE.MeshStandardMaterial({
    color: hexNum,
    roughness: 0.65,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  wallMaterialCache.set(hexClean, mat);
  return mat;
}

/**
 * Finds a South neighbor room touching a specific X interval at coordinate Z.
 */
function findSouthNeighbor(seg: Interval, z: number, otherRooms: Room[]): Room | undefined {
  return otherRooms.find(r => {
    const rMinZ = r.position.z - r.depth / 2;
    if (Math.abs(rMinZ - z) < 0.35) {
      const rMinX = r.position.x - r.width / 2;
      const rMaxX = r.position.x + r.width / 2;
      const overlapStart = Math.max(seg.start, rMinX);
      const overlapEnd = Math.min(seg.end, rMaxX);
      return overlapEnd - overlapStart > 0.2;
    }
    return false;
  });
}

/**
 * Finds an East neighbor room touching a specific Z interval at coordinate X.
 */
function findEastNeighbor(seg: Interval, x: number, otherRooms: Room[]): Room | undefined {
  return otherRooms.find(r => {
    const rMinX = r.position.x - r.width / 2;
    if (Math.abs(rMinX - x) < 0.35) {
      const rMinZ = r.position.z - r.depth / 2;
      const rMaxZ = r.position.z + r.depth / 2;
      const overlapStart = Math.max(seg.start, rMinZ);
      const overlapEnd = Math.min(seg.end, rMaxZ);
      return overlapEnd - overlapStart > 0.2;
    }
    return false;
  });
}

/**
 * Generates wall meshes for non-rectangular L-shaped rooms.
 * Extrudes wall segments along each edge of the 6-vertex polygon,
 * subtracting shared neighbor intervals and door/gate openings.
 */
function createLShapedRoomWallsGroup(
  room: Room,
  gates: ConnectionGate[],
  doors: DoorOpening[],
  windows: WindowOpening[],
  fullHeight: boolean = false,
  allRooms: Room[] = []
): THREE.Group {
  const wallGroup = new THREE.Group();
  wallGroup.name = `RoomWalls_${room.id}`;

  const hM = (fullHeight ? room.height : Math.min(3.6, room.height * 0.4)) * FT_TO_M;
  const tM = (room.wallThickness || 0.45) * FT_TO_M;
  const tFt = room.wallThickness || 0.45;

  const roomMat = getWallMaterialByHex(room.wallColor);
  const capMat = getWallMaterialByHex(room.wallColor);

  const edges = getRoomEdges(room);
  const otherRooms = allRooms.filter(r => r.id !== room.id);
  const roomGates = gates.filter(g => g.roomIdA === room.id || g.roomIdB === room.id);
  const roomDoors = doors.filter(d => d.roomId === room.id);

  for (const edge of edges) {
    const isHorizontal = edge.direction === 'north' || edge.direction === 'south';

    if (isHorizontal) {
      const zPlane = (edge.start.z + edge.end.z) / 2;
      const minX = Math.min(edge.start.x, edge.end.x);
      const maxX = Math.max(edge.start.x, edge.end.x);

      const cuts: Interval[] = [];
      for (const g of roomGates) {
        if (Math.abs(g.position.z - zPlane) < 0.35 && g.position.x >= minX - 0.5 && g.position.x <= maxX + 0.5) {
          cuts.push({ start: g.position.x - g.width / 2, end: g.position.x + g.width / 2 });
        }
      }
      for (const d of roomDoors) {
        if (Math.abs(d.position.z - zPlane) < 0.35 && d.position.x >= minX - 0.5 && d.position.x <= maxX + 0.5) {
          cuts.push({ start: d.position.x - d.width / 2, end: d.position.x + d.width / 2 });
        }
      }

      if (edge.direction === 'north') {
        for (const n of otherRooms) {
          const nEdges = getRoomEdges(n);
          for (const ne of nEdges) {
            if (ne.direction === 'south' && Math.abs((ne.start.z + ne.end.z) / 2 - zPlane) < 0.25) {
              const nMinX = Math.min(ne.start.x, ne.end.x);
              const nMaxX = Math.max(ne.start.x, ne.end.x);
              const oStart = Math.max(minX, nMinX);
              const oEnd = Math.min(maxX, nMaxX);
              if (oEnd - oStart > 0.1) {
                cuts.push({ start: oStart, end: oEnd });
              }
            }
          }
        }

        const segments = subtractIntervals({ start: minX, end: maxX }, cuts);
        for (const seg of segments) {
          const segLenM = (seg.end - seg.start) * FT_TO_M;
          if (segLenM < 0.05) continue;
          const segCenterXM = ((seg.start + seg.end) / 2 - room.position.x) * FT_TO_M;
          const segCenterZM = (zPlane - room.position.z) * FT_TO_M;

          const materials = [roomMat, roomMat, capMat, capMat, roomMat, roomMat];
          const wall = new THREE.Mesh(new THREE.BoxGeometry(segLenM, hM, tM), materials);
          wall.position.set(segCenterXM, hM / 2, segCenterZM);
          wall.castShadow = true;
          wall.receiveShadow = true;
          wallGroup.add(wall);
        }
      } else {
        const segments = subtractIntervals({ start: minX, end: maxX }, cuts);
        for (const seg of segments) {
          const segLenM = (seg.end - seg.start) * FT_TO_M;
          if (segLenM < 0.05) continue;
          const segCenterXM = ((seg.start + seg.end) / 2 - room.position.x) * FT_TO_M;
          const segCenterZM = (zPlane - room.position.z) * FT_TO_M;

          const southNeighbor = findSouthNeighbor(seg, zPlane, otherRooms);
          const southMat = southNeighbor ? getWallMaterialByHex(southNeighbor.wallColor) : roomMat;

          const materials = [
            roomMat,
            roomMat,
            capMat,
            capMat,
            southMat,
            roomMat
          ];
          const wall = new THREE.Mesh(new THREE.BoxGeometry(segLenM, hM, tM), materials);
          wall.position.set(segCenterXM, hM / 2, segCenterZM);
          wall.castShadow = true;
          wall.receiveShadow = true;
          wallGroup.add(wall);
        }
      }
    } else {
      const xPlane = (edge.start.x + edge.end.x) / 2;
      const minZ = Math.min(edge.start.z, edge.end.z);
      const maxZ = Math.max(edge.start.z, edge.end.z);

      const cuts: Interval[] = [];
      for (const g of roomGates) {
        if (Math.abs(g.position.x - xPlane) < 0.35 && g.position.z >= minZ - 0.5 && g.position.z <= maxZ + 0.5) {
          cuts.push({ start: g.position.z - g.width / 2, end: g.position.z + g.width / 2 });
        }
      }
      for (const d of roomDoors) {
        if (Math.abs(d.position.x - xPlane) < 0.35 && d.position.z >= minZ - 0.5 && d.position.z <= maxZ + 0.5) {
          cuts.push({ start: d.position.z - d.width / 2, end: d.position.z + d.width / 2 });
        }
      }

      const baseStart = minZ + tFt / 2;
      const baseEnd = maxZ - tFt / 2;
      if (baseEnd <= baseStart) continue;

      if (edge.direction === 'west') {
        for (const w of otherRooms) {
          const wEdges = getRoomEdges(w);
          for (const we of wEdges) {
            if (we.direction === 'east' && Math.abs((we.start.x + we.end.x) / 2 - xPlane) < 0.25) {
              const wMinZ = Math.min(we.start.z, we.end.z);
              const wMaxZ = Math.max(we.start.z, we.end.z);
              const oStart = Math.max(minZ, wMinZ);
              const oEnd = Math.min(maxZ, wMaxZ);
              if (oEnd - oStart > 0.1) {
                cuts.push({ start: oStart, end: oEnd });
              }
            }
          }
        }

        const segments = subtractIntervals({ start: baseStart, end: baseEnd }, cuts);
        for (const seg of segments) {
          const segLenM = (seg.end - seg.start) * FT_TO_M;
          if (segLenM < 0.05) continue;
          const segCenterXM = (xPlane - room.position.x) * FT_TO_M;
          const segCenterZM = ((seg.start + seg.end) / 2 - room.position.z) * FT_TO_M;

          const materials = [roomMat, roomMat, capMat, capMat, roomMat, roomMat];
          const wall = new THREE.Mesh(new THREE.BoxGeometry(tM, hM, segLenM), materials);
          wall.position.set(segCenterXM, hM / 2, segCenterZM);
          wall.castShadow = true;
          wall.receiveShadow = true;
          wallGroup.add(wall);
        }
      } else {
        const segments = subtractIntervals({ start: baseStart, end: baseEnd }, cuts);
        for (const seg of segments) {
          const segLenM = (seg.end - seg.start) * FT_TO_M;
          if (segLenM < 0.05) continue;
          const segCenterXM = (xPlane - room.position.x) * FT_TO_M;
          const segCenterZM = ((seg.start + seg.end) / 2 - room.position.z) * FT_TO_M;

          const eastNeighbor = findEastNeighbor(seg, xPlane, otherRooms);
          const eastMat = eastNeighbor ? getWallMaterialByHex(eastNeighbor.wallColor) : roomMat;

          const materials = [
            eastMat,
            roomMat,
            capMat,
            capMat,
            roomMat,
            roomMat
          ];
          const wall = new THREE.Mesh(new THREE.BoxGeometry(tM, hM, segLenM), materials);
          wall.position.set(segCenterXM, hM / 2, segCenterZM);
          wall.castShadow = true;
          wall.receiveShadow = true;
          wallGroup.add(wall);
        }
      }
    }
  }

  return wallGroup;
}

/**
 * Builds 3D wall segments with ZERO overlapping walls, ZERO corner interpenetrations,
 * and INDEPENDENT DUAL-SIDED WALL PAINTING for shared partition walls between connected rooms.
 */
export function createRoomWallsGroup(
  room: Room,
  gates: ConnectionGate[],
  doors: DoorOpening[],
  windows: WindowOpening[],
  fullHeight: boolean = false,
  allRooms: Room[] = []
): THREE.Group {
  if (room.notch || (room.footprint && room.footprint.length > 4)) {
    return createLShapedRoomWallsGroup(room, gates, doors, windows, fullHeight, allRooms);
  }

  const wallGroup = new THREE.Group();
  wallGroup.name = `RoomWalls_${room.id}`;

  const hM = (fullHeight ? room.height : Math.min(3.6, room.height * 0.4)) * FT_TO_M;
  const tM = (room.wallThickness || 0.45) * FT_TO_M;
  const tFt = room.wallThickness || 0.45;

  const roomMat = getWallMaterialByHex(room.wallColor);
  const capMat = getWallMaterialByHex(room.wallColor);

  // Room bounding box in scene feet
  const rMinX = room.position.x - room.width / 2;
  const rMaxX = room.position.x + room.width / 2;
  const rMinZ = room.position.z - room.depth / 2;
  const rMaxZ = room.position.z + room.depth / 2;

  // Other rooms in scene
  const otherRooms = allRooms.filter(r => r.id !== room.id);

  // Gates and Doors connected to this room
  const roomGates = gates.filter(g => g.roomIdA === room.id || g.roomIdB === room.id);
  const roomDoors = doors.filter(d => d.roomId === room.id);

  // -------------------------------------------------------------
  // 1. NORTH WALL (Z = rMinZ)
  // If a North neighbor exists, the North neighbor is responsible for that shared partition.
  // This room only builds exterior segments.
  // -------------------------------------------------------------
  const northNeighborCuts: Interval[] = [];
  for (const n of otherRooms) {
    const nMaxZ = n.position.z + n.depth / 2;
    if (Math.abs(nMaxZ - rMinZ) < 0.25) {
      const nMinX = n.position.x - n.width / 2;
      const nMaxX = n.position.x + n.width / 2;
      const overlapStart = Math.max(rMinX, nMinX);
      const overlapEnd = Math.min(rMaxX, nMaxX);
      if (overlapEnd - overlapStart > 0.1) {
        northNeighborCuts.push({ start: overlapStart, end: overlapEnd });
      }
    }
  }

  // Also cut gates/doors on North edge
  for (const g of roomGates) {
    if (Math.abs(g.position.z - rMinZ) < 0.35) {
      northNeighborCuts.push({ start: g.position.x - g.width / 2, end: g.position.x + g.width / 2 });
    }
  }
  for (const d of roomDoors) {
    if (Math.abs(d.position.z - rMinZ) < 0.35) {
      northNeighborCuts.push({ start: d.position.x - d.width / 2, end: d.position.x + d.width / 2 });
    }
  }

  const northSegments = subtractIntervals({ start: rMinX, end: rMaxX }, northNeighborCuts);
  for (const seg of northSegments) {
    const segLenM = (seg.end - seg.start) * FT_TO_M;
    const segCenterXM = ((seg.start + seg.end) / 2 - room.position.x) * FT_TO_M;
    const segCenterZM = (rMinZ - room.position.z) * FT_TO_M;

    // 6-Face Materials for North Exterior Wall
    const materials = [roomMat, roomMat, capMat, capMat, roomMat, roomMat];
    const wall = new THREE.Mesh(new THREE.BoxGeometry(segLenM, hM, tM), materials);
    wall.position.set(segCenterXM, hM / 2, segCenterZM);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wallGroup.add(wall);
  }

  // -------------------------------------------------------------
  // 2. SOUTH WALL (Z = rMaxZ)
  // This room (the North room) is responsible for building this partition wall!
  // Uses DUAL-SIDED PAINTING:
  // - North face (-Z, index 5) = this room's wallColor (faces into this room)
  // - South face (+Z, index 4) = South neighbor's wallColor (faces into South room)
  // -------------------------------------------------------------
  const southCuts: Interval[] = [];
  for (const g of roomGates) {
    if (Math.abs(g.position.z - rMaxZ) < 0.35) {
      southCuts.push({ start: g.position.x - g.width / 2, end: g.position.x + g.width / 2 });
    }
  }
  for (const d of roomDoors) {
    if (Math.abs(d.position.z - rMaxZ) < 0.35) {
      southCuts.push({ start: d.position.x - d.width / 2, end: d.position.x + d.width / 2 });
    }
  }

  const southSegments = subtractIntervals({ start: rMinX, end: rMaxX }, southCuts);
  for (const seg of southSegments) {
    const segLenM = (seg.end - seg.start) * FT_TO_M;
    const segCenterXM = ((seg.start + seg.end) / 2 - room.position.x) * FT_TO_M;
    const segCenterZM = (rMaxZ - room.position.z) * FT_TO_M;

    // Check if there is a South neighbor connected along this segment
    const southNeighbor = findSouthNeighbor(seg, rMaxZ, otherRooms);
    const southMat = southNeighbor ? getWallMaterialByHex(southNeighbor.wallColor) : roomMat;

    // BoxGeometry Face Mapping:
    // 0: +X, 1: -X, 2: +Y (Top), 3: -Y, 4: +Z (South Face), 5: -Z (North Face)
    const materials = [
      roomMat,   // +X
      roomMat,   // -X
      capMat,    // +Y (Top)
      capMat,    // -Y
      southMat,  // +Z (South face: painted with South room's color!)
      roomMat    // -Z (North face: painted with this room's color!)
    ];

    const wall = new THREE.Mesh(new THREE.BoxGeometry(segLenM, hM, tM), materials);
    wall.position.set(segCenterXM, hM / 2, segCenterZM);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wallGroup.add(wall);
  }

  // -------------------------------------------------------------
  // 3. WEST WALL (X = rMinX)
  // If a West neighbor exists, the West neighbor is responsible for that partition.
  // This room only builds exterior segments.
  // -------------------------------------------------------------
  const westNeighborCuts: Interval[] = [];
  for (const w of otherRooms) {
    const wMaxX = w.position.x + w.width / 2;
    if (Math.abs(wMaxX - rMinX) < 0.25) {
      const wMinZ = w.position.z - w.depth / 2;
      const wMaxZ = w.position.z + w.depth / 2;
      const overlapStart = Math.max(rMinZ, wMinZ);
      const overlapEnd = Math.min(rMaxZ, wMaxZ);
      if (overlapEnd - overlapStart > 0.1) {
        westNeighborCuts.push({ start: overlapStart, end: overlapEnd });
      }
    }
  }

  // Cut gates/doors on West edge
  for (const g of roomGates) {
    if (Math.abs(g.position.x - rMinX) < 0.35) {
      westNeighborCuts.push({ start: g.position.z - g.width / 2, end: g.position.z + g.width / 2 });
    }
  }
  for (const d of roomDoors) {
    if (Math.abs(d.position.x - rMinX) < 0.35) {
      westNeighborCuts.push({ start: d.position.z - d.width / 2, end: d.position.z + d.width / 2 });
    }
  }

  const westBaseStart = rMinZ + tFt / 2;
  const westBaseEnd = rMaxZ - tFt / 2;

  if (westBaseEnd > westBaseStart) {
    const westSegments = subtractIntervals({ start: westBaseStart, end: westBaseEnd }, westNeighborCuts);
    for (const seg of westSegments) {
      const segLenM = (seg.end - seg.start) * FT_TO_M;
      const segCenterXM = (rMinX - room.position.x) * FT_TO_M;
      const segCenterZM = ((seg.start + seg.end) / 2 - room.position.z) * FT_TO_M;

      const materials = [roomMat, roomMat, capMat, capMat, roomMat, roomMat];
      const wall = new THREE.Mesh(new THREE.BoxGeometry(tM, hM, segLenM), materials);
      wall.position.set(segCenterXM, hM / 2, segCenterZM);
      wall.castShadow = true;
      wall.receiveShadow = true;
      wallGroup.add(wall);
    }
  }

  // -------------------------------------------------------------
  // 4. EAST WALL (X = rMaxX)
  // This room (the West room) is responsible for building this partition wall!
  // Uses DUAL-SIDED PAINTING:
  // - West face (-X, index 1) = this room's wallColor (faces into this room)
  // - East face (+X, index 0) = East neighbor's wallColor (faces into East room)
  // -------------------------------------------------------------
  const eastCuts: Interval[] = [];
  for (const g of roomGates) {
    if (Math.abs(g.position.x - rMaxX) < 0.35) {
      eastCuts.push({ start: g.position.z - g.width / 2, end: g.position.z + g.width / 2 });
    }
  }
  for (const d of roomDoors) {
    if (Math.abs(d.position.x - rMaxX) < 0.35) {
      eastCuts.push({ start: d.position.z - d.width / 2, end: d.position.z + d.width / 2 });
    }
  }

  const eastBaseStart = rMinZ + tFt / 2;
  const eastBaseEnd = rMaxZ - tFt / 2;

  if (eastBaseEnd > eastBaseStart) {
    const eastSegments = subtractIntervals({ start: eastBaseStart, end: eastBaseEnd }, eastCuts);
    for (const seg of eastSegments) {
      const segLenM = (seg.end - seg.start) * FT_TO_M;
      const segCenterXM = (rMaxX - room.position.x) * FT_TO_M;
      const segCenterZM = ((seg.start + seg.end) / 2 - room.position.z) * FT_TO_M;

      // Check if there is an East neighbor connected along this segment
      const eastNeighbor = findEastNeighbor(seg, rMaxX, otherRooms);
      const eastMat = eastNeighbor ? getWallMaterialByHex(eastNeighbor.wallColor) : roomMat;

      // BoxGeometry Face Mapping:
      // 0: +X (East Face), 1: -X (West Face), 2: +Y (Top), 3: -Y, 4: +Z, 5: -Z
      const materials = [
        eastMat,  // +X (East face: painted with East room's color!)
        roomMat,  // -X (West face: painted with this room's color!)
        capMat,   // +Y (Top)
        capMat,   // -Y
        roomMat,  // +Z
        roomMat   // -Z
      ];

      const wall = new THREE.Mesh(new THREE.BoxGeometry(tM, hM, segLenM), materials);
      wall.position.set(segCenterXM, hM / 2, segCenterZM);
      wall.castShadow = true;
      wall.receiveShadow = true;
      wallGroup.add(wall);
    }
  }

  return wallGroup;
}
