import { projectStore } from './src/state/projectStore';
import { sceneStore } from './src/state/sceneStore';
import { executeWebMCPTool } from './src/webmcp/registry';

async function runFurnitureDimensionVerification() {
  console.log('================================================================');
  console.log('🧪 TESTING FURNITURE DIMENSION & WALL FITTING TOOLS (AI + HUMAN)');
  console.log('================================================================\n');

  // 1. Initialize workspace with user-created bedroom
  console.log('1. Initializing workspace with user-created bedroom...');
  await projectStore.init();
  const proj = await projectStore.createProject({
    name: 'Dimension Test Suite',
    template: 'blank'
  });

  const bed3 = sceneStore.createRoom({
    name: 'Bed Room-3',
    width: 10,
    depth: 10,
    position: { x: 0, y: 0, z: 0 }
  });

  const bed1 = sceneStore.createRoom({
    name: 'Bed Room-1',
    width: 14,
    depth: 12,
    position: { x: 20, y: 0, z: 0 }
  });

  const wardrobeInBed3 = sceneStore.addFurniture({
    type: 'wardrobe_sliding_mirror',
    name: 'Sliding Wardrobe',
    roomId: bed3.id,
    position: { x: 0, y: 0, z: 3 },
    dimensions: { x: 5, y: 7.5, z: 2 }
  });

  const wardrobeInBed1 = sceneStore.addFurniture({
    type: 'wardrobe_sliding_mirror',
    name: 'Master Wardrobe',
    roomId: bed1.id,
    position: { x: 20, y: 0, z: 4 },
    dimensions: { x: 6, y: 7.5, z: 2.2 }
  });

  console.log(`   Loaded active project: "${proj.metadata.name}" (${sceneStore.getData().rooms.length} rooms)`);

  const initialW = wardrobeInBed3.dimensions.x * wardrobeInBed3.scale.x;
  const initialD = wardrobeInBed3.dimensions.z * wardrobeInBed3.scale.z;
  console.log(`   Wardrobe ID: ${wardrobeInBed3.id} ("${wardrobeInBed3.name}")`);
  console.log(`   Initial Dimensions: ${initialW.toFixed(2)}ft (Width) x ${initialD.toFixed(2)}ft (Depth)`);
  console.log(`   Initial Position: [X: ${wardrobeInBed3.position.x}, Z: ${wardrobeInBed3.position.z}]`);

  // 3. Test WebMCP Tool: set_furniture_dimensions (explicit sizing)
  console.log('\n3. Testing WebMCP tool: set_furniture_dimensions...');
  const setDimResult = await executeWebMCPTool('set_furniture_dimensions', {
    objectId: wardrobeInBed3.id,
    width: 4.2,
    depth: 1.8
  }, 'copilot');

  console.log(`   set_furniture_dimensions success: ${setDimResult.success}`);
  console.log(`   Updated Width: ${setDimResult.dimensions.x.toFixed(2)}ft (Expected ~4.2ft)`);
  console.log(`   Updated Depth: ${setDimResult.dimensions.z.toFixed(2)}ft (Expected ~1.8ft)`);

  if (Math.abs(setDimResult.dimensions.x - 4.2) > 0.05) {
    throw new Error(`Expected width 4.2ft, got ${setDimResult.dimensions.x}`);
  }
  if (Math.abs(setDimResult.dimensions.z - 1.8) > 0.05) {
    throw new Error(`Expected depth 1.8ft, got ${setDimResult.dimensions.z}`);
  }

  // 4. Test WebMCP Tool: fit_furniture_to_wall (adjacent wall auto-fit & snap)
  console.log('\n4. Testing WebMCP tool: fit_furniture_to_wall...');
  // First intentionally oversize the wardrobe to simulate a wardrobe that is too big
  sceneStore.scaleObject(wardrobeInBed3.id, { x: 2.0, y: 1.0, z: 1.5 });
  const oversizedItem = sceneStore.getData().furniture.find(f => f.id === wardrobeInBed3.id)!;
  const overW = oversizedItem.dimensions.x * oversizedItem.scale.x;
  console.log(`   Simulated Oversized Wardrobe: ${overW.toFixed(2)}ft wide in ${bed3.width}x${bed3.depth}ft room!`);

  const fitResult = await executeWebMCPTool('fit_furniture_to_wall', {
    objectId: wardrobeInBed3.id,
    wallDirection: 'top',
    snapToWall: true
  }, 'copilot');

  console.log(`   fit_furniture_to_wall success: ${fitResult.success}`);
  console.log(`   Wall Fitted: ${fitResult.wallDirection} wall of ${fitResult.roomName}`);
  console.log(`   Fitted Dimensions: ${fitResult.newDimensions.x.toFixed(2)}ft (Width) x ${fitResult.newDimensions.z.toFixed(2)}ft (Depth)`);
  console.log(`   Snapped Position: [X: ${fitResult.position.x.toFixed(2)}, Z: ${fitResult.position.z.toFixed(2)}]`);

  if (fitResult.newDimensions.x > 4.6) {
    throw new Error(`Fitted width should be <= 4.5ft for small 10x10 room, got ${fitResult.newDimensions.x}`);
  }
  if (fitResult.newDimensions.z > 2.0) {
    throw new Error(`Fitted depth should be <= 2.0ft, got ${fitResult.newDimensions.z}`);
  }

  // 5. Test WebMCP Tool: auto_fit_room_furniture
  console.log('\n5. Testing WebMCP tool: auto_fit_room_furniture...');
  const autoFitResult = await executeWebMCPTool('auto_fit_room_furniture', {
    roomId: bed3.id,
    category: 'all'
  }, 'webmcp');

  console.log(`   auto_fit_room_furniture success: ${autoFitResult.success}`);
  console.log(`   Fitted items count in Bed Room-3: ${autoFitResult.fittedCount}`);
  if (autoFitResult.fittedCount < 1) {
    throw new Error('auto_fit_room_furniture should have fitted at least 1 item.');
  }

  // 6. Test Bed Room-1 wardrobe & Bed Room-2 wardrobe
  // 6. Test Bed Room-1 wardrobe wall fitting
  console.log('\n6. Testing wardrobe wall fitting in Bed Room-1...');
  const fitBed1Result = await executeWebMCPTool('fit_furniture_to_wall', {
    objectId: wardrobeInBed1.id,
    wallDirection: 'right',
    snapToWall: true
  }, 'copilot');

  console.log(`   Bed Room-1 Wardrobe fitted against: ${fitBed1Result.wallDirection} wall`);
  console.log(`   New Dimensions: ${fitBed1Result.newDimensions.x.toFixed(2)} x ${fitBed1Result.newDimensions.z.toFixed(2)}ft`);
  console.log(`   Snapped Position: [X: ${fitBed1Result.position.x.toFixed(2)}, Z: ${fitBed1Result.position.z.toFixed(2)}]`);

  // Cleanup test project
  await projectStore.deleteProject(proj.metadata.id);

  console.log('\n================================================================');
  console.log('🎉 ALL FURNITURE DIMENSION & WALL-FITTING TESTS PASSED (100%)!');
  console.log('================================================================\n');
}

runFurnitureDimensionVerification().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
