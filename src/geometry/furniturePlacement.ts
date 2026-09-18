import * as THREE from 'three';
import { FurnitureObject, Room, WallSegment, FT_TO_M } from '../types/scene';
import { createFurnitureMeshGroup } from '../canvas/furnitureMeshes';
import { disposeFurniture } from '../canvas/furnitureRealism';
import { getRoomEdges, getRoomWorldPolygon, isPointInRoom } from './roomGeometry';
import { ArchitectureInput, hasArchitectureEdits, resolveWallPieces, listSpaceBoundaries, projectOnWall } from './architecture';

type Bounds = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
const cache = new Map<string, Bounds>();
const GAP = 0.06; // feet, roughly 18 mm between visible surfaces

function localBounds(item: FurnitureObject): Bounds {
  const key = JSON.stringify([item.type, item.dimensions, item.scale, item.rotation, item.material]);
  const cached = cache.get(key);
  if (cached) return cached;
  const group = createFurnitureMeshGroup(item);
  group.rotation.set(...[item.rotation.x, item.rotation.y, item.rotation.z].map(THREE.MathUtils.degToRad) as [number, number, number]);
  const box = new THREE.Box3().setFromObject(group);
  const w = item.dimensions.x * item.scale.x * FT_TO_M;
  const h = item.dimensions.y * item.scale.y * FT_TO_M;
  const d = item.dimensions.z * item.scale.z * FT_TO_M;
  const envelope = new THREE.Box3(new THREE.Vector3(-w / 2, 0, -d / 2), new THREE.Vector3(w / 2, h, d / 2));
  envelope.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(group.rotation));
  box.union(envelope);
  const bounds = { minX: box.min.x / FT_TO_M, maxX: box.max.x / FT_TO_M,
    minY: box.min.y / FT_TO_M, maxY: box.max.y / FT_TO_M,
    minZ: box.min.z / FT_TO_M, maxZ: box.max.z / FT_TO_M };
  disposeFurniture(group);
  if (cache.size >= 256) cache.delete(cache.keys().next().value!);
  cache.set(key, bounds);
  return bounds;
}

export function furnitureBounds(item: FurnitureObject): Bounds {
  const b = localBounds(item), p = item.position;
  return { minX: b.minX + p.x, maxX: b.maxX + p.x, minY: b.minY + p.y, maxY: b.maxY + p.y, minZ: b.minZ + p.z, maxZ: b.maxZ + p.z };
}

function intersects(a: Bounds, b: Bounds, gap = GAP): boolean {
  return a.minX < b.maxX + gap && a.maxX > b.minX - gap && a.minZ < b.maxZ + gap && a.maxZ > b.minZ - gap
    && a.minY < b.maxY - 0.01 && a.maxY > b.minY + 0.01;
}

export function furnitureOverlaps(a: FurnitureObject, b: FurnitureObject): boolean {
  return intersects(furnitureBounds(a), furnitureBounds(b));
}

export function furnitureFitsRoom(item: FurnitureObject, room: Room): boolean {
  const b = furnitureBounds(item);
  const corners = [{ x: b.minX, z: b.minZ }, { x: b.maxX, z: b.minZ }, { x: b.maxX, z: b.maxZ }, { x: b.minX, z: b.maxZ }];
  if (!corners.every(p => isPointInRoom(p, room))) return false;
  // Checking every edge catches a concave notch crossing the box even when all corners fit.
  return !getRoomEdges(room).some(edge => {
    const t = room.wallThickness / 2 + GAP;
    return intersects(b, { minX: Math.min(edge.start.x, edge.end.x) - t, maxX: Math.max(edge.start.x, edge.end.x) + t,
      minZ: Math.min(edge.start.z, edge.end.z) - t, maxZ: Math.max(edge.start.z, edge.end.z) + t,
      minY: room.position.y, maxY: room.position.y + room.height }, 0);
  });
}

