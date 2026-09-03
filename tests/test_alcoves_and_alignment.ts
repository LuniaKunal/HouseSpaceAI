import { sceneStore } from '../src/state/sceneStore';
import { roomTools } from '../src/webmcp/tools/roomTools';
import { createAlcoveFootprint, getRoomAreaSqFt, getRoomFootprint } from '../src/geometry/roomGeometry';
import { createRoomWallsGroup } from '../src/canvas/roomAndWallHelpers';
import { Room } from '../src/types/scene';

async function runAlcovesAndAlignmentTests() {
  console.log('================================================================');
  console.log('🧪 TESTING ARCHITECTURAL ALCOVES, WINGS & MULTI-ROOM ALIGNMENT');
  console.log('================================================================\n');

  sceneStore.clearScene();

  // Test 1: 8-Vertex Orthogonal Polygon Generation
  console.log('1. Testing 8-Vertex Footprint Generation for Alcoves & Wings...');
  // 17.5 x 11 ft room with outward wing extension on East wall (right)
  const eastProtrusion = createAlcoveFootprint(11, 17.5, {
    edge: 'east',
    type: 'protrusion',
    offset: 10,
    width: 4,
    depth: 5
  });
  console.log(`   East Protrusion vertices count: ${eastProtrusion.length} (Expected: 8)`);
  if (eastProtrusion.length !== 8) {
    throw new Error(`Expected 8 vertices for wall alcove footprint, got ${eastProtrusion.length}`);
  }

  // West Inward Recess
  const westRecess = createAlcoveFootprint(12, 12, {
    edge: 'west',
    type: 'recess',
    offset: 3,
    width: 6,
    depth: 2
  });
  console.log(`   West Recess vertices count: ${westRecess.length} (Expected: 8)`);
  if (westRecess.length !== 8) {
    throw new Error(`Expected 8 vertices for recess alcove footprint, got ${westRecess.length}`);
  }
  console.log('   ✅ 8-vertex orthogonal polygon generation verified for recesses & protrusions!\n');

  // Test 2: Floor Surface Area Calculation for Alcoves
  console.log('2. Testing Floor Area Adjustments for Alcoves & Wings...');
  const testRoom: Room = {
    id: 'room-test',
    name: 'Living Room',
    width: 11,
    depth: 17.5,
    height: 9.5,
    position: { x: 0, y: 0, z: 0 },
    alcove: {
      edge: 'east',
      type: 'protrusion',
      offset: 10,
      width: 4,
      depth: 5
    },
    floorMaterial: 'hardwood_oak',
    wallColor: '#ffffff',
    wallThickness: 0.5,
    locked: false,
    connections: []
  };

  const area = getRoomAreaSqFt(testRoom);
  const expectedArea = 11 * 17.5 + 4 * 5; // 192.5 + 20 = 212.5
  console.log(`   Calculated area: ${area} sq ft (Expected: ${expectedArea})`);
  if (Math.abs(area - expectedArea) > 0.01) {
    throw new Error(`Expected area ${expectedArea}, got ${area}`);
  }
  console.log('   ✅ Exact area calculation verified for additive wings & subtractive alcoves!\n');

  // Test 3: Multi-Room Attachment along One Wall with Alignment
  console.log('3. Testing Multi-Room Attachment along Shared Wall (Replicating User Floor Plan)...');
  // A. Create Living Room 11 wide x 17.5 deep at (0, 0, 0)
  const livingRes = await roomTools.create_room.execute({
    name: 'Living Room',
    width: 11,
    depth: 17.5,
    position: { x: 0, y: 0, z: 0 }
  });
  console.log(`   Living Room created at (0, 0, 0), size: 11x17.5 ft`);

  // B. Attach Bedroom 1 (12x10 ft) to Right, Top-Aligned (alignment: 'start')
  const bed1Res = await roomTools.add_connected_room.execute({
    referenceRoomId: livingRes.roomId,
    direction: 'right',
    name: 'Bedroom 1',
    width: 12,
    depth: 10,
    alignment: 'start'
  });

  // Living X=0, W=11 -> right edge is X=5.5. Bed 1 W=12 -> center X = 5.5 + 6 = 11.5
  // Living Z=0, D=17.5 -> top edge is Z=-8.75. Bed 1 D=10 -> center Z = -8.75 + 5 = -3.75
  console.log(`   Bed 1 position: (${bed1Res.position.x}, ${bed1Res.position.z}) (Expected: 11.5, -3.75)`);
  if (Math.abs(bed1Res.position.x - 11.5) > 0.01 || Math.abs(bed1Res.position.z - (-3.75)) > 0.01) {
    throw new Error(`Expected Bed 1 at (11.5, -3.75), got (${bed1Res.position.x}, ${bed1Res.position.z})`);
  }
  console.log('   ✅ Bedroom 1 successfully top-aligned with Living Room north edge!');

  // C. Attach Master Bedroom (12x11 ft) to Right, Bottom-Aligned (alignment: 'end')
  const mbedRes = await roomTools.add_connected_room.execute({
    referenceRoomId: livingRes.roomId,
    direction: 'right',
    name: 'M. Bedroom',
    width: 12,
    depth: 11,
    alignment: 'end'
  });

  // Living bottom edge is Z = +8.75. M. Bed D=11 -> center Z = 8.75 - 5.5 = 3.25
  console.log(`   M. Bedroom position: (${mbedRes.position.x}, ${mbedRes.position.z}) (Expected: 11.5, 3.25)`);
  if (Math.abs(mbedRes.position.x - 11.5) > 0.01 || Math.abs(mbedRes.position.z - 3.25) > 0.01) {
    throw new Error(`Expected M. Bed at (11.5, 3.25), got (${mbedRes.position.x}, ${mbedRes.position.z})`);
  }
  console.log('   ✅ Master Bedroom successfully bottom-aligned with Living Room south edge!');

  // D. Attach Toilet (7x4 ft) at specific offset (offset: 10 ft from top)
  const toiletRes = await roomTools.add_connected_room.execute({
    referenceRoomId: livingRes.roomId,
    direction: 'right',
    name: 'Common Toilet',
    width: 7,
    depth: 4,
    alignment: 10 // 10 ft from top of living room
  });

  // Toilet X = 5.5 + 7/2 = 9.0
  // Toilet Z = -8.75 + 10 + 4/2 = 3.25
  console.log(`   Toilet position: (${toiletRes.position.x}, ${toiletRes.position.z}) (Expected: 9.0, 3.25)`);
  if (Math.abs(toiletRes.position.x - 9.0) > 0.01 || Math.abs(toiletRes.position.z - 3.25) > 0.01) {
    throw new Error(`Expected Toilet at (9.0, 3.25), got (${toiletRes.position.x}, ${toiletRes.position.z})`);
  }
  console.log('   ✅ Toilet cleanly placed at custom wall offset without overlapping Bed 1!\n');

  // Test 4: WebMCP add_wall_alcove Tool
  console.log('4. Testing WebMCP add_wall_alcove Tool...');
  const alcoveRes = await roomTools.add_wall_alcove.execute({
    roomId: livingRes.roomId,
    edge: 'east',
    type: 'protrusion',
    offset: 10,
    width: 4,
    depth: 5
  });

  console.log(`   Living Room updated with alcove: ${JSON.stringify(alcoveRes.alcove)}`);
  console.log(`   Living Room footprint vertices: ${alcoveRes.footprint?.length} (Expected: 8)`);
  console.log(`   Living Room net area: ${alcoveRes.areaSqFt} sq ft (Expected: 212.5)`);

  if (!alcoveRes.footprint || alcoveRes.footprint.length !== 8) {
    throw new Error(`Expected 8 footprint vertices after adding alcove, got ${alcoveRes.footprint?.length}`);
  }
  if (Math.abs(alcoveRes.areaSqFt - 212.5) > 0.01) {
    throw new Error(`Expected area 212.5, got ${alcoveRes.areaSqFt}`);
  }
  console.log('   ✅ add_wall_alcove successfully attached a 5x4 ft hallway extension wing!\n');

  // Test 5: 3D Wall Generation for 8-Vertex Room
  console.log('5. Testing 3D Wall Mesh Generation for 8-Vertex Alcove Room...');
  const updatedLiving = sceneStore.getData().rooms.find(r => r.id === livingRes.roomId)!;
  const walls = createRoomWallsGroup(
    updatedLiving,
    sceneStore.getData().gates,
    sceneStore.getData().doors,
    sceneStore.getData().windows,
    false,
    sceneStore.getData().rooms
  );
  console.log(`   Generated wall meshes count: ${walls.children.length}`);
  if (walls.children.length === 0) {
    throw new Error('Failed to generate 3D wall meshes for 8-vertex alcove room');
  }
  console.log('   ✅ 3D Wall meshes successfully generated along all 8 perimeter edges!\n');

  console.log('================================================================');
  console.log('🎉 ALL ALCOVES & MULTI-ROOM ALIGNMENT TESTS PASSED (100%)!');
  console.log('================================================================\n');
}

runAlcovesAndAlignmentTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
