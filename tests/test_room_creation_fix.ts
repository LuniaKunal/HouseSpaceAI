import { sceneStore } from './src/state/sceneStore';
import { uiStore } from './src/state/uiStore';
import { executeWebMCPTool } from './src/webmcp/registry';

async function runTests() {
  console.log('=== TEST: Room Creation & Addition Fix Verification ===\n');

  // 1. Start from clean state (0 rooms)
  sceneStore.clearScene();
  let data = sceneStore.getData();
  console.log(`Initial state: ${data.rooms.length} rooms`);
  if (data.rooms.length !== 0) {
    throw new Error('Expected 0 rooms after clearScene');
  }

  // 2. Create primary room (Standalone / Initial at origin 0,0)
  console.log('\n--- Step 1: Create Primary Room in Empty Scene ---');
  const primaryRoom = sceneStore.createRoom({
    name: 'Living Room',
    width: 18,
    depth: 16,
    position: { x: 0, y: 0, z: 0 },
    floorMaterial: 'hardwood_oak'
  });
  uiStore.setSelected(primaryRoom.id, 'room');

  data = sceneStore.getData();
  console.log(`Created: "${primaryRoom.name}" (ID: ${primaryRoom.id}) at (${primaryRoom.position.x}, ${primaryRoom.position.z})`);
  console.log(`Total rooms now: ${data.rooms.length}`);
  if (data.rooms.length !== 1) throw new Error('Expected 1 room');
  if (primaryRoom.width !== 18 || primaryRoom.depth !== 16) throw new Error('Primary room dimensions mismatch');

  // 3. Create connected room attached to the primary room (Direction: Right)
  console.log('\n--- Step 2: Create Connected Room (Right of Living Room) ---');
  const connectedRoom = sceneStore.addConnectedRoom(
    primaryRoom.id,
    'right',
    'Kitchen',
    12,
    10,
    'ceramic_tile'
  );
  if (!connectedRoom) throw new Error('Failed to create connected room');
  uiStore.setSelected(connectedRoom.id, 'room');

  data = sceneStore.getData();
  console.log(`Created: "${connectedRoom.name}" at (${connectedRoom.position.x}, ${connectedRoom.position.z})`);
  console.log(`Total rooms now: ${data.rooms.length}`);
  console.log(`Total gates now: ${data.gates.length}`);

  // Target X should be ref.x + ref.w/2 + w/2 = 0 + 9 + 6 = 15
  if (connectedRoom.position.x !== 15) {
    throw new Error(`Expected connected room X=15, got ${connectedRoom.position.x}`);
  }
  if (data.gates.length !== 1) {
    throw new Error(`Expected 1 doorway gate connecting the rooms, got ${data.gates.length}`);
  }

  // 4. Create standalone room (offset to prevent overlap)
  console.log('\n--- Step 3: Create Standalone Room (Independent Position) ---');
  const maxX = Math.max(...data.rooms.map(r => r.position.x + r.width / 2)); // Kitchen right edge: 15 + 6 = 21
  const w = 14;
  const d = 12;
  const posX = Math.round(maxX + w / 2 + 2); // 21 + 7 + 2 = 30

  const standaloneRoom = sceneStore.createRoom({
    name: 'Garden Studio',
    width: w,
    depth: d,
    position: { x: posX, y: 0, z: 0 },
    floorMaterial: 'concrete_polished'
  });
  uiStore.setSelected(standaloneRoom.id, 'room');

  data = sceneStore.getData();
  console.log(`Created: "${standaloneRoom.name}" at (${standaloneRoom.position.x}, ${standaloneRoom.position.z})`);
  console.log(`Total rooms now: ${data.rooms.length}`);
  if (data.rooms.length !== 3) throw new Error('Expected 3 rooms');

  // Verify no overlap
  const kitchenRight = connectedRoom.position.x + connectedRoom.width / 2;
  const studioLeft = standaloneRoom.position.x - standaloneRoom.width / 2;
  console.log(`Gap between Kitchen (${kitchenRight}ft) and Garden Studio (${studioLeft}ft): ${studioLeft - kitchenRight}ft`);
  if (studioLeft <= kitchenRight) {
    throw new Error('Standalone room overlaps with Kitchen');
  }

  // 5. Test undo & redo
  console.log('\n--- Step 4: Test Undo & Redo on Room Creation ---');
  const undoResult = sceneStore.undo();
  console.log(`Undo result: ${undoResult}`);
  data = sceneStore.getData();
  console.log(`Rooms after undo: ${data.rooms.length}`);
  if (data.rooms.length !== 2) throw new Error('Expected 2 rooms after undo');

  const redoResult = sceneStore.redo();
  console.log(`Redo result: ${redoResult}`);
  data = sceneStore.getData();
  console.log(`Rooms after redo: ${data.rooms.length}`);
  if (data.rooms.length !== 3) throw new Error('Expected 3 rooms after redo');

  console.log('\n🎉 ALL ROOM CREATION & ADDITION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
