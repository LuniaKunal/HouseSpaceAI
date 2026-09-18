import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CATALOG_ITEMS } from '../src/data/catalogData';
import { createFurnitureMeshGroup } from '../src/canvas/furnitureMeshes';
import { disposeFurniture } from '../src/canvas/furnitureRealism';
import { roundedPart, finishFurniture } from '../src/canvas/furnitureRealism';

// RoundedBoxGeometry inherits unit-box parameters: finishing must preserve real dimensions.
const smallGroup = new THREE.Group();
roundedPart(smallGroup, [0.12, 0.04, 0.3], [0, 0, 0], new THREE.MeshStandardMaterial());
finishFurniture(smallGroup);
const smallBounds = new THREE.Box3().setFromObject(smallGroup).getSize(new THREE.Vector3());
assert.ok(Math.abs(smallBounds.x - 0.12) < 0.001 && Math.abs(smallBounds.y - 0.04) < 0.001);
disposeFurniture(smallGroup);

let totalTriangles = 0;
for (const entry of CATALOG_ITEMS) {
  const item = { id: entry.id, name: entry.name, type: entry.type, category: entry.category,
    dimensions: entry.defaultDimensions, material: entry.defaultMaterial, color: entry.defaultColor,
    position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, locked: false };
  const group = createFurnitureMeshGroup(item);
  let triangles = 0, meshes = 0;
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    meshes++;
    const positions = object.geometry.getAttribute('position');
    assert.ok(positions && Array.from(positions.array).every(Number.isFinite), `${entry.type}: invalid vertices`);
    triangles += (object.geometry.index?.count ?? positions.count) / 3 * (object instanceof THREE.InstancedMesh ? object.count : 1);
  });
  assert.ok(meshes > 1, `${entry.type}: fell through to placeholder`);
  assert.ok(triangles < 80000, `${entry.type}: unreasonable geometry budget (${triangles})`);
  const bounds = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  assert.ok([bounds.x, bounds.y, bounds.z].every(n => Number.isFinite(n) && n > 0), `${entry.type}: invalid bounds`);
  const scaled = createFurnitureMeshGroup({ ...item, scale: { x: 1.5, y: 1.25, z: 1.5 } });
  const scaledBounds = new THREE.Box3().setFromObject(scaled).getSize(new THREE.Vector3());
  assert.ok(scaledBounds.x > bounds.x && scaledBounds.y > bounds.y, `${entry.type}: dimensions ignored`);
  totalTriangles += triangles;
  disposeFurniture(group); disposeFurniture(scaled);
}
console.log(`Validated all ${CATALOG_ITEMS.length} furniture types; ${totalTriangles.toLocaleString()} triangles for one of each.`);
