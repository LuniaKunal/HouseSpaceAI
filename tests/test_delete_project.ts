import { projectStore } from './src/state/projectStore';
import { executeWebMCPTool } from './src/webmcp/registry';
import { projectStorage } from './src/storage/indexedDBStorage';

async function testProjectDeletion() {
  console.log('====================================================');
  console.log('🧪 TESTING PROJECT DELETION WORKFLOW');
  console.log('====================================================\n');

  await projectStore.init();
  const initialCount = projectStore.getState().projects.length;
  console.log(`1. Initial project count: ${initialCount}`);

  // Create temporary project to test deletion
  console.log('2. Creating temporary project "Villa Azure"...');
  const tempProj = await projectStore.createProject({
    name: 'Villa Azure',
    template: 'blank'
  });
  console.log(`   Created project ID: ${tempProj.metadata.id}`);
  console.log(`   Projects count now: ${projectStore.getState().projects.length}`);

  // Delete via WebMCP Tool
  console.log('\n3. Executing delete_project WebMCP tool...');
  const result = await executeWebMCPTool('delete_project', {
    projectId: tempProj.metadata.id
  }, 'user');

  console.log(`   Tool Execution Result: success=${result.success}, deletedId=${result.deletedProjectId}`);

  // Verify deletion from store and storage
  console.log('\n4. Verifying project was permanently deleted...');
  const remainingProjects = projectStore.getState().projects;
  const existsInState = remainingProjects.some(p => p.id === tempProj.metadata.id);
  const existsInDb = await projectStorage.getProject(tempProj.metadata.id);

  console.log(`   Exists in projectStore state? ${existsInState ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`   Exists in IndexedDB storage? ${existsInDb ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`   Remaining projects count: ${remainingProjects.length} (Expected: ${initialCount})`);

  if (existsInState || existsInDb) {
    throw new Error('Project was not deleted properly.');
  }

  console.log('\n====================================================');
  console.log('🎉 PROJECT DELETION VERIFIED SUCCESSFULLY!');
  console.log('====================================================\n');
}

testProjectDeletion().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
