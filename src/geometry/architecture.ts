import { Room, WallSegment, DoorOpening, WindowOpening, ConnectionGate, Vector2D } from '../types/scene';
import { getRoomEdges, isPointInRoom } from './roomGeometry';

export interface ArchitectureInput {
  rooms: Room[]; customWalls: WallSegment[]; doors: DoorOpening[];
  windows: WindowOpening[]; gates: ConnectionGate[];
}
export interface SpaceBoundary extends WallSegment { length: number; roomIds: string[] }
export interface WallPiece extends WallSegment { base: number }
export interface OpeningSpan { id: string; wallId: string; offset: number; width: number; bottom: number; top: number }
const EPS = 0.025;
const dot = (a: Vector2D, b: Vector2D) => a.x * b.x + a.z * b.z;
export const wallPoint = (w: SpaceBoundary, distance: number): Vector2D => ({
  x: w.start.x + (w.end.x - w.start.x) * distance / w.length,
  z: w.start.z + (w.end.z - w.start.z) * distance / w.length,
});
export function projectOnWall(w: SpaceBoundary, p: Vector2D) {
  const offset = dot({ x: p.x - w.start.x, z: p.z - w.start.z },
    { x: (w.end.x - w.start.x) / w.length, z: (w.end.z - w.start.z) / w.length });
  const q = wallPoint(w, offset);
  return { offset, distance: Math.hypot(q.x - p.x, q.z - p.z) };
}
export function doorInteriorSide(w: SpaceBoundary, p: Vector2D, room?: Room): 1 | -1 {
  const normal = { x: -(w.end.z - w.start.z) / w.length, z: (w.end.x - w.start.x) / w.length };
  return !room || isPointInRoom({ x: p.x + normal.x * 0.5, z: p.z + normal.z * 0.5 }, room) ? 1 : -1;
}
function overlap(a: SpaceBoundary, b: SpaceBoundary) {
  const p = projectOnWall(a, b.start), q = projectOnWall(a, b.end);
  if (p.distance > EPS || q.distance > EPS) return null;
  const start = Math.max(0, Math.min(p.offset, q.offset)), end = Math.min(a.length, Math.max(p.offset, q.offset));
  return end - start > EPS ? { start, end } : null;
}

// Reference-keyed caches: furniture moves and selection changes do not rebuild architecture.
let boundaryCache: { rooms: Room[]; walls: WallSegment[]; value: SpaceBoundary[] } | undefined;
export function listSpaceBoundaries(input: Pick<ArchitectureInput, 'rooms' | 'customWalls'>): SpaceBoundary[] {
  if (boundaryCache?.rooms === input.rooms && boundaryCache.walls === input.customWalls) return boundaryCache.value;
  const value: SpaceBoundary[] = [...input.rooms.filter(r => !r.explicitWalls).flatMap(r => getRoomEdges(r).map(e => ({
    id: e.id, roomId: r.id, roomIds: [r.id], start: e.start, end: e.end, length: e.length,
    height: r.height, thickness: r.wallThickness, color: r.wallColor,
  }))), ...input.customWalls.map(w => ({ ...w, roomIds: [w.roomId], length: Math.hypot(w.end.x - w.start.x, w.end.z - w.start.z) }))];
  for (let i = 0; i < value.length; i++) for (let j = i + 1; j < value.length; j++) {
    if (value[i].roomId !== value[j].roomId && overlap(value[i], value[j])) {
      value[i].roomIds = [...new Set([...value[i].roomIds, value[j].roomId])];
      value[j].roomIds = [...new Set([...value[j].roomIds, value[i].roomId])];
    }
  }
  boundaryCache = { rooms: input.rooms, walls: input.customWalls, value };
  return value;
}
export function hasArchitectureEdits(input: ArchitectureInput) {
  return input.rooms.some(r => r.architectureVersion || r.openConnections?.length) || input.doors.some(d => d.managed);
}
export function openingSpans(input: ArchitectureInput, walls = listSpaceBoundaries(input)): OpeningSpan[] {
  const spans: OpeningSpan[] = [];
  for (const room of input.rooms) for (const o of room.openConnections ?? []) {
    const w = walls.find(w => w.id === o.wallId);
    if (w) spans.push({ ...o, bottom: 0, top: w.height });
  }
  for (const o of [...input.doors, ...input.windows, ...input.gates]) {
    const explicit = 'wallId' in o ? walls.find(w => w.id === o.wallId) : undefined;
    const w = explicit ?? walls.find(w => {
      const belongs = 'roomId' in o ? w.roomId === o.roomId : w.roomId === o.roomIdA || w.roomId === o.roomIdB;
      const p = projectOnWall(w, o.position);
      return belongs && p.distance < 0.55 && p.offset >= 0 && p.offset <= w.length;
    });
    if (!w) continue;
    const bottom = 'elevation' in o ? o.elevation : 0;
    const offset = 'offset' in o && o.offset !== undefined ? o.offset : projectOnWall(w, o.position).offset - o.width / 2;
    spans.push({ id: o.id, wallId: w.id, offset, width: o.width, bottom, top: bottom + o.height });
  }
  return spans;
}
export function spansOnWall(w: SpaceBoundary, spans: OpeningSpan[], walls: SpaceBoundary[]) {
  return spans.flatMap(s => {
    const source = walls.find(v => v.id === s.wallId);
    if (!source || !overlap(w, source)) return [];
    const a = projectOnWall(w, wallPoint(source, s.offset)).offset;
    const b = projectOnWall(w, wallPoint(source, s.offset + s.width)).offset;
    const start = Math.max(0, Math.min(a, b)), end = Math.min(w.length, Math.max(a, b));
    return end - start > EPS ? [{ ...s, offset: start, width: end - start }] : [];
  });
}
let pieceCache: { refs: unknown[]; value: WallPiece[] } | undefined;
export function resolveWallPieces(input: ArchitectureInput): WallPiece[] {
  const refs = [input.rooms, input.customWalls, input.doors, input.windows, input.gates];
  if (pieceCache && refs.every((r, i) => pieceCache!.refs[i] === r)) return pieceCache.value;
  const walls = listSpaceBoundaries(input), spans = openingSpans(input, walls), value: WallPiece[] = [];
  for (const [index, w] of walls.entries()) {
    const cuts = spansOnWall(w, spans, walls);
    // One owner per shared span; split partial neighbors rather than duplicating partitions.
    const ownedElsewhere = walls.slice(0, index).flatMap(other => {
      const shared = overlap(w, other); return shared ? [shared] : [];
    });
    const points = [...new Set([0, w.length, ...cuts.flatMap(c => [c.offset, c.offset + c.width]),
      ...ownedElsewhere.flatMap(o => [o.start, o.end])])].sort((a, b) => a - b);
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i], end = points[i + 1], mid = (start + end) / 2;
      if (end - start < EPS || ownedElsewhere.some(o => mid > o.start && mid < o.end)) continue;
      const blocked = cuts.filter(c => mid >= c.offset && mid <= c.offset + c.width).sort((a, b) => a.bottom - b.bottom);
      let base = 0;
      const emit = (top: number) => { if (top > base + EPS) value.push({ ...w,
        start: wallPoint(w, start), end: wallPoint(w, end), base, height: top - base }); };
      for (const cut of blocked) { emit(Math.min(w.height, cut.bottom)); base = Math.max(base, cut.top); }
      emit(w.height);
    }
  }
  pieceCache = { refs, value }; return value;
}

