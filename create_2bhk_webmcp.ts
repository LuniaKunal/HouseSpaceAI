import { ensureWebMCPContextReady, registerAllWebMCPTools } from './src/webmcp/bridge';
import { ALL_TOOLS, executeWebMCPTool } from './src/webmcp/registry';
import { projectStore } from './src/state/projectStore';
import { sceneStore } from './src/state/sceneStore';

// Minimal browser polyfills for Node (same as test_webmcp_audit.ts)
if (typeof (globalThis as any).EventTarget === 'undefined') {
  const { EventTarget } = require('events');
  (globalThis as any).EventTarget = EventTarget;
}
class FakeDoc extends (globalThis as any).EventTarget {}
const mockDocument = new FakeDoc() as any;
const mockWindow = new (globalThis as any).EventTarget() as any;
mockWindow.crossOriginIsolated = true;
(globalThis as any).document = mockDocument;
(globalThis as any).window = mockWindow;

const T = (name: string, input: any = {}) => executeWebMCPTool(name, input, 'user');

async function main() {
  console.log('====================================================');
  console.log('   Building 2BHK Flat via WebMCP Tool Route');
  console.log('====================================================\n');

  await projectStore.init();
  ensureWebMCPContextReady();
  const reg = await registerAllWebMCPTools();
  console.log(`Registered ${reg.registeredCount} WebMCP tools.\n`);

  await T('clear_scene', {});
  console.log('[1/7] Cleared current space.');

  // --- Rooms (feet, wall-to-wall contiguous layout) ---
  const living = await T('create_room', { name: 'Living Room', width: 16, depth: 14, position: { x: 0, y: 0, z: 0 }, floorMaterial: 'hardwood_oak', wallColor: '#f8fafc' });
  const kitchen = await T('create_room', { name: 'Kitchen', width: 10, depth: 10, position: { x: 13, y: 0, z: -2 }, floorMaterial: 'ceramic_tile', wallColor: '#f1f5f9' });
  const master = await T('create_room', { name: 'Master Bedroom', width: 12, depth: 12, position: { x: -1, y: 0, z: 13 }, floorMaterial: 'hardwood_oak', wallColor: '#fafaf9' });
  const mtoilet = await T('create_room', { name: 'Master Toilet', width: 7, depth: 5, position: { x: 8.5, y: 0, z: 9.5 }, floorMaterial: 'ceramic_tile', wallColor: '#f1f5f9' });
  const bed2 = await T('create_room', { name: 'Bedroom 2', width: 11, depth: 11, position: { x: -13.5, y: 0, z: 0.5 }, floorMaterial: 'hardwood_walnut', wallColor: '#fafaf9' });
  const ctoilet = await T('create_room', { name: 'Common Toilet', width: 7, depth: 5, position: { x: -13.5, y: 0, z: 8.5 }, floorMaterial: 'ceramic_tile', wallColor: '#f1f5f9' });
  const balcony = await T('create_room', { name: 'Balcony', width: 12, depth: 5, position: { x: 0, y: 0, z: -9.5 }, floorMaterial: 'terrazzo', wallColor: '#f8fafc' });
  console.log('[2/7] Created 7 rooms (Living, Kitchen, Master Bed, Master Toilet, Bedroom 2, Common Toilet, Balcony).');

  const R = { living: living.roomId, kitchen: kitchen.roomId, master: master.roomId, mtoilet: mtoilet.roomId, bed2: bed2.roomId, ctoilet: ctoilet.roomId, balcony: balcony.roomId };

  // --- Connect rooms with doorway gates ---
  await T('connect_rooms', { roomIdA: R.living, roomIdB: R.kitchen, wallDirection: 'right', openingWidth: 5 });
  await T('connect_rooms', { roomIdA: R.living, roomIdB: R.master, wallDirection: 'below', openingWidth: 4 });
  await T('connect_rooms', { roomIdA: R.master, roomIdB: R.mtoilet, wallDirection: 'right', openingWidth: 3 });
  await T('connect_rooms', { roomIdA: R.living, roomIdB: R.bed2, wallDirection: 'left', openingWidth: 4 });
  await T('connect_rooms', { roomIdA: R.bed2, roomIdB: R.ctoilet, wallDirection: 'below', openingWidth: 3 });
  await T('connect_rooms', { roomIdA: R.living, roomIdB: R.balcony, wallDirection: 'above', openingWidth: 6 });
  console.log('[3/7] Connected rooms with 6 doorway gates.');

  // --- Doors & windows ---
  await T('place_door', { roomId: R.living, position: { x: 0, y: 0, z: -7 }, width: 3.5, doorType: 'standard' });
  await T('place_door', { roomId: R.master, position: { x: -1, y: 0, z: 7 }, width: 3.2, doorType: 'standard' });
  await T('place_door', { roomId: R.bed2, position: { x: -8, y: 0, z: 0.5 }, width: 3.2, doorType: 'standard' });
  await T('place_window', { roomId: R.living, position: { x: 8, y: 4, z: 5.5 }, width: 5, height: 4.5, elevation: 3 });
  await T('place_window', { roomId: R.master, position: { x: -1, y: 4, z: 19 }, width: 5, height: 4.5, elevation: 3 });
  await T('place_window', { roomId: R.bed2, position: { x: -19, y: 4, z: 0.5 }, width: 4.5, height: 4.5, elevation: 3 });
  await T('place_window', { roomId: R.kitchen, position: { x: 18, y: 4, z: -2 }, width: 4, height: 3.5, elevation: 4 });
  console.log('[4/7] Placed 3 doors + 4 windows.');

  // --- Furniture ---
  const F: Array<[string, any]> = [
    ['Living sofa', { type: 'sofa_4seater', roomId: R.living, name: '4-Seater Luxury Sofa', position: { x: -3, y: 0, z: 4.5 }, rotation: { x: 0, y: 180, z: 0 } }],
    ['Coffee table', { type: 'coffee_table_center', roomId: R.living, name: 'Glass Center Table', position: { x: 0, y: 0, z: 4.5 } }],
    ['TV unit', { type: 'tv_unit_grand', roomId: R.living, name: 'Grand TV Unit', position: { x: 5, y: 0, z: 5.5 }, rotation: { x: 0, y: -90, z: 0 } }],
    ['Hob counter', { type: 'kitchen_counter_hob', roomId: R.kitchen, name: 'Hob Counter', position: { x: 15.5, y: 0, z: -5.5 } }],
    ['Sink counter', { type: 'kitchen_counter_sink', roomId: R.kitchen, name: 'Sink Counter', position: { x: 15.5, y: 0, z: -1.5 } }],
    ['Fridge', { type: 'refrigerator_french_door', roomId: R.kitchen, name: 'French-Door Refrigerator', position: { x: 9.5, y: 0, z: 1.5 } }],
    ['Master bed', { type: 'bed_double', roomId: R.master, name: 'King Double Bed', position: { x: -3, y: 0, z: 15 } }],
    ['Nightstand L', { type: 'nightstand_modern', roomId: R.master, name: 'Nightstand Left', position: { x: -5.8, y: 0, z: 15 } }],
    ['Nightstand R', { type: 'nightstand_modern', roomId: R.master, name: 'Nightstand Right', position: { x: -0.2, y: 0, z: 15 } }],
    ['Master wardrobe', { type: 'wardrobe_sliding', roomId: R.master, name: 'Sliding Wardrobe', position: { x: 3, y: 0, z: 17.5 } }],
    ['Bedroom TV console', { type: 'tv_console_bedroom', roomId: R.master, name: 'Bedroom TV Console', position: { x: -1, y: 0, z: 8 } }],
    ['Bed 2 bed', { type: 'bed_guest_double', roomId: R.bed2, name: 'Guest Double Bed', position: { x: -15, y: 0, z: 3 } }],
    ['Bed 2 wardrobe', { type: 'wardrobe_sliding', roomId: R.bed2, name: 'Bedroom 2 Wardrobe', position: { x: -17.5, y: 0, z: -3.5 } }],
    ['Study desk', { type: 'study_table_desk', roomId: R.bed2, name: 'Study Desk', position: { x: -10, y: 0, z: -3.5 }, rotation: { x: 0, y: 90, z: 0 } }],
    ['Master WC', { type: 'bathroom_wc_commode', roomId: R.mtoilet, name: 'Master WC', position: { x: 10.5, y: 0, z: 11 } }],
    ['Master vanity', { type: 'bathroom_vanity_basin', roomId: R.mtoilet, name: 'Master Vanity', position: { x: 6.5, y: 0, z: 8 } }],
    ['Shower', { type: 'bathroom_shower_cubicle', roomId: R.mtoilet, name: 'Shower Cubicle', position: { x: 10.5, y: 0, z: 8 } }],
    ['Common WC', { type: 'bathroom_wc_commode', roomId: R.ctoilet, name: 'Common WC', position: { x: -11.5, y: 0, z: 10 } }],
    ['Common vanity', { type: 'bathroom_vanity_basin', roomId: R.ctoilet, name: 'Common Vanity', position: { x: -15.5, y: 0, z: 7 } }],
    ['Balcony planters', { type: 'planter_balcony_pots', roomId: R.balcony, name: 'Balcony Planters', position: { x: 0, y: 0, z: -11 } }],
    ['Balcony chair', { type: 'armchair_accent', roomId: R.balcony, name: 'Balcony Lounge Chair', position: { x: -3.5, y: 0, z: -9 }, rotation: { x: 0, y: 35, z: 0 } }],
  ];
  for (const [label, input] of F) {
    await T('add_furniture', input);
  }
  console.log(`[5/7] Placed ${F.length} furniture items.`);

  // --- Finishing touches ---
  await T('switch_view', { mode: '3d', angle: 'perspective', targetRoomId: R.living });
  console.log('[6/7] Camera set to 3D perspective on Living Room.');

  const state = await T('get_scene_state', { includeFurniture: true });
  console.log('[7/7] Scene verified.');
  console.log('\n----------------------------------------------------');
  console.log(`Rooms: ${state.dimensions.roomCount}, Furniture: ${state.dimensions.furnitureCount}, Area: ${state.dimensions.totalAreaSqFt} sq ft`);
  state.rooms.forEach((r: any, i: number) => {
    console.log(`  [${i + 1}] ${r.name} (${r.width}x${r.depth} ft) id=${r.id}`);
  });
  console.log(`Gates: ${state.connectionGates.length}, Doors: ${state.doors.length}, Windows: ${state.windows.length}`);
  console.log(`Tool count: ${Object.keys(ALL_TOOLS).length}`);
  console.log('====================================================');
  console.log('2BHK BUILD COMPLETE (Node-side WebMCP route proof)');
  console.log('Room IDs (for reference):', JSON.stringify(R, null, 2));
}

main().catch(err => {
  console.error('2BHK build failed:', err);
  process.exit(1);
});
