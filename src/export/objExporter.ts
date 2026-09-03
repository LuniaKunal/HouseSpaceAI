import * as THREE from 'three';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { sceneStore } from '../state/sceneStore';
import { FT_TO_M } from '../types/scene';

export function exportOBJScene(): Blob {
  const scene = new THREE.Scene();
  const data = sceneStore.getData();

  // Rooms
  data.rooms.forEach(room => {
    const geo = new THREE.BoxGeometry(
      room.width * FT_TO_M,
      0.1 * FT_TO_M,
      room.depth * FT_TO_M
    );
    const mat = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(room.position.x * FT_TO_M, 0, room.position.z * FT_TO_M);
    mesh.name = `Room_${room.name.replace(/\s+/g, '_')}`;
    scene.add(mesh);
  });

  // Furniture
  data.furniture.forEach(item => {
    const geo = new THREE.BoxGeometry(
      (item.dimensions.x * item.scale.x) * FT_TO_M,
      (item.dimensions.y * item.scale.y) * FT_TO_M,
      (item.dimensions.z * item.scale.z) * FT_TO_M
    );
    const mat = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      item.position.x * FT_TO_M,
      (item.position.y + (item.dimensions.y * item.scale.y) / 2) * FT_TO_M,
      item.position.z * FT_TO_M
    );
    mesh.name = `Object_${item.name.replace(/\s+/g, '_')}`;
    scene.add(mesh);
  });

  const exporter = new OBJExporter();
  const result = exporter.parse(scene);
  return new Blob([result], { type: 'text/plain' });
}
