import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type Surface = 'fabric' | 'wood' | 'stone' | 'ceramic' | 'metal' | 'leaf';
const textures = new Map<string, THREE.DataTexture>();

// Small, deterministic, tileable maps work offline and in both renderer backends.
function surfaceMap(kind: Surface, bump = false): THREE.DataTexture {
  const key = `${kind}:${bump}`;
  const cached = textures.get(key);
  if (cached) return cached;
  const size = 256;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    const grain = Math.sin(u * 23 + 1.8 * Math.sin(v) + 0.5 * Math.sin(v * 3));
    const weave = Math.sin(u * 64) * Math.sin(v * 64);
    const vein = Math.pow((Math.sin(u * 2 + v + 1.5 * Math.sin(v * 2) + 0.3 * Math.sin(u * 5)) + 1) / 2, 18);
    const value = kind === 'wood' ? 0.9 + grain * 0.023 + Math.sin(u * 79 + Math.sin(v * 2)) * 0.018
      : kind === 'fabric' ? 0.92 + weave * 0.055
      : kind === 'stone' ? 0.98 - vein * 0.1
      : kind === 'metal' ? 0.94 + Math.sin(u * 110) * 0.035
      : kind === 'leaf' ? 0.85 + Math.cos(u * 9 + v * 4) * 0.1 : 0.98;
    const shade = Math.round(255 * (bump ? (value - 0.5) * 1.8 : value));
    const i = (y * size + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = THREE.MathUtils.clamp(shade, 0, 255);
    pixels[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.colorSpace = bump ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  textures.set(key, texture);
  return texture;
}

export function surfaceMaterial(kind: Surface, color: THREE.ColorRepresentation): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: kind === 'fabric' ? 0.93 : kind === 'wood' ? 0.43 : kind === 'ceramic' ? 0.17 : kind === 'metal' ? 0.26 : 0.32,
    metalness: kind === 'metal' ? 0.92 : 0,
    map: surfaceMap(kind), bumpMap: surfaceMap(kind, true),
    bumpScale: kind === 'fabric' ? 0.00065 : kind === 'wood' ? 0.0005 : 0.00015,
    clearcoat: kind === 'wood' ? 0.22 : kind === 'ceramic' ? 0.5 : 0,
    clearcoatRoughness: 0.3,
    sheen: kind === 'fabric' ? 0.45 : 0,
    sheenColor: new THREE.Color(color), sheenRoughness: 0.85,
  });
  mat.userData.surface = kind;
  return mat;
}

export function roundedPart(parent: THREE.Group, dimensions: number[], position: number[], mat: THREE.Material, radius = 0.015): THREE.Mesh {
  const [w, h, d] = dimensions;
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 2, h / 2, d / 2)), mat);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function insetSink(parent: THREE.Group, width: number, height: number, depth: number, stone: THREE.Material, metal: THREE.Material, cabinet: THREE.Material) {
  const sw = width * 0.48, sd = depth * 0.62, top = height * 0.91;
  roundedPart(parent, [width, height * 0.65, depth], [0, height * 0.325, 0], cabinet);
  // Four countertop rails surround a real opening instead of covering the bowl.
  for (const side of [-1, 1]) {
    roundedPart(parent, [(width - sw) / 2, 0.04, depth], [side * (width + sw) / 4, top, 0], stone, 0.004);
    roundedPart(parent, [sw, 0.04, (depth - sd) / 2], [0, top, side * (depth + sd) / 4], stone, 0.004);
    roundedPart(parent, [0.014, 0.16, sd], [side * sw / 2, top - 0.065, 0], metal, 0.006);
    roundedPart(parent, [sw, 0.16, 0.014], [0, top - 0.065, side * sd / 2], metal, 0.006);
  }
  roundedPart(parent, [sw, 0.014, sd], [0, top - 0.145, 0], metal, 0.005);
  const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.003, 24), surfaceMaterial('metal', 0x44494b));
  drain.position.set(0, top - 0.135, 0); parent.add(drain);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, top + 0.02, -depth * 0.4), new THREE.Vector3(0, top + 0.26, -depth * 0.4),
    new THREE.Vector3(0, top + 0.31, -depth * 0.23), new THREE.Vector3(0, top + 0.21, -depth * 0.15),
  ]);
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.012, 8, false), metal));
}

