import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TestSuite {
  name: string;
  file: string;
  description: string;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Room Creation & Auto-Snap Gateway Fix',
    file: 'test_room_creation_fix.ts',
    description: 'Verifies standalone room creation, auto-snapping, shared wall overlap, gate cuts, and undo/redo'
  },
  {
    name: 'L-Shaped Rooms & Notch Geometry',
    file: 'test_l_shaped_rooms.ts',
    description: 'Verifies L-shaped room generation, polygon footprint decomposition, and wall helper cuts'
  },
  {
    name: 'Furniture Dimension & Wall Snapping Tools',
    file: 'test_furniture_dimension_tools.ts',
    description: 'Verifies set_furniture_dimensions, fit_furniture_to_wall, and wall clearance snapping'
  },
  {
    name: 'WebMCP Architecture & Bridge Audit',
    file: 'test_webmcp_audit.ts',
    description: 'Verifies WebMCP schema validation, tool execution, and window/navigator modelContext bridge'
  },
  {
    name: 'Project Workspace & State Management',
    file: 'test_project_system.ts',
    description: 'Verifies projectStore lifecycle, multi-project persistence, and active project switching'
  },
  {
    name: 'Project Deletion Workflow',
    file: 'test_delete_project.ts',
    description: 'Verifies deleting projects and indexedDB storage cleanup'
  },
  {
    name: 'CAD Blueprint to 3D Plan Builder',
    file: 'test_cad_to_3d.ts',
    description: 'Verifies deterministic CAD topology extraction and autonomous 3D reconstruction'
  },
  {
    name: 'Floor Plan Accuracy & Constraint Solving',
    file: 'test_floorplan_accuracy.ts',
    description: 'Verifies SVG geometry extraction, dimensional accuracy, and constraint furniture solver'
  },
  {
    name: 'Agent-Built Guest Suite Validation',
    file: 'validate_layout.ts',
    description: 'End-to-end integration test of autonomous suite creation with furniture placement'
  }
];

async function runAll() {
  console.log('\n=============================================================');
  console.log('🧪 HOMESPACE.AI - RUNNING ALL TEST SUITES');
  console.log('=============================================================\n');

  const results: Array<{ name: string; file: string; passed: boolean; durationMs: number; error?: string }> = [];

  for (const suite of TEST_SUITES) {
    const fullPath = path.resolve(__dirname, suite.file);
    process.stdout.write(`▶ Running: ${suite.name} (${suite.file})... `);
    const start = Date.now();

    const proc = spawnSync('npx', ['tsx', fullPath], {
      shell: true,
      encoding: 'utf8',
      env: process.env
    });

    const durationMs = Date.now() - start;

    if (proc.status === 0) {
      console.log(`✅ PASSED (${(durationMs / 1000).toFixed(2)}s)`);
      results.push({ name: suite.name, file: suite.file, passed: true, durationMs });
    } else {
      console.log(`❌ FAILED (${(durationMs / 1000).toFixed(2)}s)`);
      const errorSnippet = proc.stderr || proc.stdout || 'Unknown error';
      results.push({
        name: suite.name,
        file: suite.file,
        passed: false,
        durationMs,
        error: errorSnippet.slice(-300)
      });
    }
  }

  console.log('\n=============================================================');
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('=============================================================');

  let passedCount = 0;
  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${r.name.padEnd(45)} | ${(r.durationMs / 1000).toFixed(2)}s`);
    if (r.passed) passedCount++;
  }

  console.log('-------------------------------------------------------------');
  console.log(`Total: ${results.length} suites | Passed: ${passedCount} | Failed: ${results.length - passedCount}`);
  console.log('=============================================================\n');

  if (passedCount < results.length) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
