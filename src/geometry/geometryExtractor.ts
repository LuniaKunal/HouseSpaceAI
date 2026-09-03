import {
  FloorPlan,
  Wall,
  RoomPolygon,
  Opening,
  DimensionAnnotation,
  GeometryValidation,
  Point
} from '../types/floorPlan';
import { validateFloorPlanGeometry } from './geometryValidator';
import {
  analyzeFloorplanImage,
  parseUserDesignRequest,
  synthesizeArchitecturalPlan
} from '../webmcp/imageFloorplanAnalyzer';

export interface BlueprintInput {
  dataUrl?: string;
  blueprintName?: string;
  scaleOverride?: number;
  userPrompt?: string;
}

export interface ExtractionResult {
  floorPlan: FloorPlan;
  validation: GeometryValidation;
  sourceType: 'svg_vector' | 'raster_blueprint' | 'cad_model';
  detectedAnnotations: DimensionAnnotation[];
}

/**
 * Parses architectural dimension text like "17'-0" X 18'-0"" or "5'-0" X 9'-9"" into feet numbers.
 */
export function parseDimensionText(text: string): { width: number; depth: number } | null {
  const clean = text.replace(/[\n\r]/g, ' ').trim();
  // Match formats: 17'-0" x 18'-0", 17' x 18', 17'0" x 18'0", 5'-0" X 9'-9", 7'6" x 4'6"
  const regex = /(\d+)\s*['’]\s*-?\s*(\d+)?\s*["”]?\s*[xX×]\s*(\d+)\s*['’]\s*-?\s*(\d+)?\s*["”]?/;
  const match = clean.match(regex);
  if (!match) return null;

  const wFeet = parseInt(match[1], 10) || 0;
  const wInches = match[2] ? parseInt(match[2], 10) : 0;
  const dFeet = parseInt(match[3], 10) || 0;
  const dInches = match[4] ? parseInt(match[4], 10) : 0;

  return {
    width: Number((wFeet + wInches / 12).toFixed(2)),
    depth: Number((dFeet + dInches / 12).toFixed(2))
  };
}

/**
 * Extracts a normalized, structured 2D FloorPlan from blueprint images, SVG vectors, or CAD references.
 * ZERO HARDCODED GEOMETRY: Dynamically derives layout from user input.
 */
export async function extractFloorPlanFromBlueprint(input: BlueprintInput): Promise<ExtractionResult> {
  const dataUrl = input.dataUrl || '';
  const isSvg = dataUrl.startsWith('data:image/svg+xml') || dataUrl.includes('<svg');

  if (isSvg) {
    return await extractFromSvgBlueprint(dataUrl, input);
  }

  // Handle raster blueprints (PNG, JPG, WebP) or custom prompts
  return extractFromRasterBlueprint(dataUrl, input);
}

/**
 * Generalized Vector Extraction for SVG blueprints & CAD drawings.
 * Dynamically parses <rect>, <polygon>, <path>, and <text> elements.
 */
export async function extractFromSvgBlueprint(svgContent: string, input: BlueprintInput): Promise<ExtractionResult> {
  let rawSvg = svgContent;
  if (rawSvg.startsWith('data:image/svg+xml;base64,')) {
    try {
      if (typeof atob !== 'undefined') {
        rawSvg = atob(rawSvg.replace('data:image/svg+xml;base64,', ''));
      } else if (typeof globalThis !== 'undefined' && (globalThis as any).Buffer) {
        rawSvg = (globalThis as any).Buffer.from(rawSvg.replace('data:image/svg+xml;base64,', ''), 'base64').toString('utf8');
      }
    } catch {}
  } else if (rawSvg.startsWith('data:image/svg+xml;utf8,') || rawSvg.startsWith('data:image/svg+xml,')) {
    rawSvg = decodeURIComponent(rawSvg.replace(/data:image\/svg\+xml(;utf8)?,/, ''));
  }

  // 1. Extract ViewBox or Width/Height
  let vbWidth = 800;
  let vbHeight = 600;
  let vbMinX = 0;
  let vbMinY = 0;

  const vbMatch = rawSvg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
  if (vbMatch) {
    vbMinX = parseFloat(vbMatch[1]);
    vbMinY = parseFloat(vbMatch[2]);
    vbWidth = parseFloat(vbMatch[3]);
    vbHeight = parseFloat(vbMatch[4]);
  } else {
    const wMatch = rawSvg.match(/width=["']([\d.]+)["']/i);
    const hMatch = rawSvg.match(/height=["']([\d.]+)["']/i);
    if (wMatch) vbWidth = parseFloat(wMatch[1]);
    if (hMatch) vbHeight = parseFloat(hMatch[1]);
  }

  // 2. Parse Text Elements (Labels & Dimension Annotations)
  interface SvgTextItem {
    text: string;
    x: number;
    y: number;
  }
  const textItems: SvgTextItem[] = [];
  const textRegex = /<text[^>]*x=["']([-\d.]+)["'][^>]*y=["']([-\d.]+)["'][^>]*>([\s\S]*?)<\/text>/gi;
  let tMatch: RegExpExecArray | null;
  while ((tMatch = textRegex.exec(rawSvg)) !== null) {
    const cleanText = tMatch[3].replace(/<[^>]+>/g, '').trim();
    if (cleanText) {
      textItems.push({
        x: parseFloat(tMatch[1]),
        y: parseFloat(tMatch[2]),
        text: cleanText
      });
    }
  }

  // 3. Detect Scale from Dimensions or default to envelope
  let detectedScale = input.scaleOverride || 16.5; // pixels per foot
  const detectedAnnotations: DimensionAnnotation[] = [];

  for (const item of textItems) {
    const parsedDim = parseDimensionText(item.text);
    if (parsedDim && parsedDim.width > 3) {
      detectedAnnotations.push({
        id: `ann-${detectedAnnotations.length}`,
        rawText: item.text,
        widthFeet: parsedDim.width,
        depthFeet: parsedDim.depth,
        position: { x: item.x, y: item.y },
        matchedRoomName: ''
      });
    }
  }

  // If viewBox represents typical plan, calibrate scale so width is ~45-55 ft
  if (!input.scaleOverride && vbWidth > 200) {
    detectedScale = Math.max(10, Math.min(25, vbWidth / 48));
  }

  // 4. Extract Room Polygons (<rect>, <polygon>, <path>)
  interface RawRoomCandidate {
    id: string;
    points: Point[];
    name?: string;
    explicitDim?: string;
  }
  const candidates: RawRoomCandidate[] = [];

  // Parse <rect>
  const rectRegex = /<rect[^>]*x=["']([-\d.]+)["'][^>]*y=["']([-\d.]+)["'][^>]*width=["']([-\d.]+)["'][^>]*height=["']([-\d.]+)["'][^>]*>/gi;
  let rMatch: RegExpExecArray | null;
  while ((rMatch = rectRegex.exec(rawSvg)) !== null) {
    const rx = parseFloat(rMatch[1]);
    const ry = parseFloat(rMatch[2]);
    const rw = parseFloat(rMatch[3]);
    const rh = parseFloat(rMatch[4]);

    // Filter out full canvas background rects
    if (rw >= vbWidth * 0.95 && rh >= vbHeight * 0.95) continue;
    // Filter out tiny decoration rects
    if (rw < 20 || rh < 20) continue;

    candidates.push({
      id: `svg-rect-${candidates.length}`,
      points: [
        { x: rx, y: ry },
        { x: rx + rw, y: ry },
        { x: rx + rw, y: ry + rh },
        { x: rx, y: ry + rh },
        { x: rx, y: ry }
      ]
    });
  }

  // Parse <polygon>
  const polyRegex = /<polygon[^>]*points=["']([\s\S]*?)["'][^>]*>/gi;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = polyRegex.exec(rawSvg)) !== null) {
    const rawPoints = pMatch[1].trim().split(/[\s,]+/);
    const pts: Point[] = [];
    for (let i = 0; i < rawPoints.length - 1; i += 2) {
      const px = parseFloat(rawPoints[i]);
      const py = parseFloat(rawPoints[i + 1]);
      if (!isNaN(px) && !isNaN(py)) {
        pts.push({ x: px, y: py });
      }
    }
    if (pts.length >= 3) {
      if (pts[0].x !== pts[pts.length - 1].x || pts[0].y !== pts[pts.length - 1].y) {
        pts.push({ ...pts[0] });
      }
      candidates.push({
        id: `svg-poly-${candidates.length}`,
        points: pts
      });
    }
  }

  // If no room shapes detected from SVG vector tags (e.g. empty or raster-embedded SVG),
  // dynamically synthesize from text items or raster analyzer
  if (candidates.length === 0) {
    return await extractFromRasterBlueprint(svgContent, input);
  }

  // Center offset to normalize around (0, 0)
  const originX = vbMinX + vbWidth / 2;
  const originY = vbMinY + vbHeight / 2;

  // 5. Convert candidates to RoomPolygon in feet
  const rooms: RoomPolygon[] = [];
  let minXFt = Infinity, maxXFt = -Infinity;
  let minYFt = Infinity, maxYFt = -Infinity;

  candidates.forEach((cand, idx) => {
    const ftPoints = cand.points.map(p => ({
      x: Number(((p.x - originX) / detectedScale).toFixed(2)),
      y: Number(((p.y - originY) / detectedScale).toFixed(2))
    }));

    let cMinX = Infinity, cMaxX = -Infinity;
    let cMinY = Infinity, cMaxY = -Infinity;
    for (const pt of ftPoints) {
      cMinX = Math.min(cMinX, pt.x);
      cMaxX = Math.max(cMaxX, pt.x);
      cMinY = Math.min(cMinY, pt.y);
      cMaxY = Math.max(cMaxY, pt.y);
    }
    const widthFt = Number((cMaxX - cMinX).toFixed(2));
    const depthFt = Number((cMaxY - cMinY).toFixed(2));
    const centerFt = {
      x: Number(((cMinX + cMaxX) / 2).toFixed(2)),
      y: Number(((cMinY + cMaxY) / 2).toFixed(2))
    };

    minXFt = Math.min(minXFt, cMinX);
    maxXFt = Math.max(maxXFt, cMaxX);
    minYFt = Math.min(minYFt, cMinY);
    maxYFt = Math.max(maxYFt, cMaxY);

    // Find closest text item to center
    let closestText = '';
    let minDist = Infinity;
    const centerSvgX = (cMinX + cMaxX) / 2 * detectedScale + originX;
    const centerSvgY = (cMinY + cMaxY) / 2 * detectedScale + originY;

    for (const t of textItems) {
      const d = Math.hypot(t.x - centerSvgX, t.y - centerSvgY);
      if (d < minDist && d < detectedScale * Math.max(widthFt, depthFt) * 0.8) {
        minDist = d;
        closestText = t.text;
      }
    }

    const roomName = closestText || `Room ${idx + 1}`;
    const role = inferRoomRole(roomName, widthFt, depthFt);

    rooms.push({
      id: `fp-room-${idx}`,
      name: roomName,
      role,
      width: widthFt,
      depth: depthFt,
      center: centerFt,
      polygon: ftPoints,
      floorMaterial: role === 'bathroom' ? 'ceramic_tile' : role === 'kitchen' ? 'ceramic_tile' : 'hardwood_oak',
      wallColor: '#f8fafc',
      connections: []
    });
  });

  // Interconnect adjacent rooms
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const rA = rooms[i];
      const rB = rooms[j];
      const cAx = rA.center?.x ?? 0;
      const cAy = rA.center?.y ?? 0;
      const cBx = rB.center?.x ?? 0;
      const cBy = rB.center?.y ?? 0;
      const wA = rA.width ?? 12;
      const wB = rB.width ?? 12;
      const dA = rA.depth ?? 12;
      const dB = rB.depth ?? 12;
      const dist = Math.hypot(cAx - cBx, cAy - cBy);
      const touchDist = (wA + wB) / 2 + (dA + dB) / 2;
      if (dist < touchDist * 0.85) {
        rA.connections = rA.connections || [];
        rB.connections = rB.connections || [];
        if (!rA.connections.includes(rB.id)) rA.connections.push(rB.id);
        if (!rB.connections.includes(rA.id)) rB.connections.push(rA.id);
      }
    }
  }

  const walls: Wall[] = generateWallsFromRoomPolygons(rooms);
  const openings: Opening[] = generateOpeningsFromRooms(rooms, walls);

  const floorPlan: FloorPlan = {
    id: `fp-svg-${Date.now()}`,
    name: input.blueprintName || 'CAD Architectural Plan',
    walls,
    rooms,
    openings,
    scale: detectedScale,
    bounds: {
      minX: minXFt,
      minY: minYFt,
      maxX: maxXFt,
      maxY: maxYFt,
      widthFeet: Math.max(10, maxXFt - minXFt),
      depthFeet: Math.max(10, maxYFt - minYFt)
    },
    sourceDimensions: {
      widthFeet: Math.max(10, maxXFt - minXFt),
      depthFeet: Math.max(10, maxYFt - minYFt)
    },
    unit: 'feet'
  };

  const validation = validateFloorPlanGeometry(floorPlan);

  return {
    floorPlan,
    validation,
    sourceType: 'svg_vector',
    detectedAnnotations
  };
}

/**
 * Generalized Raster Floor Plan Extraction.
 * Uses pixel density profiling and spatial partitioning to dynamically extract
 * rooms, walls, and doors for arbitrary residential plans.
 */
async function extractFromRasterBlueprint(dataUrl: string, input: BlueprintInput): Promise<ExtractionResult> {
  const imageAnalysis = await analyzeFloorplanImage(dataUrl);
  const userRequest = parseUserDesignRequest({
    userPrompt: input.userPrompt,
    projectName: input.blueprintName,
    furnished: false
  });

  const synth = synthesizeArchitecturalPlan(imageAnalysis, userRequest);

  // Convert synthesized rooms into structured 2D FloorPlan geometry
  const rooms: RoomPolygon[] = synth.rooms.map((r, idx) => {
    const halfW = r.width / 2;
    const halfD = r.depth / 2;
    const cx = r.position.x;
    const cz = r.position.z;

    return {
      id: `fp-room-${idx}`,
      name: r.name,
      role: r.role,
      width: r.width,
      depth: r.depth,
      center: { x: cx, y: cz },
      floorMaterial: r.floorMaterial,
      wallColor: r.wallColor,
      polygon: [
        { x: Number((cx - halfW).toFixed(2)), y: Number((cz - halfD).toFixed(2)) },
        { x: Number((cx + halfW).toFixed(2)), y: Number((cz - halfD).toFixed(2)) },
        { x: Number((cx + halfW).toFixed(2)), y: Number((cz + halfD).toFixed(2)) },
        { x: Number((cx - halfW).toFixed(2)), y: Number((cz + halfD).toFixed(2)) },
        { x: Number((cx - halfW).toFixed(2)), y: Number((cz - halfD).toFixed(2)) }
      ],
      connections: synth.gates
        .filter(g => g.fromRoomName === r.name || g.toRoomName === r.name)
        .map(g => (g.fromRoomName === r.name ? g.toRoomName : g.fromRoomName))
    };
  });

  const walls: Wall[] = generateWallsFromRoomPolygons(rooms);
  const openings: Opening[] = generateOpeningsFromRooms(rooms, walls);

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const r of rooms) {
    for (const p of r.polygon) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }

  const floorPlan: FloorPlan = {
    id: `fp-raster-${Date.now()}`,
    name: input.blueprintName || 'Architectural Floor Plan',
    walls,
    rooms,
    openings,
    scale: 16.5,
    bounds: {
      minX: Number(minX.toFixed(2)),
      minY: Number(minY.toFixed(2)),
      maxX: Number(maxX.toFixed(2)),
      maxY: Number(maxY.toFixed(2)),
      widthFeet: Number((maxX - minX).toFixed(2)),
      depthFeet: Number((maxY - minY).toFixed(2))
    },
    sourceDimensions: {
      widthFeet: Number((maxX - minX).toFixed(2)),
      depthFeet: Number((maxY - minY).toFixed(2))
    },
    unit: 'feet'
  };

  const validation = validateFloorPlanGeometry(floorPlan);

  return {
    floorPlan,
    validation,
    sourceType: 'raster_blueprint',
    detectedAnnotations: []
  };
}

/**
 * Deduplicates edges from room polygons into shared partition and exterior walls.
 */
export function generateWallsFromRoomPolygons(rooms: RoomPolygon[]): Wall[] {
  const walls: Wall[] = [];
  let wallIdx = 0;

  for (const room of rooms) {
    const poly = room.polygon;
    const n = poly.length;
    for (let i = 0; i < n - 1; i++) {
      const p1 = poly[i];
      const p2 = poly[i + 1];

      // Check if this segment already exists in reverse from adjacent room
      const existing = walls.find(
        w =>
          (Math.hypot(w.start.x - p2.x, w.start.y - p2.y) < 0.3 && Math.hypot(w.end.x - p1.x, w.end.y - p1.y) < 0.3) ||
          (Math.hypot(w.start.x - p1.x, w.start.y - p1.y) < 0.3 && Math.hypot(w.end.x - p2.x, w.end.y - p2.y) < 0.3)
      );

      if (!existing) {
        walls.push({
          id: `wall-${wallIdx++}`,
          start: { x: p1.x, y: p1.y },
          end: { x: p2.x, y: p2.y },
          thickness: 0.5,
          isExterior: true,
          height: 9.5,
          roomId: room.id
        });
      } else {
        // Shared partition wall between two rooms
        existing.thickness = 0.4;
        existing.isExterior = false;
      }
    }
  }

  return walls;
}

/**
 * Generates doors and windows along walls respecting topological connectivity.
 */
function generateOpeningsFromRooms(rooms: RoomPolygon[], walls: Wall[]): Opening[] {
  const openings: Opening[] = [];
  let opIdx = 0;

  for (const wall of walls) {
    const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    if (len < 3.5) continue;

    if (!wall.isExterior) {
      // Interior partition wall -> door opening
      openings.push({
        id: `op-door-${opIdx++}`,
        type: 'door',
        wallId: wall.id,
        position: 0.5,
        width: Math.min(3.5, len * 0.6),
        height: 7.0,
        doorType: len > 6 ? 'double' : 'standard'
      });
    } else {
      // Exterior wall -> window opening
      const room = rooms.find(r => r.id === wall.roomId);
      if (room && (room.role === 'living' || room.role === 'master_bed' || room.role === 'bedroom')) {
        openings.push({
          id: `op-win-${opIdx++}`,
          type: 'window',
          wallId: wall.id,
          position: 0.5,
          width: Math.min(5.0, len * 0.6),
          height: 4.5,
          elevation: 3.0
        });
      }
    }
  }

  return openings;
}

function inferRoomRole(name: string, width: number, depth: number): RoomPolygon['role'] {
  const lower = name.toLowerCase();
  if (lower.includes('living') || lower.includes('hall') || lower.includes('lounge')) return 'living';
  if (lower.includes('master') && lower.includes('bed')) return 'master_bed';
  if (lower.includes('bed')) return 'bedroom';
  if (lower.includes('kitchen') || lower.includes('cook')) return 'kitchen';
  if (lower.includes('bath') || lower.includes('toilet') || lower.includes('wc') || lower.includes('toi')) return 'bathroom';
  if (lower.includes('deck') || lower.includes('balcony') || lower.includes('terrace') || lower.includes('patio')) return 'balcony';
  if (lower.includes('store') || lower.includes('utility') || lower.includes('wash')) return 'store';
  if (lower.includes('dining')) return 'dining';
  if (lower.includes('study') || lower.includes('office')) return 'study';

  const area = width * depth;
  if (area >= 200) return 'living';
  if (area >= 90) return 'bedroom';
  if (area <= 45) return 'bathroom';
  return 'bedroom';
}