function hitsWalls(item: FurnitureObject, walls: WallSegment[]): boolean {
  const b = furnitureBounds(item);
  return walls.some(w => intersects(b, { minX: Math.min(w.start.x, w.end.x) - w.thickness / 2,
    maxX: Math.max(w.start.x, w.end.x) + w.thickness / 2, minZ: Math.min(w.start.z, w.end.z) - w.thickness / 2,
    maxZ: Math.max(w.start.z, w.end.z) + w.thickness / 2, minY: 0, maxY: w.height }));
}

function fitsFloorUnion(item: FurnitureObject, rooms: Room[]) {
  const b = furnitureBounds(item);
  const vertices = rooms.flatMap(getRoomWorldPolygon);
  const xs = [...new Set([b.minX, b.maxX, ...vertices.map(p => p.x).filter(x => x > b.minX && x < b.maxX)])].sort((a, b) => a - b);
  const zs = [...new Set([b.minZ, b.maxZ, ...vertices.map(p => p.z).filter(z => z > b.minZ && z < b.maxZ)])].sort((a, b) => a - b);
  // Cell decomposition handles concave orthogonal zones and holes, unlike four-corner containment.
  for (let x = 1; x < xs.length; x++) for (let z = 1; z < zs.length; z++) {
    if (!rooms.some(r => isPointInRoom({ x: (xs[x - 1] + xs[x]) / 2, z: (zs[z - 1] + zs[z]) / 2 }, r))) return false;
  }
  return rooms.length > 0;
}

function hitsResolvedWall(item: FurnitureObject, input: ArchitectureInput) {
  const b = furnitureBounds(item);
  // SAT rectangle-vs-oriented-wall test: diagonal walls do not block their whole bounding box.
  return resolveWallPieces(input).some(w => {
    if (b.minY >= w.base + w.height || b.maxY <= w.base) return false;
    const dx = w.end.x - w.start.x, dz = w.end.z - w.start.z, length = Math.hypot(dx, dz);
    const ux = dx / length, uz = dz / length;
    const cx = (b.minX + b.maxX) / 2 - (w.start.x + w.end.x) / 2;
    const cz = (b.minZ + b.maxZ) / 2 - (w.start.z + w.end.z) / 2;
    const hx = (b.maxX - b.minX) / 2, hz = (b.maxZ - b.minZ) / 2, half = w.thickness / 2 + GAP;
    return Math.abs(cx) < hx + Math.abs(ux) * length / 2 + Math.abs(uz) * half
      && Math.abs(cz) < hz + Math.abs(uz) * length / 2 + Math.abs(ux) * half
      && Math.abs(cx * ux + cz * uz) < length / 2 + hx * Math.abs(ux) + hz * Math.abs(uz) + GAP
      && Math.abs(-cx * uz + cz * ux) < half + hx * Math.abs(uz) + hz * Math.abs(ux);
  });
}

export function furnitureBlocksDoor(item: FurnitureObject, input: ArchitectureInput) {
  const b = furnitureBounds(item), walls = listSpaceBoundaries(input);
  return input.doors.filter(d => d.managed).some(d => {
    if (b.minY >= d.height || b.maxY <= 0) return false;
    const w = walls.find(w => w.id === d.wallId);
    if (!w) return false;
    const corners = [{ x: b.minX, z: b.minZ }, { x: b.maxX, z: b.minZ }, { x: b.maxX, z: b.maxZ }, { x: b.minX, z: b.maxZ }];
    const along = corners.map(p => projectOnWall(w, p).offset);
    const normal = corners.map(p => ((p.z - w.start.z) * (w.end.x - w.start.x) - (p.x - w.start.x) * (w.end.z - w.start.z)) / w.length);
    const center = projectOnWall(w, d.position).offset;
    const inward = (d.swing !== 'outward' ? 1 : -1) * (d.interiorSide ?? 1) > 0;
    const swingDepth = d.doorType === 'standard' || d.doorType === 'double' ? d.width / (d.doorType === 'double' ? 2 : 1) : 0;
    // Conservative swing rectangle plus a 2.5-foot approach strip on either side.
    return Math.max(...along) > center - d.width / 2 - GAP && Math.min(...along) < center + d.width / 2 + GAP
      && Math.max(...normal) > -Math.max(2.5, inward ? 0 : swingDepth)
      && Math.min(...normal) < Math.max(2.5, inward ? swingDepth : 0);
  });
}

