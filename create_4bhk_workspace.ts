import { projectStore } from './src/state/projectStore';
import { sceneStore } from './src/state/sceneStore';
import { FOUR_BHK_ROOMS, FOUR_BHK_FURNITURE, FOUR_BHK_DOORS, FOUR_BHK_WINDOWS, FOUR_BHK_GATES } from './src/data/floorplan4bhkLayout';

async function main() {
  console.log('================================================================');
  console.log('🏗️  INITIALIZING 4BHK_Sample RESIDENCE WORKSPACE FROM Sample_1.png');
  console.log('================================================================\n');

  await projectStore.init();

  console.log('1. Loading 4BHK_Sample Floor Plan Architectural Project...');
  const proj = await projectStore.load4BHKSampleProject();

  console.log(`   Project Name: "${proj.metadata.name}"`);
  console.log(`   Project ID: "${proj.metadata.id}"`);
  console.log(`   Total Area: ${proj.metadata.totalAreaSqFt} sq ft`);
  console.log(`   Room Count: ${proj.metadata.roomCount}`);
  console.log(`   Furniture Count: ${proj.metadata.furnitureCount}`);
  console.log(`   CAD Reference Image: ${proj.cadData?.dataUrl}`);

  // Inspect Scene
  const scene = sceneStore.getData();
  console.log('\n2. Synthesized Architectural Spaces:');
  scene.rooms.forEach((r, idx) => {
    console.log(`   [${(idx + 1).toString().padStart(2, ' ')}] ${r.name.padEnd(28, ' ')} (${r.width}ft x ${r.depth}ft) at [X: ${r.position.x}, Z: ${r.position.z}]`);
  });

  console.log('\n3. Interconnected Doorways & Gates:');
  scene.gates.forEach((g, idx) => {
    console.log(`   [${idx + 1}] Gate between [${g.roomIdA}] <-> [${g.roomIdB}] (width: ${g.width}ft)`);
  });

  console.log('\n4. Key Furnishings & Fixtures:');
  scene.furniture.forEach((f, idx) => {
    console.log(`   [${(idx + 1).toString().padStart(2, ' ')}] ${f.name.padEnd(36, ' ')} (${f.type}) rot: [${f.rotation.y}°] in ${f.roomId}`);
  });

  console.log('\n================================================================');
  console.log('✨ 4BHK_Sample RESIDENCE WORKSPACE READY & SET ACTIVE!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Error creating 4BHK workspace:', err);
  process.exit(1);
});