export function validateOpening(input: ArchitectureInput, wallId: string, offset: number, width: number, height?: number, exceptId?: string) {
  const walls = listSpaceBoundaries(input), w = walls.find(w => w.id === wallId);
  if (!w) throw new Error('Wall no longer exists. Select a wall again.');
  if (input.rooms.some(r => w.roomIds.includes(r.id) && r.locked)) throw new Error('Unlock the adjoining rooms before editing this wall.');
  if (![offset, width, height ?? w.height].every(Number.isFinite) || width <= 0 || offset < 0 || offset + width > w.length + EPS
    || (height !== undefined && (height <= 0 || height > w.height))) throw new Error('Opening must fit within the wall; use positive dimensions in feet.');
  if (spansOnWall(w, openingSpans(input, walls), walls).some(s => s.id !== exceptId && offset < s.offset + s.width - EPS && offset + width > s.offset + EPS)) {
    throw new Error('This span already contains a door, window, or open connection. Edit or remove it first.');
  }
  return w;
}
export function prepareDoor(input: ArchitectureInput, request: {
  roomId: string; wallId?: string; position?: { x: number; y: number; z: number }; offset?: number;
  width?: number; height?: number; doorType?: DoorOpening['doorType']; hinge?: DoorOpening['hinge']; swing?: DoorOpening['swing'];
}, id: string): DoorOpening {
  const walls = listSpaceBoundaries(input), width = request.width ?? 3.2, height = request.height ?? 7;
  if (width < 0.5 || height < 1) throw new Error('Door dimensions are too small for the frame. Minimum width is 0.5 ft and height is 1 ft.');
  let w = walls.find(w => w.id === request.wallId);
  if (request.wallId && !w) throw new Error('Wall not found.');
  if (!w && request.position) {
    const candidates = walls.filter(w => w.roomId === request.roomId && projectOnWall(w, request.position!).distance <= Math.max(0.3, w.thickness));
    if (candidates.length !== 1) throw new Error('Select an explicit wall ID; the position is not on one unambiguous wall.');
    w = candidates[0];
  }
  if (!w || !w.roomIds.includes(request.roomId)) throw new Error('Select a wall belonging to this room.');
  const offset = request.offset ?? (request.position ? projectOnWall(w, request.position).offset - width / 2 : (w.length - width) / 2);
  validateOpening(input, w.id, offset, width, height, id);
  if (request.doorType && !['standard', 'double', 'sliding', 'pocket', 'arch'].includes(request.doorType)) throw new Error('Unsupported door style.');
  if (request.hinge && !['left', 'right'].includes(request.hinge)) throw new Error('Invalid hinge side.');
  if (request.swing && !['inward', 'outward'].includes(request.swing)) throw new Error('Invalid swing direction.');
  const p = wallPoint(w, offset + width / 2);
  return { id, roomId: request.roomId, wallId: w.id, position: { ...p, y: 0 }, width, height,
    rotation: -Math.atan2(w.end.z - w.start.z, w.end.x - w.start.x) * 180 / Math.PI,
    doorType: request.doorType ?? 'standard', offset, hinge: request.hinge ?? 'left', swing: request.swing ?? 'inward', managed: true,
    interiorSide: doorInteriorSide(w, p, input.rooms.find(r => r.id === request.roomId)) };
}