function structuralWalls(rooms: Room[], walls: WallSegment[]): WallSegment[] {
  return [...walls, ...rooms.flatMap(room => getRoomEdges(room).map(edge => ({
    id: edge.id, roomId: room.id, start: edge.start, end: edge.end,
    height: room.height, thickness: room.wallThickness,
  })))];
}

export function findFurniturePlacement(item: FurnitureObject, rooms: Room[], others: FurnitureObject[], walls: WallSegment[], allowRotation = false, architecture?: ArchitectureInput): FurnitureObject | null {
  if (![...Object.values(item.position), ...Object.values(item.scale), ...Object.values(item.dimensions), ...Object.values(item.rotation)].every(Number.isFinite)
    || Object.values(item.scale).some(n => n <= 0) || Object.values(item.dimensions).some(n => n <= 0)) return null;
  const room = rooms.find(r => r.id === item.roomId) ?? rooms.find(r => isPointInRoom(item.position, r));
  const assigned = room ? { ...item, roomId: room.id } : item;
  const allWalls = structuralWalls(rooms, walls);
  const obstacles = others.filter(o => o.id !== item.id).map(furnitureBounds);
  const managed = architecture && hasArchitectureEdits(architecture);
  const valid = (candidate: FurnitureObject) => (managed
    ? fitsFloorUnion(candidate, rooms) && !hitsResolvedWall(candidate, architecture) && !furnitureBlocksDoor(candidate, architecture)
    : (!room || furnitureFitsRoom(candidate, room)) && !hitsWalls(candidate, allWalls))
    && !obstacles.some(b => intersects(furnitureBounds(candidate), b));
  if (valid(assigned)) return assigned;
  if (!room) return null;
  for (const angle of allowRotation ? [0, 90, 180, 270] : [0]) {
    const candidate = { ...assigned, rotation: { ...item.rotation, y: item.rotation.y + angle } };
    const b = localBounds(candidate), margin = room.wallThickness / 2 + GAP + 0.005;
    const minX = room.position.x - room.width / 2 + margin - b.minX;
    const maxX = room.position.x + room.width / 2 - margin - b.maxX;
    const minZ = room.position.z - room.depth / 2 + margin - b.minZ;
    const maxZ = room.position.z + room.depth / 2 - margin - b.maxZ;
    if (minX > maxX || minZ > maxZ) continue;
    const xs = new Set([minX, maxX, Math.max(minX, Math.min(maxX, item.position.x))]);
    const zs = new Set([minZ, maxZ, Math.max(minZ, Math.min(maxZ, item.position.z))]);
    // Obstacle edges catch narrow valid spaces that a coarse grid could miss.
    for (const o of obstacles) {
      for (const x of [o.minX - GAP - b.maxX - 0.005, o.maxX + GAP - b.minX + 0.005]) if (x >= minX && x <= maxX) xs.add(x);
      for (const z of [o.minZ - GAP - b.maxZ - 0.005, o.maxZ + GAP - b.minZ + 0.005]) if (z >= minZ && z <= maxZ) zs.add(z);
    }
    const step = Math.max(0.25, Math.max(maxX - minX, maxZ - minZ) / 60);
    for (let x = minX; x <= maxX; x += step) xs.add(x);
    for (let z = minZ; z <= maxZ; z += step) zs.add(z);
    const positions = [...xs].flatMap(x => [...zs].map(z => ({ x, y: item.position.y, z })));
    positions.sort((a, b) => Math.hypot(a.x - item.position.x, a.z - item.position.z) - Math.hypot(b.x - item.position.x, b.z - item.position.z));
    for (const position of positions) {
      const placed = { ...candidate, position };
      if (valid(placed)) return placed;
    }
  }
  return null;
}

