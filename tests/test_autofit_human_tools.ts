import { sceneStore } from '../src/state/sceneStore';
import { uiStore } from '../src/state/uiStore';
import { executeWebMCPTool } from '../src/webmcp/registry';
import { projectStore } from '../src/state/projectStore';

async function testAutofit() {
  console.log('--- Testing Auto-Fit WebMCP Tools for Humans ---');
  await projectStore.init();
  await projectStore.load3BHKSampleProject();

  const state = sceneStore.getData();
  console.log(`Loaded 3BHK project with ${state.rooms.length} rooms, ${state.furniture.length} furniture items, ${state.gates.length} gates.`);

  // 1. Test autofit_human_circulation on entire layout
  console.log('\n1. Testing executeWebMCPTool("autofit_human_circulation")...');
  const circResult = await executeWebMCPTool('autofit_human_circulation', {
    minWalkwayWidth: 3.0,
    doorwayClearance: 3.0,
    bedSideClearance: 2.5,
    resolveOverlaps: true,
    alignToWalls: true
  }, 'user');

  console.log('   Success:', circResult.success);
  console.log('   Rooms processed:', circResult.roomsProcessed);
  console.log('   Items adjusted:', circResult.itemsAdjusted.length);
  console.log('   Human ergonomics score:', circResult.humanErgonomicsScore);
  console.log('   Doorways clear:', circResult.circulationSummary.doorwaysClear);

  if (!circResult.success || circResult.humanErgonomicsScore < 80) {
    throw new Error('FAIL: autofit_human_circulation did not succeed or score too low');
  }

  // 2. Test autofit_room_for_humans on specific room
  const targetRoom = state.rooms[0];
  console.log(`\n2. Testing executeWebMCPTool("autofit_room_for_humans") on room "${targetRoom.name}" (${targetRoom.id})...`);
  const roomResult = await executeWebMCPTool('autofit_room_for_humans', {
    roomId: targetRoom.id,
    optimizeCirculation: true,
    fitWardrobes: true,
    ensureDoorClearance: true
  }, 'user');

  console.log('   Success:', roomResult.success);
  console.log('   Room name:', roomResult.roomName);
  console.log('   Human score:', roomResult.humanErgonomicsScore);
  console.log('   Summary:', roomResult.summary);

  if (!roomResult.success) {
    throw new Error('FAIL: autofit_room_for_humans failed');
  }

  // 3. Test autofit_view for scene
  console.log('\n3. Testing executeWebMCPTool("autofit_view") for scene overview...');
  const viewResultScene = await executeWebMCPTool('autofit_view', {
    target: 'scene',
    framing: 'overview',
    padding: 4.0
  }, 'user');

  console.log('   Success:', viewResultScene.success);
  console.log('   Camera position:', viewResultScene.cameraPosition);
  console.log('   Look target:', viewResultScene.cameraLookTarget);

  if (!viewResultScene.success || !viewResultScene.cameraPosition) {
    throw new Error('FAIL: autofit_view scene failed');
  }

  // 4. Test autofit_view for single room
  console.log('\n4. Testing executeWebMCPTool("autofit_view") for single room...');
  const viewResultRoom = await executeWebMCPTool('autofit_view', {
    target: 'room',
    roomId: targetRoom.id,
    framing: 'close_up'
  }, 'user');

  console.log('   Success:', viewResultRoom.success);
  console.log('   Camera position:', viewResultRoom.cameraPosition);

  // 5. Test uiStore cameraFrameTarget state
  const uiState = uiStore.getState();
  if (!uiState.cameraFrameTarget) {
    throw new Error('FAIL: uiStore.cameraFrameTarget not updated');
  }
  console.log('   uiStore.cameraFrameTarget successfully set with timestamp:', uiState.cameraFrameTarget.timestamp);

  console.log('\n>>> ALL AUTO-FIT WEBMCP TOOL TESTS PASSED! <<<');
}

testAutofit().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
