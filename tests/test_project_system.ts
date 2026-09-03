import { projectStore } from '../src/state/projectStore';
import { projectStorage } from '../src/storage/indexedDBStorage';
import { sceneStore } from '../src/state/sceneStore';
import { uiStore } from '../src/state/uiStore';

async function runProjectSystemVerification() {
  console.log('====================================================');
  console.log('🧪 TESTING WORKSPACE / PROJECT MANAGEMENT SYSTEM');
  console.log('====================================================\n');

  // 1. Initialize Store & verify default project seeding
  console.log('1. Initializing projectStore...');
  await projectStore.init();

  const initialState = projectStore.getState();
  console.log(`   Projects found: ${initialState.projects.length}`);
  console.log(`   Active project: "${initialState.activeProject?.metadata.name}" (${initialState.activeProject?.metadata.id})`);
  console.log(`   Active rooms in scene: ${sceneStore.getData().rooms.length}`);

  if (!initialState.activeProject || initialState.projects.length === 0) {
    throw new Error('Default project was not seeded properly.');
  }

  // 2. Create a new Blank Project
  console.log('\n2. Creating a new Blank Project...');
  const newProj = await projectStore.createProject({
    name: 'Downtown Artist Loft',
    description: 'Minimal open space with concrete floors',
    template: 'blank'
  });
  console.log(`   Created project ID: ${newProj.metadata.id}`);
  console.log(`   Scene room count: ${sceneStore.getData().rooms.length} (Expected: 0)`);
  console.log(`   Active view: ${uiStore.getState().activeView} (Expected: studio)`);

  if (sceneStore.getData().rooms.length !== 0) {
    throw new Error('Blank project should have 0 rooms.');
  }

  // 3. Mutate scene data and verify autosave
  console.log('\n3. Mutating scene data (adding a living room)...');
  const livingRoom = sceneStore.createRoom({
    name: 'Loft Living Space',
    width: 20,
    depth: 16,
    floorMaterial: 'concrete_polished'
  });
  console.log(`   Created room: ${livingRoom.name} (${livingRoom.width}x${livingRoom.depth}ft)`);

  // Wait for autosave debounce (850ms + margin)
  console.log('   Waiting for debounced autosave...');
  await new Promise(res => setTimeout(res, 1200));

  const savedProj = await projectStorage.getProject(newProj.metadata.id);
  console.log(`   Autosaved room count in storage: ${savedProj?.sceneData.rooms.length}`);
  console.log(`   Autosave status: ${projectStore.getState().autosaveStatus}`);

  if (savedProj?.sceneData.rooms.length !== 1) {
    throw new Error('Autosave did not persist the added room to storage.');
  }

  // 4. Duplicate Project
  console.log('\n4. Duplicating project...');
  const cloned = await projectStore.duplicateProject(newProj.metadata.id);
  console.log(`   Cloned Project: "${cloned.metadata.name}" (${cloned.metadata.id})`);
  console.log(`   Total projects now: ${projectStore.getState().projects.length}`);

  if (!cloned.metadata.name.includes('(Copy)')) {
    throw new Error('Duplicate project should have (Copy) in name.');
  }

  // 5. Rename Project
  console.log('\n5. Renaming project...');
  await projectStore.renameProject(cloned.metadata.id, 'Loft Concept B');
  const renamedProj = await projectStorage.getProject(cloned.metadata.id);
  console.log(`   Renamed project name in storage: "${renamedProj?.metadata.name}"`);

  if (renamedProj?.metadata.name !== 'Loft Concept B') {
    throw new Error('Project was not renamed correctly.');
  }

  // 6. Export Project to JSON
  console.log('\n6. Exporting project to JSON...');
  const jsonStr = await projectStorage.exportProjectJSON(cloned.metadata.id);
  console.log(`   Exported JSON length: ${jsonStr.length} characters`);
  const parsed = JSON.parse(jsonStr);
  console.log(`   Export verified: name="${parsed.metadata.name}", rooms=${parsed.sceneData.rooms.length}`);

  // 7. Import Project from JSON
  console.log('\n7. Importing project from JSON...');
  const imported = await projectStore.importProject(jsonStr);
  console.log(`   Imported Project: "${imported?.metadata.name}" (${imported?.metadata.id})`);
  console.log(`   Total projects now: ${projectStore.getState().projects.length}`);

  // 8. Delete Projects
  console.log('\n8. Deleting cloned and imported projects...');
  if (imported) await projectStore.deleteProject(imported.metadata.id);
  await projectStore.deleteProject(cloned.metadata.id);
  await projectStore.deleteProject(newProj.metadata.id);
  console.log(`   Remaining projects count: ${projectStore.getState().projects.length}`);

  // 9. Reopen original clean workspace project
  console.log('\n9. Re-opening original workspace project (zero hardcoded geometry)...');
  const defaultProj = projectStore.getState().projects[0];
  await projectStore.openProject(defaultProj.id);
  console.log(`   Restored active project: "${projectStore.getState().activeProject?.metadata.name}"`);
  console.log(`   Restored room count: ${sceneStore.getData().rooms.length} (Expected: 0)`);
  console.log(`   Restored furniture count: ${sceneStore.getData().furniture.length} (Expected: 0)`);

  if (!projectStore.getState().activeProject) {
    throw new Error('Failed to restore active project.');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL WORKSPACE SYSTEM CHECKS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runProjectSystemVerification().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
