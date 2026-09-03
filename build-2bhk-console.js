// 2BHK Flat Builder — paste entire file into DevTools Console at http://localhost:4173/
// Runs purely through the WebMCP route: window.housespaceAgent.callTool (bridge -> executeWebMCPTool)
// Approve the "clear_scene" confirmation dialog when it pops up.
(async () => {
  const T = (name, input = {}) => window.housespaceAgent.callTool(name, input);
  const log = (m) => console.log(`%c[2BHK] ${m}`, 'color:#38bdf8;font-weight:bold');

  log('Clearing current space (approve the dialog)...');
  await T('clear_scene', {});

  const living = await T('create_room', { name: 'Living Room', width: 16, depth: 14, position: { x: 0, y: 0, z: 0 }, floorMaterial: 'hardwood_oak', wallColor: '#f8fafc' });
  const kitchen = await T('create_room', { name: 'Kitchen', width: 10, depth: 10, position: { x: 13, y: 0, z: -2 }, floorMaterial: 'ceramic_tile', wallColor: '#f1f5f9' });
  const master = await T('create_room', { name: 'Master Bedroom', width: 12, depth: 12, position: { x: -1, y: 0, z: 13 }, floorMaterial: 'hardwood_oak', wallColor: '#fafaf9' });
  const mtoilet = await T('create_room', { name: 'Master Toilet', width: 7, depth: 5, position: { x: 8.5, y: 0, z: 9.5 }, floorMaterial: 'ceramic_tile', wallColor: '#f1f5f9' });
  const bed2 = await T('create_room', { name: 'Bedroom 2', width: 11, depth: 11, position: { x: -13.5, y: 0, z: 0.5 }, floorMaterial: 'hardwood_walnut', wallColor: '#fafaf9' });
  const ctoilet = await T('create_room', { name: 'Common Toilet', width: 7, depth: 5, position: { x: -13.5, y: 0, z: 8.5 }, floorMaterial: 'ceramic_tile', wallColor: '#f1f5f9' });
  const balcony = await T('create_room', { name: 'Balcony', width: 12, depth: 5, position: { x: 0, y: 0, z: -9.5 }, floorMaterial: 'terrazzo', wallColor: '#f8fafc' });
  const R = { living: living.roomId, kitchen: kitchen.roomId, master: master.roomId, mtoilet: mtoilet.roomId, bed2: bed2.roomId, ctoilet: ctoilet.roomId, balcony: balcony.roomId };
  log('7 rooms created.');

  await T('connect_rooms', { roomIdA: R.living, roomIdB: R.kitchen, wallDirection: 'right', openingWidth: 5 });
  await T('connect_rooms', { roomIdA: R.living, roomIdB: R.master, wallDirection: 'below', openingWidth: 4 });
  await T('connect_rooms', { roomIdA: R.master, roomIdB: R.mtoilet, wallDirection: 'right', openingWidth: 3 });
  await T('connect_rooms', { roomIdA: R.living, roomIdB: R.bed2, wallDirection: 'left', openingWidth: 4 });
  await T('connect_rooms', { roomIdA: R.bed2, roomIdB: R.ctoilet, wallDirection: 'below', openingWidth: 3 });
  await T('connect_rooms', { roomIdA: R.living, roomIdB: R.balcony, wallDirection: 'above', openingWidth: 6 });
  log('6 doorway gates cut.');

  await T('place_door', { roomId: R.living, position: { x: 0, y: 0, z: -7 }, width: 3.5, doorType: 'standard' });
  await T('place_door', { roomId: R.master, position: { x: -1, y: 0, z: 7 }, width: 3.2, doorType: 'standard' });
  await T('place_door', { roomId: R.bed2, position: { x: -8, y: 0, z: 0.5 }, width: 3.2, doorType: 'standard' });
  await T('place_window', { roomId: R.living, position: { x: 8, y: 4, z: 5.5 }, width: 5, height: 4.5, elevation: 3 });
  await T('place_window', { roomId: R.master, position: { x: -1, y: 4, z: 19 }, width: 5, height: 4.5, elevation: 3 });
  await T('place_window', { roomId: R.bed2, position: { x: -19, y: 4, z: 0.5 }, width: 4.5, height: 4.5, elevation: 3 });
  await T('place_window', { roomId: R.kitchen, position: { x: 18, y: 4, z: -2 }, width: 4, height: 3.5, elevation: 4 });
  log('3 doors + 4 windows placed.');

  const F = [
    { type: 'sofa_4seater', roomId: R.living, name: '4-Seater Luxury Sofa', position: { x: -3, y: 0, z: 4.5 }, rotation: { x: 0, y: 180, z: 0 } },
    { type: 'coffee_table_center', roomId: R.living, name: 'Glass Center Table', position: { x: 0, y: 0, z: 4.5 } },
    { type: 'tv_unit_grand', roomId: R.living, name: 'Grand TV Unit', position: { x: 5, y: 0, z: 5.5 }, rotation: { x: 0, y: -90, z: 0 } },
    { type: 'kitchen_counter_hob', roomId: R.kitchen, name: 'Hob Counter', position: { x: 15.5, y: 0, z: -5.5 } },
    { type: 'kitchen_counter_sink', roomId: R.kitchen, name: 'Sink Counter', position: { x: 15.5, y: 0, z: -1.5 } },
    { type: 'refrigerator_french_door', roomId: R.kitchen, name: 'French-Door Refrigerator', position: { x: 9.5, y: 0, z: 1.5 } },
    { type: 'bed_double', roomId: R.master, name: 'King Double Bed', position: { x: -3, y: 0, z: 15 } },
    { type: 'nightstand_modern', roomId: R.master, name: 'Nightstand Left', position: { x: -5.8, y: 0, z: 15 } },
    { type: 'nightstand_modern', roomId: R.master, name: 'Nightstand Right', position: { x: -0.2, y: 0, z: 15 } },
    { type: 'wardrobe_sliding', roomId: R.master, name: 'Sliding Wardrobe', position: { x: 3, y: 0, z: 17.5 } },
    { type: 'tv_console_bedroom', roomId: R.master, name: 'Bedroom TV Console', position: { x: -1, y: 0, z: 8 } },
    { type: 'bed_guest_double', roomId: R.bed2, name: 'Guest Double Bed', position: { x: -15, y: 0, z: 3 } },
    { type: 'wardrobe_sliding', roomId: R.bed2, name: 'Bedroom 2 Wardrobe', position: { x: -17.5, y: 0, z: -3.5 } },
    { type: 'study_table_desk', roomId: R.bed2, name: 'Study Desk', position: { x: -10, y: 0, z: -3.5 }, rotation: { x: 0, y: 90, z: 0 } },
    { type: 'bathroom_wc_commode', roomId: R.mtoilet, name: 'Master WC', position: { x: 10.5, y: 0, z: 11 } },
    { type: 'bathroom_vanity_basin', roomId: R.mtoilet, name: 'Master Vanity', position: { x: 6.5, y: 0, z: 8 } },
    { type: 'bathroom_shower_cubicle', roomId: R.mtoilet, name: 'Shower Cubicle', position: { x: 10.5, y: 0, z: 8 } },
    { type: 'bathroom_wc_commode', roomId: R.ctoilet, name: 'Common WC', position: { x: -11.5, y: 0, z: 10 } },
    { type: 'bathroom_vanity_basin', roomId: R.ctoilet, name: 'Common Vanity', position: { x: -15.5, y: 0, z: 7 } },
    { type: 'planter_balcony_pots', roomId: R.balcony, name: 'Balcony Planters', position: { x: 0, y: 0, z: -11 } },
    { type: 'armchair_accent', roomId: R.balcony, name: 'Balcony Lounge Chair', position: { x: -3.5, y: 0, z: -9 }, rotation: { x: 0, y: 35, z: 0 } },
  ];
  for (const f of F) await T('add_furniture', f);
  log('21 furniture items placed.');

  await T('switch_view', { mode: '3d', angle: 'perspective', targetRoomId: R.living });
  const state = await T('get_scene_state', { includeFurniture: true });
  log(`DONE: ${state.dimensions.roomCount} rooms, ${state.dimensions.furnitureCount} furniture, ${state.dimensions.totalAreaSqFt} sq ft.`);
  return state.dimensions;
})();