export function seam(parent: THREE.Object3D, width: number, depth: number, y: number, material: THREE.Material) {
  const points: THREE.Vector3[] = [];
  const radius = Math.min(width, depth) * 0.08;
  for (let corner = 0; corner < 4; corner++) {
    const a = corner * Math.PI / 2;
    const cx = (corner === 0 || corner === 3 ? 1 : -1) * (width / 2 - radius);
    const cz = (corner < 2 ? 1 : -1) * (depth / 2 - radius);
    for (let j = 0; j <= 4; j++) {
      const angle = a + j / 4 * Math.PI / 2;
      points.push(new THREE.Vector3(cx + Math.cos(angle) * radius, y, cz + Math.sin(angle) * radius));
    }
  }
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 48, 0.002, 4, true), material);
  parent.add(tube);
}

export function drapedCover(parent: THREE.Group, width: number, depth: number, height: number, z: number, material: THREE.Material) {
  const geometry = new THREE.PlaneGeometry(width, depth, 40, 32);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), v = positions.getY(i);
    const u = x / width, t = v / depth;
    const drop = Math.pow(Math.max(0, (Math.abs(u) - 0.43) / 0.07), 1.5) * 0.09;
    const fold = 0.009 * Math.sin(u * 31 + t * 7) * Math.sin(t * 13 + u * 4)
      + 0.004 * Math.sin(u * 67 - t * 19);
    positions.setXYZ(i, x, fold - drop, v);
  }
  // Mapping plane Y onto positive Z reverses its winding; flip the index order.
  const index = geometry.index!;
  for (let i = 0; i < index.count; i += 3) {
    const b = index.getX(i + 1); index.setX(i + 1, index.getX(i + 2)); index.setX(i + 2, b);
  }
  geometry.computeVertexNormals();
  const cover = new THREE.Mesh(geometry, material);
  cover.position.set(0, height, z);
  cover.castShadow = cover.receiveShadow = true;
  parent.add(cover);
}

/** Finish legacy catalog meshes without changing their placement or dimensions. */
export function finishFurniture(group: THREE.Group): void {
  const replaced = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = object.receiveShadow = true;
    const old = object.geometry;
    // RoundedBoxGeometry inherits BoxGeometry's type/parameters (a unit cube).
    // Re-finishing it would silently replace correctly sized parts with 1m cubes.
    if (old.type !== 'BoxGeometry' || old instanceof RoundedBoxGeometry) return;
    let geometry = replaced.get(old);
    if (!geometry) {
      const { width, height, depth } = (old as THREE.BoxGeometry).parameters;
      const mat = Array.isArray(object.material) ? object.material[0] : object.material;
      const soft = mat.userData.surface === 'fabric';
      geometry = new RoundedBoxGeometry(width, height, depth, soft ? 3 : 1, Math.min(width, height, depth) * (soft ? 0.28 : 0.08));
      replaced.set(old, geometry);
    }
    object.geometry = geometry;
  });
  replaced.forEach((_, old) => old.dispose());
}

// Textures are shared for the lifetime of the application; groups own geometry/materials.
export function disposeFurniture(group: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
  });
  geometries.forEach(g => g.dispose());
  materials.forEach(m => m.dispose());
}

/** Neutral studio reflections give metal and glass something to reflect. */
export function createFurnitureEnvironment(): THREE.DataTexture {
  const w = 256, h = 128, data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sky = 0.28 + 0.3 * Math.sin(y / h * Math.PI);
    const window = (x > 30 && x < 65 && y > 24 && y < 74) || (x > 165 && x < 188 && y > 36 && y < 68);
    const value = window ? 255 : Math.round(sky * 255);
    const i = (y * w + x) * 4;
    data[i] = value; data[i + 1] = Math.round(value * 0.98); data[i + 2] = Math.round(value * 0.94); data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, w, h);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function foliage(parent: THREE.Group, x: number, y: number, z: number, height: number, spread: number, material: THREE.Material, seed: number) {
  const stemMat = surfaceMaterial('wood', 0x586044);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.009, height, 6), stemMat);
  stem.position.set(x, y + height / 2, z);
  parent.add(stem);
  const leaves = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), material, 11);
  const leaf = new THREE.Object3D();
  for (let i = 0; i < 11; i++) {
    const a = i * 2.39996 + seed;
    const length = spread * (0.7 + 0.25 * Math.sin(i * 4 + seed));
    leaf.scale.set(length * 0.3, 0.009, length);
    leaf.position.set(x + Math.sin(a) * length * 0.6, y + height * (0.3 + i * 0.058), z + Math.cos(a) * length * 0.6);
    leaf.rotation.set(0.3 + Math.sin(i) * 0.4, a, 0.25);
    leaf.updateMatrix();
    leaves.setMatrixAt(i, leaf.matrix);
  }
  leaves.castShadow = leaves.receiveShadow = true;
  parent.add(leaves);
}
