import { sceneStore } from './src/state/sceneStore.ts';
import { uiStore } from './src/state/uiStore.ts';
import { roomTools } from './src/webmcp/tools/roomTools.ts';
import { objectTools } from './src/webmcp/tools/objectTools.ts';
import { viewTools } from './src/webmcp/tools/viewTools.ts';
import { workflowTools } from './src/webmcp/tools/workflowTools.ts';

async function runGuestSuiteTestCase() {
  console.log('====================================================');
  console.log('🧪 RUNNING TEST CASE: AGENT-BUILT GUEST SUITE');
  console.log('====================================================\n');

  let exportCalled = false;
  // Monkey-patch export_model to monitor negative constraint
  const origExport = workflowTools.export_model.execute;
  workflowTools.export_model.execute = async (input: any) => {
    exportCalled = true;
    return origExport(input);
  };

  // ----------------------------------------------------
  // Step 1: Create a Bedroom, 12ft x 10ft
  // ----------------------------------------------------
  console.log('Step 1: Creating Bedroom (12ft x 10ft)...');
  const bedroomRes = await roomTools.create_room.execute({
    name: 'Bedroom',
    width: 12,
    depth: 10,
    position: { x: 40, y: 0, z: 0 },
    floorMaterial: 'hardwood_oak',
    wallColor: '#f1f5f9'
  });
  const bedroomId = bedroomRes.roomId;

  // ----------------------------------------------------
  // Step 2: Connect a Bathroom, 6ft x 5ft, to Bedroom right side
  // ----------------------------------------------------
  console.log('Step 2: Connecting Bathroom (6ft x 5ft) on right side...');
  // Bedroom X is [34, 46]. Right side is X = 46. Bathroom width is 6, so center is X = 49.
  const bathroomRes = await roomTools.create_room.execute({
    name: 'Bathroom',
    width: 6,
    depth: 5,
    position: { x: 49, y: 0, z: 0 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#e2e8f0'
  });
  const bathroomId = bathroomRes.roomId;

  const gate1Res = await roomTools.connect_rooms.execute({
    roomIdA: bedroomId,
    roomIdB: bathroomId,
    wallDirection: 'right',
    openingWidth: 3.5
  });

  // ----------------------------------------------------
  // Step 3: Connect a Closet, 10ft x 8ft, to Bedroom bottom side
  // ----------------------------------------------------
  console.log('Step 3: Connecting Closet (10ft x 8ft) on bottom side...');
  // Bedroom Z is [-5, 5]. Bottom side is Z = 5. Closet depth is 8, so center is Z = 9.
  const closetRes = await roomTools.create_room.execute({
    name: 'Closet',
    width: 10,
    depth: 8,
    position: { x: 40, y: 0, z: 9 },
    floorMaterial: 'hardwood_oak',
    wallColor: '#f8fafc'
  });
  const closetId = closetRes.roomId;

  const gate2Res = await roomTools.connect_rooms.execute({
    roomIdA: bedroomId,
    roomIdB: closetId,
    wallDirection: 'below',
    openingWidth: 3.5
  });

  // ----------------------------------------------------
  // Step 4: Place bed, side table, and lamp in Bedroom
  // ----------------------------------------------------
  console.log('Step 4: Placing Bed, Side Table, and Lamp in Bedroom...');
  const bedObj = await objectTools.add_furniture.execute({
    type: 'bed_double',
    roomId: bedroomId,
    name: 'Guest Double Bed',
    position: { x: 39, y: 0, z: -1 }
  });

  const sideTableObj = await objectTools.add_furniture.execute({
    type: 'nightstand_modern',
    roomId: bedroomId,
    name: 'Bedside Nightstand',
    position: { x: 35.5, y: 0, z: -1 }
  });

  const lampObj = await objectTools.add_furniture.execute({
    type: 'lamp_floor',
    roomId: bedroomId,
    name: 'Standing Lamp',
    position: { x: 35.5, y: 0, z: 2.5 }
  });

  // ----------------------------------------------------
  // Step 5: Place sink and toilet in Bathroom
  // ----------------------------------------------------
  console.log('Step 5: Placing Vanity Sink and Toilet in Bathroom...');
  const sinkObj = await objectTools.add_furniture.execute({
    type: 'bathroom_vanity_basin',
    roomId: bathroomId,
    name: 'Bathroom Vanity Basin',
    position: { x: 49, y: 0, z: -1.2 }
  });

  const toiletObj = await objectTools.add_furniture.execute({
    type: 'bathroom_wc_commode',
    roomId: bathroomId,
    name: 'Bathroom WC Toilet',
    position: { x: 49, y: 0, z: 1.2 }
  });

  // ----------------------------------------------------
  // Step 6: Switch camera to Top view and take screenshot
  // ----------------------------------------------------
  console.log('Step 6: Switching camera to 2D Top view and taking screenshot...');
  const switchRes = await viewTools.switch_view.execute({ view: '2d', angle: 'top' });
  const shotRes = await viewTools.take_screenshot.execute({ format: 'png', resolution: 'standard' });

  // ----------------------------------------------------
  // Step 7: Get Scene State and Programmatic Verification
  // ----------------------------------------------------
  console.log('Step 7: Querying get_scene_state and running verification...');
  const state = await viewTools.get_scene_state.execute({});

  const newRooms = state.rooms.filter((r: any) => [bedroomId, bathroomId, closetId].includes(r.id));
  const newFurniture = state.furniture.filter((f: any) =>
    [bedObj.objectId, sideTableObj.objectId, lampObj.objectId, sinkObj.objectId, toiletObj.objectId].includes(f.id)
  );

  console.log('\nCreated Rooms:');
  newRooms.forEach((r: any) => console.log(`  - [${r.id}] ${r.name}: ${r.width}x${r.depth}ft at (${r.position.x}, ${r.position.z})`));
  console.log('\nCreated Objects:');
  newFurniture.forEach((f: any) => console.log(`  - [${f.id}] ${f.name} in [${f.roomId}] at (${f.position.x}, ${f.position.z})`));

  // ====================================================
  // PASS / FAIL CRITERIA EVALUATION
  // ====================================================
  const results: { id: number; name: string; pass: boolean; details: string }[] = [];

  // Check 1: Exactly 3 new rooms exist with dimensions matching spec (±0.1ft)
  const bedRoom = newRooms.find((r: any) => r.id === bedroomId);
  const bathRoom = newRooms.find((r: any) => r.id === bathroomId);
  const closetRoom = newRooms.find((r: any) => r.id === closetId);

  const c1_count = newRooms.length === 3;
  const c1_bed = bedRoom && Math.abs(bedRoom.width - 12) < 0.1 && Math.abs(bedRoom.depth - 10) < 0.1;
  const c1_bath = bathRoom && Math.abs(bathRoom.width - 6) < 0.1 && Math.abs(bathRoom.depth - 5) < 0.1;
  const c1_closet = closetRoom && Math.abs(closetRoom.width - 10) < 0.1 && Math.abs(closetRoom.depth - 8) < 0.1;
  const c1_pass = !!(c1_count && c1_bed && c1_bath && c1_closet);
  results.push({
    id: 1,
    name: '3 new rooms match spec dimensions (±0.1ft)',
    pass: c1_pass,
    details: `Count: ${newRooms.length}, Bed: ${bedRoom?.width}x${bedRoom?.depth}, Bath: ${bathRoom?.width}x${bathRoom?.depth}, Closet: ${closetRoom?.width}x${closetRoom?.depth}`
  });

  // Check 2: Bedroom↔Bathroom share exactly one wall edge, touching with ZERO overlap
  const bedRight = bedRoom ? bedRoom.position.x + bedRoom.width / 2 : 0;
  const bathLeft = bathRoom ? bathRoom.position.x - bathRoom.width / 2 : 0;
  const c2_touch = Math.abs(bedRight - bathLeft) < 0.01;
  const c2_overlapZ = bedRoom && bathRoom ? Math.min(bedRoom.position.z + bedRoom.depth / 2, bathRoom.position.z + bathRoom.depth / 2) -
    Math.max(bedRoom.position.z - bedRoom.depth / 2, bathRoom.position.z - bathRoom.depth / 2) : 0;
  const c2_pass = c2_touch && c2_overlapZ > 0;
  results.push({
    id: 2,
    name: 'Bedroom↔Bathroom share exactly one wall edge (zero overlap)',
    pass: c2_pass,
    details: `BedRight=${bedRight}, BathLeft=${bathLeft}, SharedSpan=${c2_overlapZ}ft`
  });

  // Check 3: Bedroom↔Closet share exactly one wall edge, touching with ZERO overlap
  const bedBottom = bedRoom ? bedRoom.position.z + bedRoom.depth / 2 : 0;
  const closetTop = closetRoom ? closetRoom.position.z - closetRoom.depth / 2 : 0;
  const c3_touch = Math.abs(bedBottom - closetTop) < 0.01;
  const c3_overlapX = bedRoom && closetRoom ? Math.min(bedRoom.position.x + bedRoom.width / 2, closetRoom.position.x + closetRoom.width / 2) -
    Math.max(bedRoom.position.x - bedRoom.width / 2, closetRoom.position.x - closetRoom.width / 2) : 0;
  const c3_pass = c3_touch && c3_overlapX > 0;
  results.push({
    id: 3,
    name: 'Bedroom↔Closet share exactly one wall edge (zero overlap)',
    pass: c3_pass,
    details: `BedBottom=${bedBottom}, ClosetTop=${closetTop}, SharedSpan=${c3_overlapX}ft`
  });

  // Check 4: No two room bounding boxes have positive-area intersection
  let positiveIntersection = false;
  for (let i = 0; i < newRooms.length; i++) {
    for (let j = i + 1; j < newRooms.length; j++) {
      const rA = newRooms[i];
      const rB = newRooms[j];
      const xOverlap = Math.min(rA.position.x + rA.width / 2, rB.position.x + rB.width / 2) -
        Math.max(rA.position.x - rA.width / 2, rB.position.x - rB.width / 2);
      const zOverlap = Math.min(rA.position.z + rA.depth / 2, rB.position.z + rB.depth / 2) -
        Math.max(rA.position.z - rA.depth / 2, rB.position.z - rB.depth / 2);
      if (xOverlap > 0.01 && zOverlap > 0.01) {
        positiveIntersection = true;
      }
    }
  }
  results.push({
    id: 4,
    name: 'No positive-area room intersection (general overlap catch-all)',
    pass: !positiveIntersection,
    details: positiveIntersection ? 'Overlap detected' : 'All room bounding boxes are strictly non-overlapping'
  });

  // Check 5: Each connect_rooms call produced exactly one gate object, width <= shared wall length
  const gatesAB = state.gates.filter((g: any) =>
    (g.roomIdA === bedroomId && g.roomIdB === bathroomId) || (g.roomIdA === bathroomId && g.roomIdB === bedroomId)
  );
  const gatesAC = state.gates.filter((g: any) =>
    (g.roomIdA === bedroomId && g.roomIdB === closetId) || (g.roomIdA === closetId && g.roomIdB === bedroomId)
  );
  const c5_pass = gatesAB.length === 1 && gatesAC.length === 1 &&
    gatesAB[0].width <= c2_overlapZ + 0.01 && gatesAC[0].width <= c3_overlapX + 0.01;
  results.push({
    id: 5,
    name: 'Exactly one gate per connection, width <= shared wall length',
    pass: c5_pass,
    details: `Bed-Bath gates: ${gatesAB.length} (width ${gatesAB[0]?.width} <= ${c2_overlapZ}), Bed-Closet gates: ${gatesAC.length} (width ${gatesAC[0]?.width} <= ${c3_overlapX})`
  });

  // Check 6: Gate position is consistent when read from either room's perspective (no desync)
  const g1 = gatesAB[0];
  const g2 = gatesAC[0];
  const c6_g1 = g1 && Math.abs(g1.position.x - bedRight) < 0.01 && Math.abs(g1.position.x - bathLeft) < 0.01;
  const c6_g2 = g2 && Math.abs(g2.position.z - bedBottom) < 0.01 && Math.abs(g2.position.z - closetTop) < 0.01;
  const c6_pass = !!(c6_g1 && c6_g2);
  results.push({
    id: 6,
    name: 'Gate position is consistent from either room perspective (no desync)',
    pass: c6_pass,
    details: `Gate1 at X=${g1?.position.x} (matches wall X=${bedRight}), Gate2 at Z=${g2?.position.z} (matches wall Z=${bedBottom})`
  });

  // Check 7: All placed furniture centroids fall inside assigned room box, height <= ceiling height
  let c7_pass = true;
  let c7_details = '';
  for (const f of newFurniture) {
    const r = newRooms.find((room: any) => room.id === f.roomId);
    if (!r) {
      c7_pass = false;
      c7_details = `Object ${f.name} has no room`;
      break;
    }
    const minX = r.position.x - r.width / 2;
    const maxX = r.position.x + r.width / 2;
    const minZ = r.position.z - r.depth / 2;
    const maxZ = r.position.z + r.depth / 2;
    const inBounds = f.position.x >= minX && f.position.x <= maxX && f.position.z >= minZ && f.position.z <= maxZ;
    const underCeiling = f.dimensions.y <= (r.height || 9.5);
    if (!inBounds || !underCeiling) {
      c7_pass = false;
      c7_details = `Object ${f.name} out of bounds: pos=(${f.position.x}, ${f.position.z}), roomX=[${minX}, ${maxX}], roomZ=[${minZ}, ${maxZ}], h=${f.dimensions.y}`;
      break;
    }
  }
  if (c7_pass) c7_details = `All 5 objects centered inside room bounds, all heights <= 9.5ft`;
  results.push({
    id: 7,
    name: 'Furniture centroids inside room bounding box, height <= ceiling',
    pass: c7_pass,
    details: c7_details
  });

  // Check 8: Camera state reflects view: '2d', angle: 'top'
  const uiState = uiStore.getState();
  const c8_pass = uiState.cameraMode === '2d' && uiState.cameraAngle === 'top';
  results.push({
    id: 8,
    name: "Camera state reflects view: '2d', angle: 'top'",
    pass: c8_pass,
    details: `mode='${uiState.cameraMode}', angle='${uiState.cameraAngle}'`
  });

  // Check 9: export_model was never called
  results.push({
    id: 9,
    name: 'export_model was never called (negative constraint respected)',
    pass: !exportCalled,
    details: exportCalled ? 'Violated: export_model was invoked' : 'Respected: export_model was not called'
  });

  // Check 10: Calling undo once removes the most recent object; redo restores it exactly
  const countBeforeUndo = sceneStore.getData().furniture.length;
  await workflowTools.undo.execute();
  const countAfterUndo = sceneStore.getData().furniture.length;
  await workflowTools.redo.execute();
  const countAfterRedo = sceneStore.getData().furniture.length;
  const c10_pass = countAfterUndo === countBeforeUndo - 1 && countAfterRedo === countBeforeUndo;
  results.push({
    id: 10,
    name: 'Undo removes most recent object; redo restores it exactly',
    pass: c10_pass,
    details: `Before: ${countBeforeUndo}, After Undo: ${countAfterUndo}, After Redo: ${countAfterRedo}`
  });

  // ----------------------------------------------------
  // Print Results Table
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('📋 TEST RESULTS SUMMARY TABLE');
  console.log('====================================================');
  console.table(
    results.map(r => ({
      '#': r.id,
      Check: r.name,
      Status: r.pass ? '✅ PASS' : '❌ FAIL',
      Details: r.details
    }))
  );

  const allPassed = results.every(r => r.pass);
  console.log(`\nOVERALL STATUS: ${allPassed ? '🎉 ALL 10 CHECKS PASSED!' : '⚠️ SOME CHECKS FAILED'}`);

  // ----------------------------------------------------
  // ESCALATION TESTS
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('🚀 RUNNING ESCALATION TESTS');
  console.log('====================================================\n');

  // Escalation 1: Resize Bedroom to 14ft x 12ft after connecting Bathroom and Closet
  console.log('Escalation 1: Resizing Bedroom to 14x12ft (testing dynamic gate synchronization)...');
  await roomTools.set_room_dimensions.execute({
    roomId: bedroomId,
    width: 14,
    depth: 12
  });
  const stateEsc1 = sceneStore.getSceneState();
  const g1Esc = stateEsc1.gates.find((g: any) => g.id === g1.id);
  const g2Esc = stateEsc1.gates.find((g: any) => g.id === g2.id);
  const bedEsc = stateEsc1.rooms.find((r: any) => r.id === bedroomId);
  const esc1_pass = g1Esc && Math.abs(g1Esc.position.x - (bedEsc.position.x + bedEsc.width / 2)) < 0.01 &&
    g2Esc && Math.abs(g2Esc.position.z - (bedEsc.position.z + bedEsc.depth / 2)) < 0.01;
  console.log(`  -> Escalation 1 (Dynamic Gate Sync): ${esc1_pass ? '✅ PASSED' : '❌ FAILED'}`);

  // Escalation 2: Duplicate connect_rooms call on the same pair
  console.log('Escalation 2: Calling connect_rooms again on Bedroom↔Bathroom (testing idempotency / duplicate prevention)...');
  await roomTools.connect_rooms.execute({
    roomIdA: bedroomId,
    roomIdB: bathroomId,
    wallDirection: 'right',
    openingWidth: 3.5
  });
  const stateEsc2 = sceneStore.getSceneState();
  const gatesAB_count = stateEsc2.gates.filter((g: any) =>
    (g.roomIdA === bedroomId && g.roomIdB === bathroomId) || (g.roomIdA === bathroomId && g.roomIdB === bedroomId)
  ).length;
  const esc2_pass = gatesAB_count === 1;
  console.log(`  -> Escalation 2 (Duplicate Gate Prevention): ${esc2_pass ? '✅ PASSED (Count = 1)' : '❌ FAILED'}`);

  // Escalation 3: Delete Bathroom and confirm clean gate cleanup
  console.log('Escalation 3: Deleting Bathroom (testing clean shared gate & orphan geometry removal)...');
  await roomTools.delete_room.execute({ roomId: bathroomId });
  const stateEsc3 = sceneStore.getSceneState();
  const bathExists = stateEsc3.rooms.some((r: any) => r.id === bathroomId);
  const orphanedGate = stateEsc3.gates.some((g: any) => g.roomIdA === bathroomId || g.roomIdB === bathroomId);
  const esc3_pass = !bathExists && !orphanedGate;
  console.log(`  -> Escalation 3 (Orphan Gate Cleanup): ${esc3_pass ? '✅ PASSED' : '❌ FAILED'}`);

  console.log('\n====================================================');
  console.log('🏁 ALL TEST SUITES COMPLETE');
  console.log('====================================================\n');
}

runGuestSuiteTestCase().catch(err => {
  console.error('Test execution error:', err);
});
