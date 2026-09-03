import { projectStore } from './src/state/projectStore';
import { sceneStore } from './src/state/sceneStore';
import { uiStore } from './src/state/uiStore';
import { agentStore } from './src/state/agentStore';
import { executeWebMCPTool } from './src/webmcp/registry';
import { triggerCadAutoBuildIfConnected } from './src/webmcp/tools/cadTools';

async function runCadTo3DVerification() {
  console.log('====================================================');
  console.log('🧪 TESTING CAD BLUEPRINT -> AUTONOMOUS 3D PLAN BUILD');
  console.log('====================================================\n');

  // 1. Initialize project store
  console.log('1. Initializing workspace...');
  await projectStore.init();

  // 2. Create a clean project to simulate a user creating a project with a 2D CAD blueprint
  console.log('\n2. Creating a new project with 2D CAD Blueprint...');
  const dummyBlueprintUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%231a202c"/><text x="50" y="50" fill="white">Sample Floor Plan</text></svg>';

  const proj = await projectStore.createProject({
    name: 'Modern Penthouse CAD Import',
    description: 'CAD Blueprint import test',
    template: 'blank',
    cadData: {
      fileName: 'Architectural_FloorPlan_Level1.png',
      fileSize: 452000,
      uploadedAt: Date.now(),
      dataUrl: dummyBlueprintUrl,
      opacity: 0.75,
      visible: true
    }
  });

  console.log(`   Project created: "${proj.metadata.name}" (ID: ${proj.metadata.id})`);
  console.log(`   Initial rooms: ${sceneStore.getData().rooms.length} (Blank canvas)`);

  // 3. Verify AI Agent connection status
  console.log('\n3. Verifying AI Agent connection status...');
  const agentState = agentStore.getState();
  const isAgentConnected = agentState.activeBridgeConnections > 0;
  console.log(`   AI Agent active bridge connections: ${agentState.activeBridgeConnections}`);
  console.log(`   Is AI Agent connected? ${isAgentConnected ? 'YES (Ready)' : 'NO'}`);

  if (!isAgentConnected) {
    throw new Error('AI Agent must be connected for autonomous synthesis.');
  }

  // 4. Trigger CAD-to-3D autonomous build with image and user instructions
  console.log('\n4. Providing 2-D CAD Blueprint to connected AI Agent...');
  const triggered = await triggerCadAutoBuildIfConnected({
    cadDataUrl: dummyBlueprintUrl,
    blueprintName: 'Architectural_FloorPlan_Level1.png',
    userPrompt: '2BHK layout with living room, master bedroom, kitchen, ensuite bath, and balcony',
    projectName: proj.metadata.name
  });

  console.log(`   Autonomous build triggered: ${triggered}`);
  if (!triggered) {
    throw new Error('CAD auto-build did not trigger.');
  }

  // 5. Verify the generated 3-D Plan in sceneStore
  console.log('\n5. Verifying synthesized 3-D Plan in sceneStore...');
  const scene = sceneStore.getData();
  console.log(`   Synthesized Room Count: ${scene.rooms.length}`);
  scene.rooms.forEach(r => {
    console.log(`     - Room: "${r.name}" (${r.width}x${r.depth}ft) at [${r.position.x}, ${r.position.z}]`);
  });

  if (scene.rooms.length < 4) {
    throw new Error(`Expected at least 4 rooms for 2BHK plan, got ${scene.rooms.length}`);
  }

  // Verify room connections (doors/gates)
  console.log(`\n   Synthesized Shared Gates / Doorways: ${scene.gates.length}`);
  scene.gates.forEach(g => {
    console.log(`     - Gate between [${g.roomIdA}] and [${g.roomIdB}], width: ${g.width}ft`);
  });
  if (scene.gates.length < 3) {
    throw new Error(`Expected at least 3 connection gates, got ${scene.gates.length}`);
  }

  // Verify furniture placement
  console.log(`\n   Synthesized Furniture Objects: ${scene.furniture.length}`);
  if (scene.furniture.length < 8) {
    throw new Error(`Expected at least 8 furniture items placed, got ${scene.furniture.length}`);
  }

  // Verify viewport switched to 3D mode
  console.log('\n6. Verifying Viewport Mode...');
  const cameraMode = uiStore.getState().cameraMode;
  const cameraAngle = uiStore.getState().cameraAngle;
  console.log(`   Current camera mode: ${cameraMode} (${cameraAngle}) (Expected: 3d perspective)`);
  if (cameraMode !== '3d') {
    throw new Error(`Expected camera mode 3d, got ${cameraMode}`);
  }

  // 7. Verify WebMCP Tool: build_3d_from_cad with custom prompt (Studio request)
  console.log('\n7. Testing user-requested Studio layout synthesis via executeWebMCPTool("build_3d_from_cad")...');
  const studioResult = await executeWebMCPTool('build_3d_from_cad', {
    blueprintName: 'Studio_Layout.png',
    cadDataUrl: dummyBlueprintUrl,
    userPrompt: 'Compact open-plan studio suite with kitchenette and bathroom',
    furnished: true
  }, 'copilot');
  console.log(`   Studio build success: ${studioResult.success}`);
  console.log(`   Rooms created: ${studioResult.roomsCreated}`);
  console.log(`   Furniture placed: ${studioResult.furniturePlaced}`);

  const studioScene = sceneStore.getData();
  if (studioScene.rooms.length !== 3) {
    throw new Error(`Expected 3 rooms for Studio plan, got ${studioScene.rooms.length}`);
  }

  // 8. Verify WebMCP Tool: create_project
  console.log('\n8. Testing WebMCP create_project tool with CAD image and user prompt...');
  const createProjResult = await executeWebMCPTool('create_project', {
    name: 'Loft Studio Project via WebMCP',
    description: 'Created programmatically via WebMCP agent call',
    cadDataUrl: dummyBlueprintUrl,
    cadFileName: 'Loft_CAD.svg',
    userPrompt: 'Modern 2-bedroom with chef kitchen and balcony',
    stylePreset: 'modern_luxury',
    autoBuild3D: true
  }, 'webmcp');

  console.log(`   Project Created ID: ${createProjResult.projectId}`);
  console.log(`   Project Name: ${createProjResult.name}`);
  console.log(`   Rooms in project: ${createProjResult.roomCount}`);
  console.log(`   Total Area: ${createProjResult.totalAreaSqFt} sq ft`);

  if (!createProjResult.projectId || createProjResult.roomCount < 4) {
    throw new Error('create_project failed to synthesize requested rooms.');
  }

  // 9. Verify WebMCP Tool: list_projects
  console.log('\n9. Testing WebMCP list_projects tool...');
  const listResult = await executeWebMCPTool('list_projects', {}, 'webmcp');
  console.log(`   Total projects found: ${listResult.totalCount}`);
  if (listResult.totalCount < 2) {
    throw new Error('list_projects did not return created projects.');
  }

  // 10. Clean up test projects
  console.log('\n10. Cleaning up test projects...');
  await projectStore.deleteProject(proj.metadata.id);
  await projectStore.deleteProject(createProjResult.projectId);

  console.log('\n====================================================');
  console.log('🎉 ALL CAD-TO-3D & WEBMCP PROJECT TOOLS VERIFIED 100%!');
  console.log('====================================================\n');
}

runCadTo3DVerification().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
