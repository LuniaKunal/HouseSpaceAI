import { projectStore } from './src/state/projectStore';
import { sceneStore } from './src/state/sceneStore';
import { projectStorage } from './src/storage/indexedDBStorage';
import { build3BHKFloorPlanProject } from './src/data/floorplan3bhkLayout';

async function main() {
  console.log('================================================================');
  console.log('🏗️  INITIALIZING 3BHK RESIDENCE WORKSPACE FROM BLUEPRINT IMAGE');
  console.log('================================================================\n');

  await projectStore.init();

  // Load / Create the 3BHK Floor Plan project
  console.log('1. Loading 3BHK Floor Plan Architectural Project...');
  const proj = await projectStore.load3BHKFloorPlanProject();

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
  scene.furniture.slice(0, 12).forEach((f, idx) => {
    console.log(`   [${(idx + 1).toString().padStart(2, ' ')}] ${f.name.padEnd(32, ' ')} (${f.type}) in ${f.roomId}`);
  });
  console.log(`   ... and ${scene.furniture.length - 12} more items.\n`);

  console.log('================================================================');
  console.log('✨ 3BHK RESIDENCE WORKSPACE READY & SET ACTIVE!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Error creating 3BHK workspace:', err);
  process.exit(1);
});
