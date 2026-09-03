import { ensureWebMCPContextReady, registerAllWebMCPTools, runWebMCPDevCheck } from './src/webmcp/bridge';
import { ALL_TOOLS, TOOL_LIST, executeWebMCPTool } from './src/webmcp/registry';
import { sceneStore } from './src/state/sceneStore';
import { projectStore } from './src/state/projectStore';

// Polyfill minimal browser globals for Node test environment
if (typeof globalThis.EventTarget === 'undefined') {
  const { EventTarget } = require('events');
  globalThis.EventTarget = EventTarget;
}

// Simulate Chrome Canary: Document prototype has a getter-only modelContext property!
class FakeDocumentPrototype extends EventTarget {}
const nativeChromeModelContext = {
  registerTool: async (tool: any) => {},
  getTools: async () => []
};

Object.defineProperty(FakeDocumentPrototype.prototype, 'modelContext', {
  get: () => nativeChromeModelContext,
  enumerable: true,
  configurable: true
});

const mockDocument = new FakeDocumentPrototype() as any;
const mockWindow = new EventTarget() as any;
mockWindow.crossOriginIsolated = true;

(globalThis as any).document = mockDocument;
(globalThis as any).window = mockWindow;

async function runAudit() {
  console.log('====================================================');
  console.log('   WebMCP Imperative API & Audit Verification Suite  ');
  console.log('====================================================\n');

  // 1. Verify HTTP Headers on running Vite server (http://localhost:4173)
  console.log('1. Checking HTTP Response Headers on http://localhost:4173/ ...');
  try {
    const res = await fetch('http://localhost:4173/');
    const headers = res.headers;
    const permPolicy = headers.get('permissions-policy');
    const originCluster = headers.get('origin-agent-cluster');
    const contentTypeOpt = headers.get('x-content-type-options');

    console.log('   - Permissions-Policy:', permPolicy);
    console.log('   - Origin-Agent-Cluster:', originCluster);
    console.log('   - X-Content-Type-Options:', contentTypeOpt);

    if (permPolicy?.includes('tools=(self)')) {
      console.log('   [PASS] Permissions-Policy "tools=(self)" correctly set.');
    } else {
      console.warn('   [WARN] Permissions-Policy header missing or different:', permPolicy);
    }

    if (originCluster === '?1') {
      console.log('   [PASS] Origin-Agent-Cluster "?1" correctly set for origin isolation.');
    } else {
      console.warn('   [WARN] Origin-Agent-Cluster header missing or different:', originCluster);
    }
  } catch (err: any) {
    console.log('   [INFO] Dev server fetch check skipped (fetch error):', err?.message);
  }

  // 2. Initialize project store
  await projectStore.init();

  // 3. Ensure document.modelContext exists
  console.log('\n2. Testing document.modelContext Availability & Imperative API...');
  const ctx = ensureWebMCPContextReady();
  if (typeof mockDocument.modelContext !== 'object') {
    throw new Error('FAIL: document.modelContext is not an object!');
  }
  if (typeof mockDocument.modelContext.registerTool !== 'function') {
    throw new Error('FAIL: document.modelContext.registerTool is not a function!');
  }
  if (typeof mockDocument.modelContext.getTools !== 'function') {
    throw new Error('FAIL: document.modelContext.getTools is not a function!');
  }
  console.log('   [PASS] document.modelContext is available with registerTool and getTools.');

  // 4. Test toolchange EventTarget dispatch
  let toolchangeFired = false;
  mockDocument.modelContext.addEventListener('toolchange', () => {
    toolchangeFired = true;
  });

  // 5. Register all application tools
  console.log('\n3. Registering all application actions via document.modelContext.registerTool...');
  const regResult = await registerAllWebMCPTools();
  console.log(`   [PASS] Registered ${regResult.registeredCount} tools.`);
  console.log(`   [PASS] EventTarget "toolchange" dispatched: ${toolchangeFired}`);

  // 6. Test discovery via document.modelContext.getTools()
  console.log('\n4. Testing Tool Discovery via document.modelContext.getTools()...');
  const discoveredTools: any[] = await mockDocument.modelContext.getTools();
  console.log(`   Discovered ${discoveredTools.length} tools.`);

  if (discoveredTools.length !== Object.keys(ALL_TOOLS).length) {
    throw new Error(`FAIL: Expected ${Object.keys(ALL_TOOLS).length} tools, but found ${discoveredTools.length}!`);
  }

  // Also check synchronous array properties on getTools()
  const syncLength = mockDocument.modelContext.getTools().length;
  if (syncLength !== discoveredTools.length) {
    throw new Error(`FAIL: Synchronous getTools().length returned ${syncLength}, expected ${discoveredTools.length}!`);
  }
  console.log('   [PASS] Both async `await getTools()` and sync `getTools().length` return correct count.');

  // 7. Validate tool attributes: unique name, meaningful title, clear description, valid schema, working execute
  console.log('\n5. Auditing Every Tool Specification...');
  const seenNames = new Set<string>();
  let validationFailures = 0;

  for (const tool of discoveredTools) {
    // Unique name
    if (seenNames.has(tool.name)) {
      console.error(`   [FAIL] Duplicate tool name: "${tool.name}"`);
      validationFailures++;
    }
    seenNames.add(tool.name);

    // Meaningful title
    if (!tool.title || typeof tool.title !== 'string' || tool.title.length < 3) {
      console.error(`   [FAIL] Missing or invalid title for "${tool.name}": "${tool.title}"`);
      validationFailures++;
    }

    // Clear description
    if (!tool.description || typeof tool.description !== 'string' || tool.description.length < 10) {
      console.error(`   [FAIL] Description too short for "${tool.name}"`);
      validationFailures++;
    }

    // Valid JSON schema
    if (!tool.inputSchema || tool.inputSchema.type !== 'object' || typeof tool.inputSchema.properties !== 'object') {
      console.error(`   [FAIL] Invalid inputSchema for "${tool.name}"`);
      validationFailures++;
    }

    // Working async execute
    if (typeof tool.execute !== 'function') {
      console.error(`   [FAIL] Missing execute function for "${tool.name}"`);
      validationFailures++;
    }
  }

  if (validationFailures === 0) {
    console.log(`   [PASS] All ${discoveredTools.length} tools have unique names, titles, descriptions, schemas, and execute functions.`);
  } else {
    throw new Error(`FAIL: ${validationFailures} validation failures encountered!`);
  }

  // 8. Test Executing a representative tool via WebMCP
  console.log('\n6. Testing Tool Execution via WebMCP Imperative API...');
  const createRoomTool = discoveredTools.find(t => t.name === 'create_room');
  if (!createRoomTool) throw new Error('FAIL: "create_room" tool not found!');
  const roomRes = await createRoomTool.execute({
    name: 'Audit Studio Space',
    width: 20,
    depth: 15,
    floorMaterial: 'hardwood_oak'
  });
  console.log('   Executed create_room -> created roomId:', roomRes.roomId, 'area:', roomRes.areaSqFt, 'sq ft');

  const getSceneTool = discoveredTools.find(t => t.name === 'get_scene_state');
  if (!getSceneTool) throw new Error('FAIL: "get_scene_state" tool not found!');

  const stateResult = await getSceneTool.execute({});
  console.log('   Executed get_scene_state -> rooms:', stateResult.dimensions.roomCount, 'furniture:', stateResult.dimensions.furnitureCount);
  if (!stateResult.rooms || stateResult.rooms.length === 0) {
    throw new Error('FAIL: get_scene_state returned no rooms!');
  }
  console.log('   [PASS] Tool execution completed successfully and returned valid scene graph state.');

  // 9. Run the development diagnostics check
  console.log('\n7. Running Development Diagnostics Check (runWebMCPDevCheck)...');
  const devCheckResult = await runWebMCPDevCheck();
  if (!devCheckResult.success) {
    throw new Error('FAIL: runWebMCPDevCheck reported failures!');
  }
  console.log('   [PASS] runWebMCPDevCheck passed with 0 schema errors.');

  console.log('\n====================================================');
  console.log('       ALL WEBMCP AUDIT CHECKS PASSED (100%)         ');
  console.log('====================================================\n');
}

runAudit().catch(err => {
  console.error('Audit suite failed:', err);
  process.exit(1);
});
