import { FloorPlan, GeometryValidation, Wall, RoomPolygon, Opening, Point } from '../types/floorPlan';

/**
 * Validates 2D Floor Plan geometry before generating 3D structures.
 * Checks for unclosed polygons, duplicate walls, opening bounds, and dimension accuracy.
 */
export function validateFloorPlanGeometry(floorPlan: FloorPlan): GeometryValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  let unclosedCount = 0;
  let duplicateWallCount = 0;
  let dimensionDeviations = 0;

  // 1. Validate Walls
  const wallMap = new Map<string, Wall>();
  floorPlan.walls.forEach(w => wallMap.set(w.id, w));

  for (let i = 0; i < floorPlan.walls.length; i++) {
    const w1 = floorPlan.walls[i];
    const len = Math.hypot(w1.end.x - w1.start.x, w1.end.y - w1.start.y);
    if (len < 0.2) {
      errors.push(`Wall "${w1.id}" has near-zero length (${len.toFixed(2)}ft).`);
    }

    // Check for duplicates
    for (let j = i + 1; j < floorPlan.walls.length; j++) {
      const w2 = floorPlan.walls[j];
      const isSameStartEnd =
        (distSq(w1.start, w2.start) < 0.05 && distSq(w1.end, w2.end) < 0.05) ||
        (distSq(w1.start, w2.end) < 0.05 && distSq(w1.end, w2.start) < 0.05);

      if (isSameStartEnd) {
        duplicateWallCount++;
        warnings.push(`Duplicate wall segment detected: "${w1.id}" and "${w2.id}".`);
      }
    }
  }

  // 2. Validate Room Polygons
  for (const room of floorPlan.rooms) {
    if (!room.polygon || room.polygon.length < 3) {
      unclosedCount++;
      errors.push(`Room "${room.name}" has invalid polygon with < 3 vertices.`);
      continue;
    }

    // Check polygon closure (first and last vertex)
    const first = room.polygon[0];
    const last = room.polygon[room.polygon.length - 1];
    const gap = Math.hypot(last.x - first.x, last.y - first.y);
    if (gap > 0.5) {
      unclosedCount++;
      warnings.push(`Room "${room.name}" polygon is not closed (gap: ${gap.toFixed(2)}ft).`);
    }

    // Check polygon area
    const area = computePolygonArea(room.polygon);
    if (area < 4.0) {
      warnings.push(`Room "${room.name}" has unrealistically small area (${area.toFixed(1)} sq ft).`);
    }

    // Check bounding box against explicit dimensions if available
    if (room.width && room.depth) {
      const bbox = computePolygonBounds(room.polygon);
      const bboxW = bbox.maxX - bbox.minX;
      const bboxD = bbox.maxY - bbox.minY;
      const diffW = Math.abs(bboxW - room.width);
      const diffD = Math.abs(bboxD - room.depth);

      if (diffW > 2.0 || diffD > 2.0) {
        dimensionDeviations++;
        warnings.push(
          `Room "${room.name}" detected bounds (${bboxW.toFixed(1)}x${bboxD.toFixed(1)}ft) deviate from labeled dimensions (${room.width}x${room.depth}ft).`
        );
      }
    }
  }

  // 3. Validate Openings (Doors & Windows)
  for (const op of floorPlan.openings) {
    const hostWall = wallMap.get(op.wallId);
    if (!hostWall) {
      errors.push(`Opening "${op.id}" references non-existent wallId "${op.wallId}".`);
      continue;
    }

    if (op.position < 0.0 || op.position > 1.0) {
      warnings.push(`Opening "${op.id}" position ${op.position.toFixed(2)} is outside wall segment bounds.`);
    }

    const wallLen = Math.hypot(hostWall.end.x - hostWall.start.x, hostWall.end.y - hostWall.start.y);
    if (op.width > wallLen + 0.1) {
      warnings.push(`Opening "${op.id}" width (${op.width}ft) exceeds host wall length (${wallLen.toFixed(1)}ft).`);
    }
  }

  // Calculate confidence score
  let penalty = 0;
  penalty += errors.length * 0.15;
  penalty += warnings.length * 0.03;
  penalty += unclosedCount * 0.1;
  penalty += duplicateWallCount * 0.05;
  penalty += dimensionDeviations * 0.05;

  const confidence = Math.max(0.2, Math.min(1.0, 1.0 - penalty));
  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    confidence: Number(confidence.toFixed(2)),
    metrics: {
      wallCount: floorPlan.walls.length,
      roomCount: floorPlan.rooms.length,
      openingCount: floorPlan.openings.length,
      unclosedPolygons: unclosedCount,
      overlappingWalls: duplicateWallCount,
      dimensionDeviations
    }
  };
}

function distSq(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy;
}

export function computePolygonArea(polygon: Point[]): number {
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(area) / 2.0;
}

export function computePolygonBounds(polygon: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}
