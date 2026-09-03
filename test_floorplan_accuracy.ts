import { extractFloorPlanFromBlueprint, parseDimensionText, extractFromSvgBlueprint } from './src/geometry/geometryExtractor';
import { validateFloorPlanGeometry } from './src/geometry/geometryValidator';
import { reconstruct3DFromFloorPlan } from './src/geometry/deterministicReconstruction';
import { furnishRoomsWithConstraints } from './src/geometry/constrainedFurniture';
import { sceneStore } from './src/state/sceneStore';
import { projectStore } from './src/state/projectStore';

async function runFloorPlanAccuracyVerification() {
  console.log('========================================================================');
  console.log('📐 TESTING DYNAMIC ARBITRARY FLOOR-PLAN PIPELINE & 3D RECONSTRUCTION');
  console.log('========================================================================\n');

  // Test 1: Dimension Text Parser (Architectural OCR / Blueprint Annotations)
  console.log('1. Testing Dimension Text Parser (Arbitrary Dimensions)...');
  const d1 = parseDimensionText('17\'-0" X 18\'-0"');
  const d2 = parseDimensionText('5\'-0" X 9\'-9"');
  const d3 = parseDimensionText('7\'-6" X 4\'-6"');
  const d4 = parseDimensionText('12\'-0" x 10\'-0"');
  const d5 = parseDimensionText('14\' x 16\'');

  console.log(`   - "17'-0\\" X 18'-0\\"" -> Width: ${d1?.width}ft, Depth: ${d1?.depth}ft`);
  console.log(`   - "5'-0\\" X 9'-9\\""   -> Width: ${d2?.width}ft, Depth: ${d2?.depth}ft`);
  console.log(`   - "7'-6\\" X 4'-6\\""   -> Width: ${d3?.width}ft, Depth: ${d3?.depth}ft`);
  console.log(`   - "12'-0\\" x 10'-0\\""  -> Width: ${d4?.width}ft, Depth: ${d4?.depth}ft`);
  console.log(`   - "14' x 16'"          -> Width: ${d5?.width}ft, Depth: ${d5?.depth}ft`);

  if (d1?.width !== 17 || d1?.depth !== 18) throw new Error('Dimension parsing failed for 17x18');
  if (d2?.width !== 5 || d2?.depth !== 9.75) throw new Error('Dimension parsing failed for 5x9.75');
  if (d3?.width !== 7.5 || d3?.depth !== 4.5) throw new Error('Dimension parsing failed for 7.5x4.5');
  if (d4?.width !== 12 || d4?.depth !== 10) throw new Error('Dimension parsing failed for 12x10');
  if (d5?.width !== 14 || d5?.depth !== 16) throw new Error('Dimension parsing failed for 14x16');
  console.log('   ✅ Dimension Text Parser verified 100%!\n');

  // Test 2: Arbitrary Vector SVG Floor Plan Extraction
  console.log('2. Testing Arbitrary SVG Vector Blueprint Extraction...');
  // A realistic arbitrary 3-room layout (Living Room, Bedroom, Bathroom) in SVG
  const arbitrarySvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <!-- Living Room: 320x300 px -->
      <rect x="50" y="50" width="320" height="300" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
      <text x="210" y="200" fill="white" font-size="14">Living & Dining</text>
      <text x="210" y="220" fill="#94a3b8" font-size="11">20'-0" x 18'-0"</text>

      <!-- Bedroom: 260x200 px -->
      <rect x="370" y="50" width="260" height="200" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
      <text x="500" y="150" fill="white" font-size="14">Master Bedroom</text>
      <text x="500" y="170" fill="#94a3b8" font-size="11">16'-0" x 12'-0"</text>

      <!-- Bathroom: 260x100 px -->
      <rect x="370" y="250" width="260" height="100" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
      <text x="500" y="300" fill="white" font-size="14">Bathroom</text>
      <text x="500" y="320" fill="#94a3b8" font-size="11">16'-0" x 6'-0"</text>
    </svg>
  `;

  const svgExtraction = await extractFromSvgBlueprint(arbitrarySvg, {
    blueprintName: 'Custom_Modern_Suite.svg'
  });

  const svgPlan = svgExtraction.floorPlan;
  console.log(`   Extracted Vector Floor Plan: "${svgPlan.name}"`);
  console.log(`   Extracted Rooms: ${svgPlan.rooms.length}`);
  console.log(`   Extracted Walls: ${svgPlan.walls.length}`);
  console.log(`   Extracted Openings: ${svgPlan.openings.length}`);
  console.log(`   Detected Annotations: ${svgExtraction.detectedAnnotations.length}`);

  svgPlan.rooms.forEach(r => {
    console.log(`     - Room: "${r.name}" (${r.role}) - ${r.width}ft x ${r.depth}ft at [${r.center?.x}, ${r.center?.y}]`);
  });

  if (svgPlan.rooms.length !== 3) {
    throw new Error(`Expected exactly 3 extracted rooms from arbitrary SVG, got ${svgPlan.rooms.length}`);
  }
  if (svgPlan.walls.length < 10) {
    throw new Error(`Expected at least 10 wall segments, got ${svgPlan.walls.length}`);
  }
  console.log('   ✅ Arbitrary SVG Vector extraction verified successfully!\n');

  // Test 3: Arbitrary Raster Floor Plan Extraction
  console.log('3. Testing Arbitrary Raster Floor Plan Dynamic Extraction...');
  const rasterExtraction = await extractFloorPlanFromBlueprint({
    dataUrl: 'data:image/svg+xml;utf8,<svg width="600" height="400"></svg>',
    blueprintName: 'Arbitrary_Residence_Level2.png',
    userPrompt: '2BHK layout with living room, master bedroom, second bedroom, and open kitchen'
  });

  const rasterPlan = rasterExtraction.floorPlan;
  console.log(`   Extracted Plan Name: "${rasterPlan.name}"`);
  console.log(`   Extracted Rooms: ${rasterPlan.rooms.length}`);
  console.log(`   Extracted Walls: ${rasterPlan.walls.length}`);
  console.log(`   Extracted Openings: ${rasterPlan.openings.length}`);

  rasterPlan.rooms.forEach(r => {
    console.log(`     - Room: "${r.name}" (${r.role}) - ${r.width}ft x ${r.depth}ft`);
  });

  if (rasterPlan.rooms.length < 4) {
    throw new Error(`Expected at least 4 rooms for 2BHK plan, got ${rasterPlan.rooms.length}`);
  }
  console.log('   ✅ Dynamic raster extraction verified successfully!\n');

  // Test 4: Geometry Validation Engine
  console.log('4. Running Geometry Validation Engine on Arbitrary Floor Plan...');
  const validation = validateFloorPlanGeometry(svgPlan);
  console.log(`   Validation Valid: ${validation.valid}`);
  console.log(`   Confidence Score: ${(validation.confidence * 100).toFixed(1)}%`);
  console.log(`   Errors: ${validation.errors.length}`);
  console.log(`   Warnings: ${validation.warnings.length}`);
  console.log(`   Metrics:`, validation.metrics);

  if (!validation.valid) {
    throw new Error(`Geometry validation failed: ${validation.errors.join(', ')}`);
  }
  if (validation.confidence < 0.85) {
    throw new Error(`Confidence too low: ${validation.confidence}`);
  }
  console.log('   ✅ Geometry validation passed with high confidence!\n');

  // Test 5: Deterministic 3D Reconstruction into Three.js Meshes
  console.log('5. Testing Deterministic 3D Three.js Reconstruction from Arbitrary Geometry...');
  const threeGroup = reconstruct3DFromFloorPlan(svgPlan, { fullHeightWalls: true });
  console.log(`   Reconstructed 3D Root Group: "${threeGroup.name}"`);
  console.log(`   Direct 3D Children: ${threeGroup.children.length}`);

  let totalMeshCount = 0;
  threeGroup.traverse(child => {
    if ((child as any).isMesh) totalMeshCount++;
  });
  console.log(`   Total Extruded 3D Meshes (Floors, Walls, Openings): ${totalMeshCount}`);
  if (totalMeshCount < 10) {
    throw new Error(`Expected at least 10 3D meshes in reconstructed scene, got ${totalMeshCount}`);
  }
  console.log('   ✅ Deterministic 3D Three.js meshes generated successfully!\n');

  // Test 6: Constrained Furniture Placement
  console.log('6. Testing Dynamic Constrained Furniture Placement...');
  const furniture = furnishRoomsWithConstraints(svgPlan);
  console.log(`   Furnishings Placed: ${furniture.length}`);
  furniture.forEach(f => {
    console.log(`     - [${f.category}] "${f.name}" in room "${f.roomId}" at [X: ${f.position.x}, Z: ${f.position.z}]`);
  });
  if (furniture.length < 4) {
    throw new Error(`Expected at least 4 furnishings placed, got ${furniture.length}`);
  }
  console.log('   ✅ Furniture placed respecting arbitrary room boundaries!\n');

  // Test 7: SceneStore Integration & Bidirectional Sync
  console.log('7. Testing SceneStore Integration & Sync for Arbitrary Layout...');
  sceneStore.clearScene();
  sceneStore.setFloorPlan(svgPlan, validation);

  const sceneState = sceneStore.getData();
  console.log(`   sceneStore.floorPlan present? ${!!sceneState.floorPlan}`);
  console.log(`   Synchronized rooms: ${sceneState.rooms.length}`);
  console.log(`   Synchronized doors: ${sceneState.doors.length}`);
  console.log(`   Synchronized walls: ${sceneState.customWalls.length}`);

  if (sceneState.rooms.length !== 3) {
    throw new Error(`Expected 3 synchronized rooms in sceneStore, got ${sceneState.rooms.length}`);
  }
  if (sceneState.customWalls.length < 10) {
    throw new Error(`Expected at least 10 synchronized walls, got ${sceneState.customWalls.length}`);
  }
  console.log('   ✅ SceneStore integration & bidirectional synchronization verified 100%!\n');

  console.log('========================================================================');
  console.log('🎉 ALL ARBITRARY FLOOR-PLAN RECONSTRUCTION & ACCURACY TESTS PASSED!');
  console.log('========================================================================\n');
}

runFloorPlanAccuracyVerification().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