export function auditFurniture(furniture: FurnitureObject[], rooms: Room[], walls: WallSegment[], architecture?: ArchitectureInput) {
  const issues: Array<{ objectId: string; otherId?: string; reason: string }> = [];
  const allWalls = structuralWalls(rooms, walls);
  for (const [i, item] of furniture.entries()) {
    const room = rooms.find(r => r.id === item.roomId);
    const managed = architecture && hasArchitectureEdits(architecture);
    if (managed ? !fitsFloorUnion(item, rooms) || hitsResolvedWall(item, architecture) : (room && !furnitureFitsRoom(item, room)) || hitsWalls(item, allWalls)) issues.push({ objectId: item.id, reason: 'Overlaps a wall or lies outside the floor' });
    if (managed && furnitureBlocksDoor(item, architecture)) issues.push({ objectId: item.id, reason: 'Blocks door swing or approach clearance' });
    for (const other of furniture.slice(i + 1)) if (furnitureOverlaps(item, other)) issues.push({ objectId: item.id, otherId: other.id, reason: 'Furniture overlap' });
  }
  return issues;
}

export function repairFurnitureLayout(furniture: FurnitureObject[], rooms: Room[], walls: WallSegment[], roomId?: string, architecture?: ArchitectureInput) {
  let result: FurnitureObject[] = furniture.map(item => ({ ...item, roomId: item.roomId ?? rooms.find(r => isPointInRoom(item.position, r))?.id }));
  for (const room of rooms.filter(r => !roomId || r.id === roomId)) {
    const members = result.filter(i => i.roomId === room.id && !i.locked);
    const fixed = result.filter(i => i.roomId !== room.id || i.locked);
    const area = (i: FurnitureObject) => { const b = localBounds(i); return (b.maxX - b.minX) * (b.maxZ - b.minZ); };
    const ids = new Set(members.map(i => i.id));
    const issueCount = (items: FurnitureObject[]) => auditFurniture(items, rooms, walls, architecture).filter(i => ids.has(i.objectId) || (i.otherId && ids.has(i.otherId))).length;
    let best = result, bestCount = issueCount(result);
    if (bestCount === 0) continue;
    const orders = [members, [...members].sort((a, b) => area(b) - area(a)), [...members].reverse()];
    // Small crowded rooms need alternatives: an initially valid placement can
    // consume the only space available to a later item (e.g. shower + vanity).
    if (members.length <= 5) {
      const permute = (prefix: FurnitureObject[], rest: FurnitureObject[]) => {
        if (!rest.length) { orders.push(prefix); return; }
        rest.forEach((item, i) => permute([...prefix, item], rest.filter((_, j) => i !== j)));
      };
      permute([], members);
    }
    // Also try packing from a corner. Merely changing order cannot free a strip
    // beside a large bed if the bed's original central position is already valid.
    for (const order of [...orders]) {
      if (!order.length) continue;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        orders.push([{ ...order[0], position: { ...order[0].position,
          x: room.position.x + sx * room.width / 2,
          z: room.position.z + sz * room.depth / 2 } }, ...order.slice(1)]);
      }
    }
    for (const order of orders) {
      const placed = [...fixed], failed: FurnitureObject[] = [];
      for (const item of order) {
        const found = findFurniturePlacement(item, rooms, placed, walls, true, architecture);
        if (found) placed.push(found); else failed.push(item);
      }
      const candidate = result.map(i => placed.find(p => p.id === i.id) ?? failed.find(f => f.id === i.id) ?? i);
      const count = issueCount(candidate);
      if (count < bestCount) { best = candidate; bestCount = count; }
      if (count === 0) break;
    }
    result = best;
  }
  return { furniture: result, unresolved: auditFurniture(result, rooms, walls, architecture) };
}
