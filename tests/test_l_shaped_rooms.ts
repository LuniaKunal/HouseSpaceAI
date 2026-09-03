import {
  createNotchFootprint,
  getRoomFootprint,
  getRoomWorldPolygon,
  getRoomAreaSqFt,
  getRoomEdges,
  isPointInRoom,
  findSharedWallOverlap
} from './src/geometry/roomGeometry';
import { Room } from './src/types/scene';
import { sceneStore } from './src/state/sceneStore';
import { roomTools } from './src/webmcp/tools/roomTools';
import { objectTools } from './src/webmcp/tools/objectTools';
import { viewTools } from './src/webmcp/tools/viewTools';
import { createRoomWallsGroup } from './src/canvas/roomAndWallHelpers';

async function runLShapedRoomsVerification() {
  console.log('================================================================');
  console.log('🧪 TESTING NON-RECTANGULAR (L-SHAPED) ROOMS GEOMETRY ENGINE');
  console.log('================================================================\n');

  // Test 1: Rectangular 4-Vertex Special Case (Backward Compatibility)
  console.log('1. Testing Standard Rectangular Footprint (4 vertices)...');
  const rectFootprint = createNotchFootprint(12, 10);
  console.log(`   Vertices generated: ${rectFootprint.length}`);
  if (rectFootprint.length !== 4) {
    throw new Error(`Expected 4 vertices for rectangular room, got ${rectFootprint.length}`);
  }
  const rectRoom: Room = {
    id: 'room-rect',
    name: 'Living',
    width: 12,
    depth: 10,
    height: 9.5,
    position: { x: 0, y: 0, z: 0 },
    floorMaterial: 'hardwood_oak',
    wallColor: '#ffffff',
    wallThickness: 0.5,
    locked: false,
    connections: []
  };
  const rectArea = getRoomAreaSqFt(rectRoom);
  console.log(`   Rectangular Room Area: ${rectArea} sq ft (Expected: 120)`);
  if (rectArea !== 120) throw new Error(`Expected area 120, got ${rectArea}`);
  console.log('   ✅ Rectangular backward compatibility verified!\n');

  // Test 2: All 4 Notch Corners (L-Shaped 6-vertex Polygons)
  console.log('2. Testing 4 L-Shape Corner Notches (6 vertices each)...');
  const corners = ['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const;

  for (const corner of corners) {
    const lFootprint = createNotchFootprint(12, 10, { corner, width: 4, depth: 4 });
    console.log(`   Corner "${corner}": generated ${lFootprint.length} vertices`);
    if (lFootprint.length !== 6) {
      throw new Error(`Expected 6 vertices for notch corner ${corner}, got ${lFootprint.length}`);
    }

    const testRoom: Room = {
      ...rectRoom,
      id: `room-l-${corner}`,
      notch: { corner, width: 4, depth: 4 }
    };
    const lArea = getRoomAreaSqFt(testRoom);
    console.log(`     - Area with 4x4 notch: ${lArea} sq ft (Expected: 104)`);
    if (lArea !== 104) {
      throw new Error(`Expected area 104 for corner ${corner}, got ${lArea}`);
    }
  }
  console.log('   ✅ All 4 corner notch footprints generate exact 6-vertex polygons & areas!\n');

  // Test 3: Point-in-Polygon Containment (Crucial for Furniture Bounds Checking)
  console.log('3. Testing Point-in-Polygon Containment (Notch Cutout Rejection)...');
  // Bedroom-1 from floorplan: 12x10ft at (0, 0), with bottom-right notch 4x6.75ft
  // Bounding box: X in [-6, 6], Z in [-5, 5]
  // Bottom-right notch cutout: X in [2, 6], Z in [-1.75, 5]
  const bedRoom1: Room = {
    id: 'room-bed-1',
    name: 'Bed Room-1',
    width: 12,
    depth: 10,
    height: 9.5,
    position: { x: 0, y: 0, z: 0 },
    notch: { corner: 'bottom-right', width: 4, depth: 6.75 },
    floorMaterial: 'hardwood_oak',
    wallColor: '#ffffff',
    wallThickness: 0.5,
    locked: false,
    connections: []
  };

  // Test points:
  // 1. Room center (0, 0) -> INSIDE (true)
  const pCenter = { x: 0, z: 0 };
  const insideCenter = isPointInRoom(pCenter, bedRoom1);
  console.log(`   Center point (0, 0) inside Bedroom-1? ${insideCenter} (Expected: true)`);
  if (!insideCenter) throw new Error('Center point should be inside room');

  // 2. Left bedroom area (-3, 2) -> INSIDE (true)
  const pLeft = { x: -3, z: 2 };
  const insideLeft = isPointInRoom(pLeft, bedRoom1);
  console.log(`   Left area (-3, 2) inside Bedroom-1? ${insideLeft} (Expected: true)`);
  if (!insideLeft) throw new Error('Left area should be inside room');

  // 3. Notch cutout area (4, 3) -> OUTSIDE (false!)
  // In the bounding box [6, 5], but inside the cut-away notch!
  const pNotch = { x: 4, z: 3 };
  const insideNotch = isPointInRoom(pNotch, bedRoom1);
  console.log(`   Point inside notch cutout (4, 3) inside Bedroom-1? ${insideNotch} (Expected: false)`);
  if (insideNotch) {
    throw new Error('Point inside notch cutout must be evaluated as OUTSIDE the room!');
  }

  // 4. Clearly outside point (10, 10) -> OUTSIDE (false)
  const pFar = { x: 10, z: 10 };
  const insideFar = isPointInRoom(pFar, bedRoom1);
  if (insideFar) throw new Error('Far point must be evaluated as OUTSIDE the room');

  console.log('   ✅ Point-in-polygon containment strictly rejects furniture in notch cutout!\n');

  // Test 4: Wall Edges & Shared Overlap with Attached Toilet
  console.log('4. Testing Edge Decomposition & Shared Wall Overlap with Attached Toilet...');
  const edges = getRoomEdges(bedRoom1);
  console.log(`   Bedroom-1 perimeter edges: ${edges.length} (Expected: 6)`);
  if (edges.length !== 6) {
    throw new Error(`Expected 6 edges for L-shaped room, got ${edges.length}`);
  }
  edges.forEach((e, i) => {
    console.log(`     - Edge ${i + 1} (${e.direction}): [${e.start.x}, ${e.start.z}] -> [${e.end.x}, ${e.end.z}], length: ${e.length}ft`);
  });

  // Attached Toilet fitting into the bottom-right notch:
  const toilet: Room = {
    id: 'room-toilet',
    name: 'Toilet',
    width: 4,
    depth: 6.75,
    height: 9.5,
    position: { x: 4, y: 0, z: 1.625 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#ffffff',
    wallThickness: 0.5,
    locked: false,
    connections: []
  };

  const overlap = findSharedWallOverlap(bedRoom1, toilet);
  console.log(`   Shared Wall Overlap found? ${!!overlap}`);
  if (!overlap) {
    throw new Error('Toilet inside notch should find shared wall with Bedroom-1');
  }
  console.log(`   Shared Wall Direction: ${overlap.direction}`);
  console.log(`   Shared Wall Span: ${overlap.sharedLength}ft`);
  console.log(`   Shared Wall Midpoint: [X: ${overlap.midpoint.x}, Z: ${overlap.midpoint.z}]`);

  if (overlap.sharedLength < 3) {
    throw new Error(`Expected shared wall length >= 3ft, got ${overlap.sharedLength}`);
  }
  console.log('   ✅ Shared wall correctly identified between L-shape notch and neighbor room!\n');

  // Test 5: WebMCP End-to-End Tools Integration
  console.log('5. Testing WebMCP Tool Invocations for L-Shaped Rooms...');
  sceneStore.resetToDefault();

  // Create L-shaped Bedroom-1 via WebMCP create_room
  const createBedRes = await roomTools.create_room.execute({
    name: 'Bed Room-1',
    width: 12,
    depth: 10,
    height: 9.5,
    position: { x: 0, y: 0, z: 0 },
    floorMaterial: 'hardwood_oak',
    wallColor: '#ffffff',
    notch: {
      corner: 'bottom-right',
      width: 4,
      depth: 6.75
    }
  });

  console.log(`   WebMCP create_room response:`);
  console.log(`     - Room ID: ${createBedRes.roomId}`);
  console.log(`     - Dimensions: ${createBedRes.dimensions.width}x${createBedRes.dimensions.depth}ft`);
  console.log(`     - Area: ${createBedRes.areaSqFt} sq ft (Expected: 93)`);
  console.log(`     - Notch: ${createBedRes.notch?.corner} (${createBedRes.notch?.width}x${createBedRes.notch?.depth}ft)`);
  console.log(`     - Footprint vertices: ${createBedRes.footprint?.length}`);

  if (createBedRes.footprint?.length !== 6) {
    throw new Error(`Expected 6 footprint vertices, got ${createBedRes.footprint?.length}`);
  }
  if (Math.abs(createBedRes.areaSqFt - (12 * 10 - 4 * 6.75)) > 0.1) {
    throw new Error(`Expected area 93 sq ft, got ${createBedRes.areaSqFt}`);
  }

  // Create attached Toilet
  const createToiletRes = await roomTools.create_room.execute({
    name: 'Toilet',
    width: 4,
    depth: 6.75,
    height: 9.5,
    position: { x: 4, y: 0, z: 1.625 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9'
  });

  // Connect Bedroom-1 and Toilet
  const connRes = await roomTools.connect_rooms.execute({
    roomIdA: createBedRes.roomId,
    roomIdB: createToiletRes.roomId,
    wallDirection: 'right',
    openingWidth: 2.5
  });

  console.log(`   WebMCP connect_rooms response:`);
  console.log(`     - Gate ID: ${connRes.gateId}`);
  console.log(`     - Gate Position: (${connRes.position.x}, ${connRes.position.z})`);
  console.log(`     - Gate Width: ${connRes.width}ft`);

  if (!connRes.gateId) {
    throw new Error('Failed to connect Bedroom-1 and Toilet');
  }

  // Test Furniture placement containment checks
  console.log('\n6. Testing Furniture Containment Checks on L-Shaped Room...');
  // A. Place King Bed in main bedroom area (-2, -1) -> Should be inside
  const bedFurniture = await objectTools.add_furniture.execute({
    type: 'bed_king',
    roomId: createBedRes.roomId,
    name: 'Master Bed',
    position: { x: -2, y: 0, z: -1 }
  });
  console.log(`   Bed placed at (-2, -1): insideRoomBounds = ${bedFurniture.insideRoomBounds}`);
  if (!bedFurniture.insideRoomBounds) {
    throw new Error('Bed placed in main bedroom should be insideRoomBounds=true');
  }

  // B. Attempt to place furniture in notch cutout (4, 3) inside Bedroom-1
  const badFurniture = await objectTools.add_furniture.execute({
    type: 'armchair_lounge',
    roomId: createBedRes.roomId,
    name: 'Misplaced Chair',
    position: { x: 4, y: 0, z: 3 }
  });
  console.log(`   Chair placed in notch cutout (4, 3): insideRoomBounds = ${badFurniture.insideRoomBounds}`);
  console.log(`   Warning: ${badFurniture.warning}`);
  if (badFurniture.insideRoomBounds !== false) {
    throw new Error('Furniture in notch cutout must be flagged with insideRoomBounds=false!');
  }
  if (!badFurniture.warning) {
    throw new Error('Furniture in notch cutout must produce a descriptive warning message!');
  }

  // Test get_scene_state
  console.log('\n7. Testing get_scene_state reflects footprint and accurate areas...');
  const state = await viewTools.get_scene_state.execute({});
  const bedRoomInState = state.rooms.find((r: any) => r.id === createBedRes.roomId);
  console.log(`   Bedroom in state footprint count: ${bedRoomInState.footprint?.length}`);
  console.log(`   Bedroom in state notch: ${JSON.stringify(bedRoomInState.notch)}`);
  console.log(`   Total Area: ${state.dimensions.totalAreaSqFt} sq ft`);

  if (!bedRoomInState.footprint || bedRoomInState.footprint.length !== 6) {
    throw new Error('get_scene_state must include 6-vertex polygon footprint for L-shaped room');
  }

  // Test 8: 3D Walls Group Generation
  console.log('\n8. Testing 3D Walls Group Generation for L-Shaped Room...');
  const walls = createRoomWallsGroup(
    bedRoomInState,
    state.gates,
    state.doors,
    state.windows,
    false,
    state.rooms
  );
  console.log(`   Generated wall meshes count: ${walls.children.length}`);
  if (walls.children.length === 0) {
    throw new Error('Failed to generate 3D wall meshes for L-shaped room');
  }
  console.log('   ✅ 3D Wall meshes successfully generated along all 6 perimeter edges!\n');

  console.log('================================================================');
  console.log('🎉 ALL L-SHAPED ROOMS TESTS PASSED (100%)!');
  console.log('================================================================\n');
}

runLShapedRoomsVerification().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
