import { projectStore } from '../src/state/projectStore';
import { sceneStore } from '../src/state/sceneStore';
import { ALL_TOOLS, executeWebMCPTool } from '../src/webmcp/registry';

async function runWindowRotationTests() {
  console.log('================================================================');
  console.log('🧪 TESTING WINDOW ROTATION: WEBMCP TOOL & SCENE STORE SUITE');
  console.log('================================================================\n');

  await projectStore.init();
  await projectStore.createProject({
    name: 'Window Rotation Test Suite',
    template: 'blank'
  });

  const room = sceneStore.createRoom({
    name: 'Living Room',
    width: 20,
    depth: 16,
    position: { x: 0, y: 0, z: 0 }
  });

  // 1. Test sceneStore.placeWindow with rotation
  console.log('1. Testing sceneStore.placeWindow with rotation parameter...');
  const win1 = sceneStore.placeWindow({
    roomId: room.id,
    position: { x: 0, y: 3.5, z: -8 },
    width: 5.0,
    height: 4.5,
    elevation: 3.0,
    rotation: 0
  });

  if (win1.rotation !== 0) {
    throw new Error(`Expected win1.rotation to be 0, got ${win1.rotation}`);
  }
  console.log('   [PASS] Placed window with rotation 0° on North wall.');

  const win2 = sceneStore.placeWindow({
    roomId: room.id,
    position: { x: 10, y: 3.5, z: 0 },
    width: 6.0,
    height: 5.0,
    elevation: 2.5,
    rotation: 90
  });

  if (win2.rotation !== 90) {
    throw new Error(`Expected win2.rotation to be 90, got ${win2.rotation}`);
  }
  console.log('   [PASS] Placed window with rotation 90° on East wall.');

  // 2. Test sceneStore.rotateWindow
  console.log('\n2. Testing sceneStore.rotateWindow direct method...');
  const rotatedOk = sceneStore.rotateWindow(win1.id, 180);
  if (!rotatedOk) {
    throw new Error('rotateWindow returned false for valid windowId');
  }
  const foundWin1 = sceneStore.getData().windows.find(w => w.id === win1.id);
  if (!foundWin1 || foundWin1.rotation !== 180) {
    throw new Error(`Expected win1 rotation to be 180, got ${foundWin1?.rotation}`);
  }
  console.log('   [PASS] Rotated win1 to 180° successfully.');

  // Test wrapping of negative and >360 angles
  sceneStore.rotateWindow(win1.id, -90);
  const wrappedWin1 = sceneStore.getData().windows.find(w => w.id === win1.id);
  if (wrappedWin1?.rotation !== 270) {
    throw new Error(`Expected -90° to normalize to 270°, got ${wrappedWin1?.rotation}`);
  }
  console.log('   [PASS] Angle wrapping normalized -90° to 270°.');

  // 3. Test WebMCP place_window with rotation
  console.log('\n3. Testing WebMCP tool "place_window" with rotation...');
  const placeResult = await executeWebMCPTool(
    'place_window',
    {
      roomId: room.id,
      position: { x: -10, y: 3.5, z: 0 },
      width: 4.5,
      height: 4.5,
      elevation: 3.0,
      rotation: 270
    },
    'webmcp'
  );

  if (!placeResult.success || placeResult.rotation !== 270) {
    throw new Error(`Expected place_window to succeed with rotation 270, got ${JSON.stringify(placeResult)}`);
  }
  console.log('   [PASS] WebMCP place_window placed window with 270° orientation.');

  // 4. Test WebMCP rotate_window tool (number input)
  console.log('\n4. Testing WebMCP tool "rotate_window" with numeric degree...');
  const rotateToolResult = await executeWebMCPTool(
    'rotate_window',
    {
      windowId: placeResult.windowId,
      rotation: 90
    },
    'webmcp'
  );

  if (!rotateToolResult.success || rotateToolResult.rotation !== 90) {
    throw new Error(`Expected rotate_window to return rotation 90, got ${JSON.stringify(rotateToolResult)}`);
  }
  const winCheck = sceneStore.getData().windows.find(w => w.id === placeResult.windowId);
  if (winCheck?.rotation !== 90) {
    throw new Error(`Store does not reflect rotation 90: ${winCheck?.rotation}`);
  }
  console.log('   [PASS] WebMCP rotate_window updated store to 90°.');

  // 5. Test WebMCP rotate_window tool ({ y: number } input)
  console.log('\n5. Testing WebMCP tool "rotate_window" with { y: number } object...');
  const rotateObjResult = await executeWebMCPTool(
    'rotate_window',
    {
      windowId: placeResult.windowId,
      rotation: { y: 180 }
    },
    'webmcp'
  );

  if (!rotateObjResult.success || rotateObjResult.rotation !== 180) {
    throw new Error(`Expected rotate_window to accept { y: 180 }, got ${JSON.stringify(rotateObjResult)}`);
  }
  console.log('   [PASS] WebMCP rotate_window accepted { y: 180 } schema.');

  // 6. Test WebMCP rotate_object polymorphic tool with window ID
  console.log('\n6. Testing WebMCP tool "rotate_object" handling window ID polymorphically...');
  const rotateGenericResult = await executeWebMCPTool(
    'rotate_object',
    {
      objectId: placeResult.windowId,
      rotation: { x: 0, y: 45, z: 0 }
    },
    'webmcp'
  );

  if (!rotateGenericResult.success) {
    throw new Error(`Expected rotate_object on window ID to succeed, got ${JSON.stringify(rotateGenericResult)}`);
  }
  const winCheck45 = sceneStore.getData().windows.find(w => w.id === placeResult.windowId);
  if (winCheck45?.rotation !== 45) {
    throw new Error(`Expected window rotation to be 45 after rotate_object, got ${winCheck45?.rotation}`);
  }
  console.log('   [PASS] rotate_object successfully rotated window to 45°.');

  // 7. Test deleteObject on window
  console.log('\n7. Testing deleteObject on window ID...');
  const delOk = sceneStore.deleteObject(placeResult.windowId);
  if (!delOk) {
    throw new Error('Expected deleteObject to succeed for window ID');
  }
  const deletedCheck = sceneStore.getData().windows.find(w => w.id === placeResult.windowId);
  if (deletedCheck) {
    throw new Error('Window was not deleted from sceneData.windows');
  }
  console.log('   [PASS] deleteObject removed window from scene.');

  // 8. Verify total tools count and rotate_window registration in registry
  console.log('\n8. Checking total tool registry count and structure category...');
  const totalToolCount = Object.keys(ALL_TOOLS).length;
  console.log(`   Total registered WebMCP tools: ${totalToolCount}`);
  if (totalToolCount !== 50) {
    throw new Error(`Expected exactly 50 WebMCP tools, but found ${totalToolCount}`);
  }
  if (!ALL_TOOLS['rotate_window']) {
    throw new Error('rotate_window tool is not in ALL_TOOLS registry!');
  }
  if (ALL_TOOLS['rotate_window'].category !== 'Structure') {
    throw new Error(`Expected category Structure, got ${ALL_TOOLS['rotate_window'].category}`);
  }
  console.log('   [PASS] rotate_window correctly registered in Structure category.');

  console.log('\n================================================================');
  console.log('🎉 ALL WINDOW ROTATION TESTS PASSED WITH ZERO ERRORS!');
  console.log('================================================================\n');
}

runWindowRotationTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
