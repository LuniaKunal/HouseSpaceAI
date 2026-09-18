import * as THREE from 'three';
import { ArchitectureInput, listSpaceBoundaries, resolveWallPieces } from '../geometry/architecture';
import { FT_TO_M } from '../types/scene';

/** The renderer consumes the same resolved pieces as placement validation. */
export function createArchitectureGroup(input: ArchitectureInput, fullHeight: boolean, selectedId?: string | null) {
  const group = new THREE.Group(); group.name = 'Architecture_WallsAndOpenings';
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    return materials.get(color)!;
  };
  const box = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * FT_TO_M, h * FT_TO_M, d * FT_TO_M), material(color));
    mesh.position.set(x * FT_TO_M, y * FT_TO_M, z * FT_TO_M);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  for (const p of resolveWallPieces(input)) {
    const top = Math.min(p.base + p.height, fullHeight ? Infinity : 3.6);
    if (top <= p.base) continue;
    const length = Math.hypot(p.end.x - p.start.x, p.end.z - p.start.z);
    const mesh = box(group, (p.start.x + p.end.x) / 2, (p.base + top) / 2, (p.start.z + p.end.z) / 2,
      length, top - p.base, p.thickness, p.id === selectedId ? '#71998d' : p.color ?? '#f2f0ea');
    mesh.rotation.y = -Math.atan2(p.end.z - p.start.z, p.end.x - p.start.x);
    mesh.userData = { id: p.id, type: 'wall' };
  }
  const walls = listSpaceBoundaries(input);
  for (const door of input.doors.filter(d => d.managed)) {
    const root = new THREE.Group();
    root.position.set(door.position.x * FT_TO_M, 0, door.position.z * FT_TO_M);
    root.rotation.y = THREE.MathUtils.degToRad(door.rotation);
    group.add(root);
    const thickness = walls.find(w => w.id === door.wallId)?.thickness ?? 0.45;
    const color = door.id === selectedId ? '#71998d' : '#806346';
    const height = fullHeight ? door.height : Math.min(door.height, 3.6);
    // Frame lives inside the opening, not through the adjoining masonry.
    for (const x of [-door.width / 2 + 0.04, door.width / 2 - 0.04]) box(root, x, height / 2, 0, 0.08, height, thickness + 0.06, color);
    if (fullHeight) box(root, 0, door.height - 0.04, 0, door.width, 0.08, thickness + 0.06, color);
    if (door.doorType === 'standard' || door.doorType === 'double') {
      const count = door.doorType === 'double' ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const right = count === 2 ? i === 1 : door.hinge === 'right';
        const sign = right ? -1 : 1, inward = (door.swing !== 'outward' ? 1 : -1) * (door.interiorSide ?? 1);
        const leafWidth = (door.width - 0.16) / count;
        const hinge = new THREE.Group(); hinge.position.x = (right ? door.width / 2 - 0.08 : -door.width / 2 + 0.08) * FT_TO_M;
        root.add(hinge);
        const points = Array.from({ length: 25 }, (_, k) => {
          const a = k / 24 * Math.PI / 2;
          return new THREE.Vector3(sign * Math.cos(a) * leafWidth * FT_TO_M, 0.025, inward * Math.sin(a) * leafWidth * FT_TO_M);
        });
        hinge.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#87a99c' })));
        const pivot = new THREE.Group(); pivot.rotation.y = -sign * inward * Math.PI / 2; hinge.add(pivot);
        box(pivot, sign * leafWidth / 2, height / 2, 0, leafWidth, height - 0.08, 0.11, color);
      }
    } else if (door.doorType !== 'arch') {
      box(root, 0, height / 2, -thickness / 2, door.width - 0.16, height - 0.08, 0.1, color);
    }
    root.traverse(child => { child.userData = { id: door.id, type: 'door' }; });
  }
  return group;
}

export function disposeArchitectureGroup(group: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  group.traverse(o => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
    }
  });
  materials.forEach(m => m.dispose());
}
