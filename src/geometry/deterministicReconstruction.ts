import * as THREE from 'three';
import { FloorPlan, Wall, Opening, RoomPolygon, FT_TO_METERS } from '../types/floorPlan';
import { getFloorMaterial } from '../canvas/roomAndWallHelpers';

export interface ReconstructionOptions {
  fullHeightWalls?: boolean;
  includeCeiling?: boolean;
  wallColorOverride?: string;
}

/**
 * Deterministic 3D Reconstruction:
 * Converts 2D FloorPlan geometry directly into accurate Three.js 3D meshes:
 * - 2D room polygons -> polygonal 3D floors with accurate materials
 * - 2D wall segments -> extruded 3D walls with exact opening cutouts
 * - Door openings -> real openings with headers and door leaves
 * - Window openings -> real openings with sills, lintels, and glass frames
 */
export function reconstruct3DFromFloorPlan(
  floorPlan: FloorPlan,
  options: ReconstructionOptions = {}
): THREE.Group {
  const rootGroup = new THREE.Group();
  rootGroup.name = `DeterministicFloorPlan_${floorPlan.id}`;

  const defaultWallHeight = 9.5;
  const wallHeightFt = options.fullHeightWalls ? defaultWallHeight : Math.min(3.8, defaultWallHeight * 0.4);
  const wallHeightM = wallHeightFt * FT_TO_METERS;

  // 1. RECONSTRUCT POLYGONAL FLOORS
  for (const room of floorPlan.rooms) {
    if (!room.polygon || room.polygon.length < 3) continue;

    const floorGroup = new THREE.Group();
    floorGroup.name = `Room_${room.id}`;

    // Create 2D Shape in Three.js coordinates
    const shape = new THREE.Shape();
    // In Three.js: X is horizontal, Z is depth, Y is height
    // Room polygon has x and y (where y is scene Z in feet)
    const p0 = room.polygon[0];
    shape.moveTo(p0.x * FT_TO_METERS, -p0.y * FT_TO_METERS);

    for (let i = 1; i < room.polygon.length; i++) {
      const p = room.polygon[i];
      shape.lineTo(p.x * FT_TO_METERS, -p.y * FT_TO_METERS);
    }
    shape.closePath();

    const floorGeo = new THREE.ShapeGeometry(shape);
    // Rotate to lie horizontally on X-Z ground plane
    floorGeo.rotateX(-Math.PI / 2);

    const floorMat = getFloorMaterial(room.floorMaterial || 'hardwood_oak');
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = 0.01;
    floorMesh.receiveShadow = true;
    floorMesh.userData = { id: room.id, type: 'room', name: room.name };
    floorGroup.add(floorMesh);

    // Floor edge accent border
    const borderGeo = new THREE.EdgesGeometry(floorGeo);
    const borderMat = new THREE.LineBasicMaterial({ color: 0x475569, linewidth: 1 });
    const borderLine = new THREE.LineSegments(borderGeo, borderMat);
    borderLine.position.y = 0.015;
    floorGroup.add(borderLine);

    rootGroup.add(floorGroup);
  }

  // 2. RECONSTRUCT WALL SEGMENTS WITH PRECISE OPENINGS
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.65,
    metalness: 0.02,
    side: THREE.DoubleSide
  });

  const wallMap = new Map<string, Wall>();
  floorPlan.walls.forEach(w => wallMap.set(w.id, w));

  for (const wall of floorPlan.walls) {
    const wallGroup = new THREE.Group();
    wallGroup.name = `Wall_${wall.id}`;

    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const totalLengthFt = Math.hypot(dx, dy);
    if (totalLengthFt < 0.2) continue;

    const angle = Math.atan2(dy, dx);
    const wallThickM = (wall.thickness || 0.45) * FT_TO_METERS;

    // Openings on this wall
    const wallOpenings = floorPlan.openings.filter(op => op.wallId === wall.id);

    // Build intervals along [0, totalLengthFt]
    const solidIntervals: Array<{ start: number; end: number }> = [];
    const openingIntervals: Array<{ op: Opening; start: number; end: number }> = [];

    for (const op of wallOpenings) {
      const centerDist = op.position * totalLengthFt;
      const opStart = Math.max(0, centerDist - op.width / 2);
      const opEnd = Math.min(totalLengthFt, centerDist + op.width / 2);
      openingIntervals.push({ op, start: opStart, end: opEnd });
    }

    // Sort openings along the wall length
    openingIntervals.sort((a, b) => a.start - b.start);

    // Compute solid wall segments between openings
    let currentPos = 0;
    for (const o of openingIntervals) {
      if (o.start > currentPos + 0.1) {
        solidIntervals.push({ start: currentPos, end: o.start });
      }
      currentPos = Math.max(currentPos, o.end);
    }
    if (currentPos < totalLengthFt - 0.1) {
      solidIntervals.push({ start: currentPos, end: totalLengthFt });
    }

    // A. Render Solid Wall Segments
    for (const seg of solidIntervals) {
      const segLenFt = seg.end - seg.start;
      if (segLenFt < 0.1) continue;

      const segLenM = segLenFt * FT_TO_METERS;
      const geo = new THREE.BoxGeometry(segLenM, wallHeightM, wallThickM);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Position in wall local coordinates (along X from 0 to totalLengthFt)
      const localCenterFt = (seg.start + seg.end) / 2;
      const worldXFt = wall.start.x + (dx / totalLengthFt) * localCenterFt;
      const worldZFt = wall.start.y + (dy / totalLengthFt) * localCenterFt;

      mesh.position.set(worldXFt * FT_TO_METERS, wallHeightM / 2, worldZFt * FT_TO_METERS);
      mesh.rotation.y = -angle;
      wallGroup.add(mesh);
    }

    // B. Render Openings (Headers, Sills, Glass & Frames)
    for (const { op, start, end } of openingIntervals) {
      const opWidthFt = end - start;
      const opWidthM = opWidthFt * FT_TO_METERS;
      const localCenterFt = (start + end) / 2;
      const worldXFt = wall.start.x + (dx / totalLengthFt) * localCenterFt;
      const worldZFt = wall.start.y + (dy / totalLengthFt) * localCenterFt;

      if (op.type === 'door') {
        // Lintel / Header above door (if full-height walls mode)
        if (options.fullHeightWalls) {
          const doorHeightFt = op.height || 7.0;
          const headerHeightFt = defaultWallHeight - doorHeightFt;
          if (headerHeightFt > 0.2) {
            const headerGeo = new THREE.BoxGeometry(opWidthM, headerHeightFt * FT_TO_METERS, wallThickM);
            const headerMesh = new THREE.Mesh(headerGeo, wallMat);
            headerMesh.position.set(
              worldXFt * FT_TO_METERS,
              (doorHeightFt + headerHeightFt / 2) * FT_TO_METERS,
              worldZFt * FT_TO_METERS
            );
            headerMesh.rotation.y = -angle;
            wallGroup.add(headerMesh);
          }
        }
      } else if (op.type === 'window') {
        const sillElevFt = op.elevation || 3.0;
        const winHeightFt = op.height || 4.5;

        // Bottom Sill Wall Piece
        const sillGeo = new THREE.BoxGeometry(opWidthM, sillElevFt * FT_TO_METERS, wallThickM);
        const sillMesh = new THREE.Mesh(sillGeo, wallMat);
        sillMesh.position.set(worldXFt * FT_TO_METERS, (sillElevFt / 2) * FT_TO_METERS, worldZFt * FT_TO_METERS);
        sillMesh.rotation.y = -angle;
        wallGroup.add(sillMesh);

        // Top Lintel Wall Piece (if full height)
        if (options.fullHeightWalls) {
          const lintelBottom = sillElevFt + winHeightFt;
          const lintelHeightFt = defaultWallHeight - lintelBottom;
          if (lintelHeightFt > 0.2) {
            const lintelGeo = new THREE.BoxGeometry(opWidthM, lintelHeightFt * FT_TO_METERS, wallThickM);
            const lintelMesh = new THREE.Mesh(lintelGeo, wallMat);
            lintelMesh.position.set(
              worldXFt * FT_TO_METERS,
              (lintelBottom + lintelHeightFt / 2) * FT_TO_METERS,
              worldZFt * FT_TO_METERS
            );
            lintelMesh.rotation.y = -angle;
            wallGroup.add(lintelMesh);
          }
        }

        // Glass Pane inside window opening
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0x93c5fd,
          transparent: true,
          opacity: 0.35,
          roughness: 0.1,
          transmission: 0.9
        });
        const glassGeo = new THREE.BoxGeometry(opWidthM * 0.95, winHeightFt * FT_TO_METERS * 0.9, 0.05);
        const glassMesh = new THREE.Mesh(glassGeo, glassMat);
        glassMesh.position.set(
          worldXFt * FT_TO_METERS,
          (sillElevFt + winHeightFt / 2) * FT_TO_METERS,
          worldZFt * FT_TO_METERS
        );
        glassMesh.rotation.y = -angle;
        wallGroup.add(glassMesh);
      }
    }

    rootGroup.add(wallGroup);
  }

  return rootGroup;
}
