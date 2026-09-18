import assert from 'node:assert/strict';
import { sceneStore } from '../src/state/sceneStore';
import { THREE_BHK_SAMPLE_SCENE } from '../src/data/floorplan3bhkSampleLayout';
import { auditFurniture, repairFurnitureLayout, findFurniturePlacement, furnitureFitsRoom } from '../src/geometry/furniturePlacement';

sceneStore.clearScene();
const room = sceneStore.createRoom({ name: 'Collision regression', width: 14, depth: 10, position: { x: 0, y: 0, z: 0 } });
const bed = sceneStore.addFurniture({ type: 'bed_double', roomId: room.id, position: { x: 0, y: 0, z: 0 } });
const sofa = sceneStore.addFurniture({ type: 'armchair_accent', roomId: room.id, position: { x: 0, y: 0, z: 0 } });
let items = sceneStore.getData().furniture;
const a = items.find(i => i.id === bed.id)!, b = items.find(i => i.id === sofa.id)!;
assert.ok(Math.abs(a.position.x - b.position.x) >= (a.dimensions.x + b.dimensions.x) / 2 || Math.abs(a.position.z - b.position.z) >= (a.dimensions.z + b.dimensions.z) / 2, 'New furniture overlaps existing bed');
sceneStore.moveObject(sofa.id, { x: 6.9, y: 0, z: 0 });
const moved = sceneStore.getData().furniture.find(i => i.id === sofa.id)!;
assert.ok(moved.position.x + moved.dimensions.x / 2 <= 7 - room.wallThickness / 2, 'Furniture penetrates room wall');
console.log('Furniture placement and wall clearance checks passed.');

const sample = THREE_BHK_SAMPLE_SCENE;
const repaired = repairFurnitureLayout(sample.furniture, sample.rooms, sample.customWalls);
console.log('Remaining sample conflicts:', repaired.unresolved);
assert.equal(repaired.unresolved.length, 0, 'Sample furniture still overlaps after repair');
assert.equal(auditFurniture(repaired.furniture, sample.rooms, sample.customWalls).length, 0);

sceneStore.loadSceneData(sample);
const original = JSON.stringify(sceneStore.getData().furniture);
assert.equal(sceneStore.fixFurnitureOverlaps().success, true);
assert.equal(sceneStore.undo(), true);
assert.equal(JSON.stringify(sceneStore.getData().furniture), original, 'Repair must undo as a single edit');
assert.equal(sceneStore.redo(), true);
assert.equal(auditFurniture(sceneStore.getData().furniture, sample.rooms, sample.customWalls).length, 0);
const stable = JSON.stringify(sceneStore.getData().furniture);
assert.equal(sceneStore.scaleObject(sample.furniture[0].id, { x: 100, y: 1, z: 100 }), false);
assert.equal(JSON.stringify(sceneStore.getData().furniture), stable, 'Failed resize modified the layout');

const locked = [{ ...a, locked: true }, { ...b, position: a.position, locked: true }];
const lockedResult = repairFurnitureLayout(locked, [room], []);
assert.ok(lockedResult.unresolved.length > 0, 'Locked collisions must be reported');
assert.deepEqual(lockedResult.furniture, locked);
const notched = { ...room, footprint: undefined, notch: { corner: 'top-right' as const, width: 5, depth: 5 } };
const inNotch = { ...b, position: { x: 4.5, y: 0, z: -3 } };
assert.equal(furnitureFitsRoom(inNotch, notched), false);
const outsideNotch = findFurniturePlacement(inNotch, [notched], [], []);
assert.ok(outsideNotch && furnitureFitsRoom(outsideNotch, notched));
const partition = { id: 'partition', roomId: room.id, start: { x: 0, z: -5 }, end: { x: 0, z: 5 }, height: 9, thickness: 0.5 };
const acrossWall = { ...b, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 90, z: 0 } };
const besideWall = findFurniturePlacement(acrossWall, [room], [], [partition]);
assert.ok(besideWall && auditFurniture([besideWall], [room], [partition]).length === 0);
assert.equal(findFurniturePlacement({ ...b, roomId: undefined, position: { x: 7.5, y: 0, z: 0 } }, [room], [], []), null, 'Unassigned furniture crossed an exterior wall');
console.log('Full apartment, locks, Undo, failed resize, rotation, notch and partition checks passed.');
