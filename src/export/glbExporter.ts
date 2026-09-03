import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { sceneStore } from '../state/sceneStore';
import { FT_TO_M } from '../types/scene';

export async function exportGLBScene(includeMetadata = true): Promise<Blob> {
  const scene = new THREE.Scene();
  const data = sceneStore.getData();

  // Create room floors
  data.rooms.forEach(room => {
    const floorGeo = new THREE.BoxGeometry(
      room.width * FT_TO_M,
      0.1 * FT_TO_M,
      room.depth * FT_TO_M
    );
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.5
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(
      room.position.x * FT_TO_M,
      0,
      room.position.z * FT_TO_M
    );
    floorMesh.name = `Room_${room.name.replace(/\s+/g, '_')}_Floor`;
    if (includeMetadata) {
      floorMesh.userData = {
        roomId: room.id,
        roomName: room.name,
        areaSqFt: room.width * room.depth,
        material: room.floorMaterial
      };
    }
    scene.add(floorMesh);
  });

  // Create furniture representation
  data.furniture.forEach(item => {
    const itemGeo = new THREE.BoxGeometry(
      (item.dimensions.x * item.scale.x) * FT_TO_M,
      (item.dimensions.y * item.scale.y) * FT_TO_M,
      (item.dimensions.z * item.scale.z) * FT_TO_M
    );
    const itemMat = new THREE.MeshStandardMaterial({
      color: item.color ? parseInt(item.color.replace('#', '0x')) : 0x5588cc,
      roughness: 0.4
    });
    const itemMesh = new THREE.Mesh(itemGeo, itemMat);
    itemMesh.position.set(
      item.position.x * FT_TO_M,
      (item.position.y + (item.dimensions.y * item.scale.y) / 2) * FT_TO_M,
      item.position.z * FT_TO_M
    );
    itemMesh.rotation.set(
      THREE.MathUtils.degToRad(item.rotation.x),
      THREE.MathUtils.degToRad(item.rotation.y),
      THREE.MathUtils.degToRad(item.rotation.z)
    );
    itemMesh.name = `Furniture_${item.name.replace(/\s+/g, '_')}`;
    if (includeMetadata) {
      itemMesh.userData = {
        objectId: item.id,
        objectType: item.type,
        category: item.category,
        material: item.material
      };
    }
    scene.add(itemMesh);
  });

  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      gltf => {
        if (gltf instanceof ArrayBuffer) {
          resolve(new Blob([gltf], { type: 'model/gltf-binary' }));
        } else {
          const output = JSON.stringify(gltf, null, 2);
          resolve(new Blob([output], { type: 'application/json' }));
        }
      },
      error => reject(error),
      { binary: true }
    );
  });
}
