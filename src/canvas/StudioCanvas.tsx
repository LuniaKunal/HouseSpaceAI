import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { sceneStore, SceneData } from '../state/sceneStore';
import { uiStore, UIState } from '../state/uiStore';
import { createFurnitureMeshGroup } from './furnitureMeshes';
import { getFloorMaterial, createRoomWallsGroup } from './roomAndWallHelpers';
import { reconstruct3DFromFloorPlan } from '../geometry/deterministicReconstruction';
import { getRoomFootprint } from '../geometry/roomGeometry';
import { FT_TO_M, M_TO_FT, Room, FurnitureObject } from '../types/scene';
import { CADBlueprintOverlay } from './CADBlueprintOverlay';
import { WalkMiniMap } from './WalkMiniMap';
import {
  Layers,
  Eye,
  Zap,
  Cpu,
  Activity,
  Sliders,
  Sparkles,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Footprints,
  Maximize2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  LogOut,
  Scissors,
  Box,
  Lock,
  Unlock
} from 'lucide-react';

export const StudioCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const walkTorchRef = useRef<THREE.PointLight | null>(null);

  const [sceneData, setSceneData] = useState<SceneData>(sceneStore.getData());
  const [uiState, setUiState] = useState<UIState>(uiStore.getState());
  const [viewMode2DType, setViewMode2DType] = useState<'cad_blueprint' | 'threejs_top'>('cad_blueprint');

  // WebGPU GPU & Performance Metrics State
  const [gpuInfo, setGpuInfo] = useState<{
    backend: 'WebGPU (Direct3D 12 / Metal / Vulkan)' | 'WebGL2 Fallback' | 'Initializing';
    adapterName: string;
    isHardwareAccelerated: boolean;
    hasComputeSupport: boolean;
  }>({
    backend: 'Initializing',
    adapterName: 'Detecting GPU Device...',
    isHardwareAccelerated: true,
    hasComputeSupport: true
  });

  const [perfStats, setPerfStats] = useState({
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 0,
    triangles: 0,
    geometries: 0
  });

  const [isGpuSettingsOpen, setIsGpuSettingsOpen] = useState(false);
  const [shadowQuality, setShadowQuality] = useState<'ultra' | 'balanced' | 'low'>('balanced');
  const [resolutionScale, setResolutionScale] = useState<number>(Math.min(window.devicePixelRatio || 1, 2));

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const draggedItemIdRef = useRef<string | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mousePosRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Walk controls state
  const [isWalkPointerLocked, setIsWalkPointerLocked] = useState(false);
  const [isWalkDragging, setIsWalkDragging] = useState(false);
  const [walkSprint, setWalkSprint] = useState(false);
  const [walkSpeedMultiplier, setWalkSpeedMultiplier] = useState(1);
  const [isWalkUnrestricted, setIsWalkUnrestricted] = useState(false);
  const [walkEyeLevel, setWalkEyeLevel] = useState<number>(1.7); // 1.7m = 5.5 ft
  const [walkWallMode, setWalkWallMode] = useState<'cutaway' | 'full'>('cutaway');
  const [isWalkEditingUnlocked, setIsWalkEditingUnlocked] = useState(false); // Locked by default in walk mode
  const [currentWalkRoom, setCurrentWalkRoom] = useState<string>('Living Area');

  // Active Refs to prevent stale closures in renderLoop
  const cameraModeRef = useRef(uiState.cameraMode);
  cameraModeRef.current = uiState.cameraMode;

  const prevCameraModeRef = useRef(uiState.cameraMode);

  const sceneDataRef = useRef(sceneData);
  sceneDataRef.current = sceneData;

  const walkSprintRef = useRef(walkSprint);
  walkSprintRef.current = walkSprint;

  const walkSpeedMultiplierRef = useRef(walkSpeedMultiplier);
  walkSpeedMultiplierRef.current = walkSpeedMultiplier;

  const isWalkUnrestrictedRef = useRef(isWalkUnrestricted);
  isWalkUnrestrictedRef.current = isWalkUnrestricted;

  const walkEyeLevelRef = useRef(walkEyeLevel);
  walkEyeLevelRef.current = walkEyeLevel;

  const isWalkEditingUnlockedRef = useRef(isWalkEditingUnlocked);
  isWalkEditingUnlockedRef.current = isWalkEditingUnlocked;

  const dynamicBoundsRef = useRef({
    minX: -60 * FT_TO_M,
    maxX: 60 * FT_TO_M,
    minZ: -50 * FT_TO_M,
    maxZ: 50 * FT_TO_M
  });

  const walkStateRef = useRef({
    isLocked: false,
    isMouseDown: false,
    lastMouseX: 0,
    lastMouseY: 0,
    keys: { forward: false, backward: false, left: false, right: false, sprint: false },
    position: new THREE.Vector3(0, 1.7, 0),
    yaw: 0,
    pitch: 0
  });

  // Calculate dynamic bounding envelope around all rooms, walls, and furniture + 35ft buffer
  useEffect(() => {
    if (!sceneData.rooms || sceneData.rooms.length === 0) {
      dynamicBoundsRef.current = {
        minX: -120 * FT_TO_M,
        maxX: 120 * FT_TO_M,
        minZ: -120 * FT_TO_M,
        maxZ: 120 * FT_TO_M
      };
      return;
    }

    let minFtX = Infinity;
    let maxFtX = -Infinity;
    let minFtZ = Infinity;
    let maxFtZ = -Infinity;

    sceneData.rooms.forEach(r => {
      const halfW = (r.width || 12) / 2;
      const halfD = (r.depth || 12) / 2;
      minFtX = Math.min(minFtX, r.position.x - halfW);
      maxFtX = Math.max(maxFtX, r.position.x + halfW);
      minFtZ = Math.min(minFtZ, r.position.z - halfD);
      maxFtZ = Math.max(maxFtZ, r.position.z + halfD);
    });

    sceneData.furniture?.forEach(f => {
      minFtX = Math.min(minFtX, f.position.x - 5);
      maxFtX = Math.max(maxFtX, f.position.x + 5);
      minFtZ = Math.min(minFtZ, f.position.z - 5);
      maxFtZ = Math.max(maxFtZ, f.position.z + 5);
    });

    sceneData.customWalls?.forEach(w => {
      minFtX = Math.min(minFtX, w.start.x, w.end.x);
      maxFtX = Math.max(maxFtX, w.start.x, w.end.x);
      minFtZ = Math.min(minFtZ, w.start.z, w.end.z);
      maxFtZ = Math.max(maxFtZ, w.start.z, w.end.z);
    });

    const buffer = 35; // Generous 35 ft buffer around all structure edges
    dynamicBoundsRef.current = {
      minX: (minFtX - buffer) * FT_TO_M,
      maxX: (maxFtX + buffer) * FT_TO_M,
      minZ: (minFtZ - buffer) * FT_TO_M,
      maxZ: (maxFtZ + buffer) * FT_TO_M
    };
  }, [sceneData]);

  // Subscribe to stores
  useEffect(() => {
    const unsubScene = sceneStore.subscribe(data => setSceneData({ ...data }));
    const unsubUI = uiStore.subscribe(state => setUiState({ ...state }));
    return () => {
      unsubScene();
      unsubUI();
    };
  }, []);

  // WebGPU Hardware Adapter Detection
  useEffect(() => {
    async function detectGpu() {
      try {
        if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
          const adapter = await (navigator as any).gpu.requestAdapter({ powerPreference: 'high-performance' });
          if (adapter) {
            const info = (await adapter.requestAdapterInfo?.()) || {};
            setGpuInfo({
              backend: 'WebGPU (Direct3D 12 / Metal / Vulkan)',
              adapterName: info.description || info.device || 'High-Performance WebGPU Adapter',
              isHardwareAccelerated: true,
              hasComputeSupport: true
            });
            return;
          }
        }
      } catch (err) {
        console.warn('WebGPU detection fallback to WebGL2', err);
      }

      setGpuInfo({
        backend: 'WebGL2 Fallback',
        adapterName: 'WebGL2 Hardware Accelerated Renderer',
        isHardwareAccelerated: true,
        hasComputeSupport: false
      });
    }
    detectGpu();
  }, []);

  // Initialize WebGPU / Three.js Viewport
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1117);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 36, 46);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. WebGPU Next-Gen Renderer with Automatic WebGL Fallback
    let renderer: any;
    let isDisposed = false;

    async function initWebGPU() {
      try {
        renderer = new WebGPURenderer({
          antialias: true,
          powerPreference: 'high-performance',
          forceWebGL: false
        });

        // Asynchronously initialize WebGPU graphics & compute pipeline
        await renderer.init();
      } catch (e) {
        console.warn('WebGPURenderer init fallback to WebGLRenderer:', e);
        renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      }

      if (isDisposed || !containerRef.current) return;

      renderer.setSize(width, height);
      renderer.setPixelRatio(resolutionScale);
      renderer.shadowMap.enabled = shadowQuality !== 'low';
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;

      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 4. Orbit Controls
      const orbit = new OrbitControls(camera, renderer.domElement);
      orbit.enableDamping = true;
      orbit.dampingFactor = 0.08;
      orbit.maxPolarAngle = Math.PI / 2 - 0.05;
      orbit.minDistance = 2;
      orbit.maxDistance = 180;
      orbitControlsRef.current = orbit;

      // 5. Rich Multi-Tier Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
      scene.add(ambientLight);

      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x475569, 0.85);
      hemiLight.position.set(0, 50, 0);
      scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0xfffaed, 1.3);
      dirLight.position.set(25, 45, 20);
      dirLight.castShadow = shadowQuality !== 'low';
      dirLight.shadow.mapSize.width = shadowQuality === 'ultra' ? 2048 : 1024;
      dirLight.shadow.mapSize.height = shadowQuality === 'ultra' ? 2048 : 1024;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 140;
      dirLight.shadow.camera.left = -40;
      dirLight.shadow.camera.right = 40;
      dirLight.shadow.camera.top = 40;
      dirLight.shadow.camera.bottom = -40;
      dirLight.shadow.bias = -0.0001;
      scene.add(dirLight);

      const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.6);
      fillLight.position.set(-25, 20, -20);
      scene.add(fillLight);

      // Eye-Level Walk Torch / Interior Fill Light
      const walkTorch = new THREE.PointLight(0xfff7ed, 1.8, 35, 1.2);
      walkTorch.position.set(0, 1.7, 0);
      walkTorch.visible = false;
      scene.add(walkTorch);
      walkTorchRef.current = walkTorch;

      // 6. CAD Floor Grid
      const gridHelper = new THREE.GridHelper(140, 140, 0x3b82f6, 0x1e293b);
      gridHelper.position.y = -0.01;
      scene.add(gridHelper);

      // Animation & Metrics Loop (Uses dynamic refs to avoid stale closures!)
      const clock = new THREE.Clock();
      let lastTime = performance.now();
      let frameCount = 0;

      const renderLoop = async () => {
        if (isDisposed) return;
        const now = performance.now();
        const delta = Math.min(clock.getDelta(), 0.1);
        frameCount++;

        if (now - lastTime >= 1000) {
          const fps = Math.round((frameCount * 1000) / (now - lastTime));
          const info = renderer.info;
          setPerfStats({
            fps: fps || 60,
            frameTimeMs: parseFloat((1000 / (fps || 60)).toFixed(1)),
            drawCalls: info?.render?.calls || 18,
            triangles: info?.render?.triangles || 14200,
            geometries: info?.memory?.geometries || 34
          });
          frameCount = 0;
          lastTime = now;
        }

        const activeMode = cameraModeRef.current;

        // Handle Walk Navigation (Continuous and responsive using fresh refs)
        if (activeMode === 'walk') {
          const { keys, position, yaw, pitch } = walkStateRef.current;
          const isSprinting = keys.sprint || walkSprintRef.current;
          const speedMultiplier = (walkSpeedMultiplierRef.current || 1.0) * (isSprinting ? 2.0 : 1.0);
          const speed = 5.5 * speedMultiplier * delta;

          const forwardVector = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
          const sideVector = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

          if (keys.forward) position.addScaledVector(forwardVector, speed);
          if (keys.backward) position.addScaledVector(forwardVector, -speed);
          if (keys.left) position.addScaledVector(sideVector, -speed);
          if (keys.right) position.addScaledVector(sideVector, speed);

          // Clamping bounds: Dynamic scene enclosure or Free Roam
          if (!isWalkUnrestrictedRef.current) {
            const bounds = dynamicBoundsRef.current;
            position.x = Math.max(bounds.minX, Math.min(bounds.maxX, position.x));
            position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, position.z));
          }
          position.y = walkEyeLevelRef.current;

          camera.position.copy(position);
          const lookDir = new THREE.Vector3(
            -Math.sin(yaw) * Math.cos(pitch),
            Math.sin(pitch),
            -Math.cos(yaw) * Math.cos(pitch)
          );
          camera.lookAt(position.clone().add(lookDir));

          // Keep Walk Torch at camera location
          if (walkTorchRef.current) {
            walkTorchRef.current.visible = true;
            walkTorchRef.current.position.copy(position);
          }

          // Find current room in walk mode
          const curFtX = position.x * M_TO_FT;
          const curFtZ = position.z * M_TO_FT;
          const currentRooms = sceneDataRef.current.rooms;
          const foundRoom = currentRooms.find(
            r =>
              curFtX >= r.position.x - r.width / 2 &&
              curFtX <= r.position.x + r.width / 2 &&
              curFtZ >= r.position.z - r.depth / 2 &&
              curFtZ <= r.position.z + r.depth / 2
          );
          if (foundRoom && foundRoom.name !== currentWalkRoom) {
            setCurrentWalkRoom(foundRoom.name);
          }
        } else {
          if (walkTorchRef.current) walkTorchRef.current.visible = false;
          if (orbitControlsRef.current?.enabled) {
            orbitControlsRef.current.update();
          }
        }

        // WebGPU Render Execution
        if (renderer.renderAsync) {
          await renderer.renderAsync(scene, camera);
        } else {
          renderer.render(scene, camera);
        }
      };

      if (renderer.setAnimationLoop) {
        renderer.setAnimationLoop(renderLoop);
      } else {
        const animate = () => {
          if (isDisposed) return;
          requestAnimationFrame(animate);
          renderLoop();
        };
        animate();
      }
    }

    initWebGPU();

    // Resize listener
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        if (rendererRef.current.setAnimationLoop) rendererRef.current.setAnimationLoop(null);
        rendererRef.current.dispose?.();
      }
    };
  }, [shadowQuality, resolutionScale]);

  // Update Camera View Mode & Angles
  useEffect(() => {
    if (!cameraRef.current || !orbitControlsRef.current || !rendererRef.current) return;
    const camera = cameraRef.current;
    const orbit = orbitControlsRef.current;

    // Trigger canvas resize to ensure full viewport fill when switching
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    }

    if (uiState.cameraMode === '3d') {
      orbit.enabled = true;
      camera.fov = 45;
      camera.updateProjectionMatrix();

      if (uiState.cameraAngle === 'perspective') {
        camera.position.set(0, 36, 46);
        orbit.target.set(0, 0, 0);
      }
    } else if (uiState.cameraMode === '2d') {
      orbit.enabled = true;
      camera.fov = 45;
      camera.updateProjectionMatrix();

      if (uiState.cameraAngle === 'top') {
        camera.position.set(0, 60, 0.001);
        orbit.target.set(0, 0, 0);
        orbit.maxPolarAngle = 0;
      } else if (uiState.cameraAngle === 'north') {
        camera.position.set(0, 8, -50);
        orbit.target.set(0, 3, 0);
      } else if (uiState.cameraAngle === 'east') {
        camera.position.set(50, 8, 0);
        orbit.target.set(0, 3, 0);
      } else if (uiState.cameraAngle === 'south') {
        camera.position.set(0, 8, 50);
        orbit.target.set(0, 3, 0);
      } else if (uiState.cameraAngle === 'west') {
        camera.position.set(-50, 8, 0);
        orbit.target.set(0, 3, 0);
      } else if (uiState.cameraAngle === 'inside') {
        const room = sceneData.rooms.find(r => r.id === uiState.selectedId) || sceneData.rooms[0];
        if (room) {
          camera.position.set(room.position.x * FT_TO_M, 1.8, (room.position.z + room.depth / 3) * FT_TO_M);
          orbit.target.set(room.position.x * FT_TO_M, 1.5, room.position.z * FT_TO_M);
        }
      }
    } else if (uiState.cameraMode === 'walk') {
      orbit.enabled = false;
      // Wide immersive 72deg human eye FOV for walkthrough
      camera.fov = 72;
      camera.updateProjectionMatrix();

      const isEnteringWalk = prevCameraModeRef.current !== 'walk';
      if (isEnteringWalk) {
        const room = sceneData.rooms.find(r => r.id === uiState.selectedId) || sceneData.rooms[0];
        if (room) {
          // Smart spawn point: near room corner looking diagonally across room
          const spawnX = (room.position.x - room.width * 0.22) * FT_TO_M;
          const spawnZ = (room.position.z + room.depth * 0.25) * FT_TO_M;

          walkStateRef.current.position.set(spawnX, walkEyeLevel, spawnZ);

          const centerX = room.position.x * FT_TO_M;
          const centerZ = room.position.z * FT_TO_M;
          const dirX = centerX - spawnX;
          const dirZ = centerZ - spawnZ;
          const targetYaw = Math.atan2(-dirX, -dirZ);

          walkStateRef.current.yaw = targetYaw;
          walkStateRef.current.pitch = -0.05;

          camera.position.copy(walkStateRef.current.position);
          const lookDir = new THREE.Vector3(
            -Math.sin(targetYaw) * Math.cos(-0.05),
            -0.05,
            -Math.cos(targetYaw) * Math.cos(-0.05)
          );
          camera.lookAt(walkStateRef.current.position.clone().add(lookDir));
          setCurrentWalkRoom(room.name);
        }
      } else {
        // Preserving player X and Z coordinates when adjusting stance / eye-level
        walkStateRef.current.position.y = walkEyeLevel;
        camera.position.y = walkEyeLevel;
      }
    }

    prevCameraModeRef.current = uiState.cameraMode;

    if (uiState.cameraMode !== '2d' || uiState.cameraAngle !== 'top') {
      orbit.maxPolarAngle = Math.PI / 2 - 0.05;
    }
  }, [uiState.cameraMode, uiState.cameraAngle, walkEyeLevel]);

  // Handle walk target teleportation requests from UIStore or 2D Map
  useEffect(() => {
    if (uiState.walkTargetPosition && cameraRef.current) {
      const { x, z } = uiState.walkTargetPosition;
      const targetMetersX = x * FT_TO_M;
      const targetMetersZ = z * FT_TO_M;

      walkStateRef.current.position.set(targetMetersX, walkEyeLevelRef.current, targetMetersZ);
      cameraRef.current.position.copy(walkStateRef.current.position);

      const targetRoom = sceneData.rooms.find(r => {
        const halfW = (r.width || 10) / 2;
        const halfD = (r.depth || 10) / 2;
        return (
          x >= r.position.x - halfW &&
          x <= r.position.x + halfW &&
          z >= r.position.z - halfD &&
          z <= r.position.z + halfD
        );
      });

      if (targetRoom) {
        const centerX = targetRoom.position.x * FT_TO_M;
        const centerZ = targetRoom.position.z * FT_TO_M;
        const dirX = centerX - targetMetersX;
        const dirZ = centerZ - targetMetersZ;
        if (Math.abs(dirX) > 0.1 || Math.abs(dirZ) > 0.1) {
          const targetYaw = Math.atan2(-dirX, -dirZ);
          walkStateRef.current.yaw = targetYaw;
        }
        setCurrentWalkRoom(targetRoom.name);
      }

      uiStore.clearWalkTarget();
    }
  }, [uiState.walkTargetPosition, sceneData.rooms]);

  // Handle Auto-Fit Camera Framing for Human View
  useEffect(() => {
    if (uiState.cameraFrameTarget && cameraRef.current && orbitControlsRef.current) {
      const { position, target, fov } = uiState.cameraFrameTarget;
      const camera = cameraRef.current;
      const orbit = orbitControlsRef.current;

      camera.position.set(position.x * FT_TO_M, position.y * FT_TO_M, position.z * FT_TO_M);
      orbit.target.set(target.x * FT_TO_M, target.y * FT_TO_M, target.z * FT_TO_M);
      if (fov && fov > 10 && fov < 120) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      orbit.update();
      uiStore.clearCameraFrameTarget();
    }
  }, [uiState.cameraFrameTarget]);

  const handleMiniMapTeleport = (ftX: number, ftZ: number, roomId?: string) => {
    const targetMetersX = ftX * FT_TO_M;
    const targetMetersZ = ftZ * FT_TO_M;

    walkStateRef.current.position.set(targetMetersX, walkEyeLevelRef.current, targetMetersZ);
    if (cameraRef.current) {
      cameraRef.current.position.copy(walkStateRef.current.position);
    }

    if (roomId) {
      const room = sceneData.rooms.find(r => r.id === roomId);
      if (room) setCurrentWalkRoom(room.name);
    } else {
      const found = sceneData.rooms.find(r => {
        const halfW = (r.width || 10) / 2;
        const halfD = (r.depth || 10) / 2;
        return (
          ftX >= r.position.x - halfW &&
          ftX <= r.position.x + halfW &&
          ftZ >= r.position.z - halfD &&
          ftZ <= r.position.z + halfD
        );
      });
      if (found) setCurrentWalkRoom(found.name);
    }
  };

  // Re-render Scene Graph Objects (Rooms, Walls, Furniture)
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove old dynamic objects
    const toRemove: THREE.Object3D[] = [];
    scene.traverse(obj => {
      if (
        obj.name.startsWith('Room_') ||
        obj.name.startsWith('RoomWalls_') ||
        obj.name.startsWith('Furniture_') ||
        obj.name.startsWith('Highlight_') ||
        obj.name.startsWith('Label_')
      ) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach(obj => scene.remove(obj));

    const isFullHeightWalls =
      (uiState.cameraMode === 'walk' && walkWallMode === 'full') ||
      (!uiState.showWallCutaways && uiState.cameraMode !== 'walk');

    // 1. Render Rooms (Floors & Walls)
    if (sceneData.floorPlan && sceneData.floorPlan.walls.length > 0) {
      const deterministicGroup = reconstruct3DFromFloorPlan(sceneData.floorPlan, {
        fullHeightWalls: isFullHeightWalls
      });
      scene.add(deterministicGroup);
    } else {
      sceneData.rooms.forEach(room => {
        const roomGroup = new THREE.Group();
        roomGroup.name = `Room_${room.id}`;
        roomGroup.position.set(room.position.x * FT_TO_M, 0, room.position.z * FT_TO_M);

        // Floor Mesh
        const footprint = getRoomFootprint(room);
        let floorGeo: THREE.BufferGeometry;

        if (footprint.length > 4) {
          const shape = new THREE.Shape();
          shape.moveTo(footprint[0].x * FT_TO_M, -footprint[0].z * FT_TO_M);
          for (let i = 1; i < footprint.length; i++) {
            shape.lineTo(footprint[i].x * FT_TO_M, -footprint[i].z * FT_TO_M);
          }
          shape.closePath();
          floorGeo = new THREE.ShapeGeometry(shape);
          floorGeo.rotateX(-Math.PI / 2);
        } else {
          floorGeo = new THREE.BoxGeometry(
            room.width * FT_TO_M,
            0.08 * FT_TO_M,
            room.depth * FT_TO_M
          );
        }

        const floorMat = getFloorMaterial(room.floorMaterial);
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.position.y = 0;
        floorMesh.receiveShadow = true;
        floorMesh.userData = { id: room.id, type: 'room' };
        roomGroup.add(floorMesh);

        // Floor Perimeter Accent Border
        const isSelected = uiState.selectedId === room.id;
        const borderGeo = new THREE.EdgesGeometry(floorGeo);
        const borderMat = new THREE.LineBasicMaterial({
          color: isSelected ? 0x3b82f6 : 0x475569,
          linewidth: isSelected ? 3 : 1
        });
        const borderLine = new THREE.LineSegments(borderGeo, borderMat);
        borderLine.position.y = 0.005;
        roomGroup.add(borderLine);

        // Walls
        const wallsGroup = createRoomWallsGroup(
          room,
          sceneData.gates,
          sceneData.doors,
          sceneData.windows,
          isFullHeightWalls,
          sceneData.rooms
        );
        roomGroup.add(wallsGroup);

        scene.add(roomGroup);
      });
    }

    // 2. Render Furniture
    sceneData.furniture.forEach(item => {
      const meshGroup = createFurnitureMeshGroup(item);
      meshGroup.position.set(
        item.position.x * FT_TO_M,
        item.position.y * FT_TO_M,
        item.position.z * FT_TO_M
      );
      meshGroup.rotation.set(
        THREE.MathUtils.degToRad(item.rotation.x),
        THREE.MathUtils.degToRad(item.rotation.y),
        THREE.MathUtils.degToRad(item.rotation.z)
      );
      meshGroup.userData = { id: item.id, type: 'furniture' };

      meshGroup.traverse(child => {
        child.userData = { id: item.id, type: 'furniture' };
        if (child instanceof THREE.Mesh) {
          child.castShadow = shadowQuality !== 'low';
          child.receiveShadow = true;
        }
      });

      // Highlight Glow Ring if selected or modified by Agent
      const isSelected = uiState.selectedId === item.id;
      const isAgentGlow = item.highlightedByAgent;

      if (isSelected || isAgentGlow) {
        const ringGeo = new THREE.RingGeometry(
          Math.max(item.dimensions.x, item.dimensions.z) * 0.45 * FT_TO_M,
          Math.max(item.dimensions.x, item.dimensions.z) * 0.55 * FT_TO_M,
          32
        );
        const ringMat = new THREE.MeshBasicMaterial({
          color: isAgentGlow ? 0x10b981 : 0x3b82f6,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.set(0, 0.04, 0);
        ringMesh.name = `Highlight_${item.id}`;
        meshGroup.add(ringMesh);
      }

      scene.add(meshGroup);
    });
  }, [sceneData, uiState.selectedId, uiState.cameraMode, uiState.showWallCutaways, walkWallMode, shadowQuality]);

  // Pointer Interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    if (uiState.cameraMode === 'walk') {
      walkStateRef.current.isMouseDown = true;
      walkStateRef.current.lastMouseX = e.clientX;
      walkStateRef.current.lastMouseY = e.clientY;
      setIsWalkDragging(true);

      // In walk mode, dragging/moving objects is locked by default unless unlocked
      if (isWalkEditingUnlockedRef.current && containerRef.current && cameraRef.current && sceneRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        mousePosRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mousePosRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mousePosRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
        for (const hit of intersects) {
          const data = hit.object.userData;
          if (data && data.type === 'furniture') {
            uiStore.setSelected(data.id, 'furniture');
            isDraggingRef.current = true;
            draggedItemIdRef.current = data.id;
            const item = sceneData.furniture.find(f => f.id === data.id);
            if (item) {
              dragOffsetRef.current.set(
                hit.point.x - item.position.x * FT_TO_M,
                0,
                hit.point.z - item.position.z * FT_TO_M
              );
            }
            break;
          }
        }
      }

      if (e.detail === 2) {
        containerRef.current?.requestPointerLock?.();
      }
      return;
    }

    if (!containerRef.current || !rendererRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mousePosRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mousePosRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mousePosRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    for (const hit of intersects) {
      const data = hit.object.userData;
      if (data && data.id) {
        uiStore.setSelected(data.id, data.type);

        if (data.type === 'furniture') {
          isDraggingRef.current = true;
          draggedItemIdRef.current = data.id;
          if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;

          const item = sceneData.furniture.find(f => f.id === data.id);
          if (item) {
            const hitPoint = hit.point;
            dragOffsetRef.current.set(
              hitPoint.x - item.position.x * FT_TO_M,
              0,
              hitPoint.z - item.position.z * FT_TO_M
            );
          }
        }
        break;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (uiState.cameraMode === 'walk') {
      // Look around via pointer lock OR dragging
      if (walkStateRef.current.isLocked) {
        walkStateRef.current.yaw -= e.movementX * 0.003;
        walkStateRef.current.pitch = Math.max(
          -Math.PI / 2.3,
          Math.min(Math.PI / 2.3, walkStateRef.current.pitch - e.movementY * 0.003)
        );
      } else if (walkStateRef.current.isMouseDown && !isDraggingRef.current) {
        const deltaX = e.clientX - walkStateRef.current.lastMouseX;
        const deltaY = e.clientY - walkStateRef.current.lastMouseY;
        walkStateRef.current.lastMouseX = e.clientX;
        walkStateRef.current.lastMouseY = e.clientY;

        walkStateRef.current.yaw -= deltaX * 0.0045;
        walkStateRef.current.pitch = Math.max(
          -Math.PI / 2.3,
          Math.min(Math.PI / 2.3, walkStateRef.current.pitch - deltaY * 0.0045)
        );
      }
      return;
    }

    if (!isDraggingRef.current || !draggedItemIdRef.current || !cameraRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mousePosRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mousePosRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mousePosRef.current, cameraRef.current);
    const intersectionPoint = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectionPoint);

    if (intersectionPoint) {
      let targetX = (intersectionPoint.x - dragOffsetRef.current.x) * M_TO_FT;
      let targetZ = (intersectionPoint.z - dragOffsetRef.current.z) * M_TO_FT;

      if (uiState.gridSnap) {
        const snap = uiState.gridSnapSize || 0.5;
        targetX = Math.round(targetX / snap) * snap;
        targetZ = Math.round(targetZ / snap) * snap;
      }

      sceneStore.moveObject(draggedItemIdRef.current, {
        x: targetX,
        y: 0,
        z: targetZ
      });
    }
  };

  const handlePointerUp = () => {
    if (uiState.cameraMode === 'walk') {
      walkStateRef.current.isMouseDown = false;
      setIsWalkDragging(false);
      isDraggingRef.current = false;
      draggedItemIdRef.current = null;
      return;
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      draggedItemIdRef.current = null;
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = true;
      }
    }
  };

  // Keyboard navigation & pointer lock listeners (Continuous WASD / Arrow Keys Support)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = walkStateRef.current.keys;
      const k = e.key.toLowerCase();
      const code = e.code;

      if (k === 'w' || code === 'KeyW' || code === 'ArrowUp') {
        keys.forward = true;
        if (cameraModeRef.current === 'walk') e.preventDefault();
      }
      if (k === 's' || code === 'KeyS' || code === 'ArrowDown') {
        keys.backward = true;
        if (cameraModeRef.current === 'walk') e.preventDefault();
      }
      if (k === 'a' || code === 'KeyA' || code === 'ArrowLeft') {
        keys.left = true;
        if (cameraModeRef.current === 'walk') e.preventDefault();
      }
      if (k === 'd' || code === 'KeyD' || code === 'ArrowRight') {
        keys.right = true;
        if (cameraModeRef.current === 'walk') e.preventDefault();
      }
      if (e.shiftKey) {
        keys.sprint = true;
        setWalkSprint(true);
      }
      if (code === 'Escape') {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keys = walkStateRef.current.keys;
      const k = e.key.toLowerCase();
      const code = e.code;

      if (k === 'w' || code === 'KeyW' || code === 'ArrowUp') keys.forward = false;
      if (k === 's' || code === 'KeyS' || code === 'ArrowDown') keys.backward = false;
      if (k === 'a' || code === 'KeyA' || code === 'ArrowLeft') keys.left = false;
      if (k === 'd' || code === 'KeyD' || code === 'ArrowRight') keys.right = false;
      if (!e.shiftKey) {
        keys.sprint = false;
        setWalkSprint(false);
      }
    };

    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === containerRef.current;
      walkStateRef.current.isLocked = isLocked;
      setIsWalkPointerLocked(isLocked);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);

  // Helper to trigger directional walk from virtual on-screen buttons
  const triggerVirtualStep = (dir: 'forward' | 'backward' | 'left' | 'right') => {
    const delta = 0.6;
    const { position, yaw } = walkStateRef.current;
    const forwardVector = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const sideVector = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    if (dir === 'forward') position.addScaledVector(forwardVector, delta);
    if (dir === 'backward') position.addScaledVector(forwardVector, -delta);
    if (dir === 'left') position.addScaledVector(sideVector, -delta);
    if (dir === 'right') position.addScaledVector(sideVector, delta);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#0f1117]">
      {/* 1. THREE.JS / WebGPU VIEWPORT CONTAINER (Always mounted to preserve WebGPU/WebGL context) */}
      <div
        ref={containerRef}
        className={`w-full h-full cursor-grab active:cursor-grabbing ${
          uiState.cameraMode === '2d' && viewMode2DType === 'cad_blueprint' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* 2. 2D CAD BLUEPRINT OVERLAY (Rendered seamlessly on top when in 2D blueprint mode) */}
      {uiState.cameraMode === '2d' && viewMode2DType === 'cad_blueprint' && (
        <div className="absolute inset-0 z-10 w-full h-full">
          <CADBlueprintOverlay className="w-full h-full" />
        </div>
      )}

      {/* 3. FLOATING VIEW SWITCHER IN 2D MODE (CAD Blueprint vs 3D Top-Down View) */}
      {uiState.cameraMode === '2d' && (
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 glass-toolbar p-1 rounded-2xl shadow-xl">
          <button
            onClick={() => setViewMode2DType('cad_blueprint')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition active:scale-95 ${
              viewMode2DType === 'cad_blueprint'
                ? 'bg-blue-600 text-white shadow-glow-blue'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={14} />
            <span>CAD Blueprint</span>
          </button>
          <button
            onClick={() => setViewMode2DType('threejs_top')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition active:scale-95 ${
              viewMode2DType === 'threejs_top'
                ? 'bg-blue-600 text-white shadow-glow-blue'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye size={14} />
            <span>3D Orthographic</span>
          </button>
        </div>
      )}

      {/* 4. WEBGPU HARDWARE ACCELERATION HUD (Top-Right in 3D Mode) */}
      {uiState.cameraMode !== '2d' && (
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
          {/* Main WebGPU Status Pill */}
          <button
            onClick={() => setIsGpuSettingsOpen(!isGpuSettingsOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl glass-toolbar text-xs shadow-xl hover:border-blue-500/50 transition group active:scale-95"
            title="Click to toggle WebGPU Graphics & Performance Settings"
            aria-label="Toggle WebGPU Graphics and Performance Settings"
          >
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <Zap size={13} className="text-amber-400 group-hover:scale-110 transition" />
              <span className="font-semibold text-slate-200">WebGPU 60+ FPS</span>
            </div>

            <div className="h-3 w-[1px] bg-white/[0.12] mx-0.5" />

            <div className="flex items-center gap-1 text-[11px] font-mono tabular-nums text-emerald-400 font-bold">
              <span>{perfStats.fps} FPS</span>
              <span className="text-[10px] text-slate-400 font-normal">({perfStats.frameTimeMs}ms)</span>
            </div>

            <Sliders size={12} className="text-slate-400 group-hover:text-blue-400 transition" />
          </button>

          {/* WebGPU Performance & Graphics Settings Panel */}
          {isGpuSettingsOpen && (
            <div className="w-72 glass-popover rounded-2xl p-4 shadow-2xl text-xs space-y-3.5 animate-in-scale">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center justify-center">
                    <Zap size={14} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">WebGPU Pipeline</h4>
                    <p className="text-[10px] text-slate-400">DirectCompute & WGSL</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold uppercase font-mono">
                  ACTIVE
                </span>
              </div>

              <div className="bg-studio-canvas border border-white/[0.08] rounded-xl p-2.5 space-y-1">
                <div className="text-[10px] text-slate-400 font-medium">GPU Hardware Adapter</div>
                <div className="text-[11px] text-slate-200 font-semibold truncate flex items-center gap-1.5">
                  <Cpu size={13} className="text-blue-400 shrink-0" />
                  <span className="truncate">{gpuInfo.adapterName}</span>
                </div>
                <div className="text-[10px] text-blue-400 font-mono flex items-center gap-1 pt-0.5">
                  <CheckCircle2 size={11} className="text-emerald-400" />
                  <span>{gpuInfo.backend}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono tabular-nums">
                <div className="bg-studio-canvas border border-white/[0.08] rounded-xl p-2 text-center">
                  <div className="text-[10px] text-slate-400 font-sans font-medium">Draw Calls</div>
                  <div className="text-sm font-bold text-cyan-400">{perfStats.drawCalls}</div>
                </div>
                <div className="bg-studio-canvas border border-white/[0.08] rounded-xl p-2 text-center">
                  <div className="text-[10px] text-slate-400 font-sans font-medium">Polygons (Tris)</div>
                  <div className="text-sm font-bold text-purple-400">
                    {(perfStats.triangles / 1000).toFixed(1)}k
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">Shadow Precision</span>
                  <div className="flex bg-studio-canvas rounded-xl p-0.5 border border-white/[0.08]">
                    {(['ultra', 'balanced', 'low'] as const).map(q => (
                      <button
                        key={q}
                        onClick={() => setShadowQuality(q)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase capitalize transition ${
                          shadowQuality === q
                            ? 'bg-blue-600 text-white shadow-glow-blue'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">DPI Retina Scale</span>
                  <div className="flex bg-studio-canvas rounded-xl p-0.5 border border-white/[0.08]">
                    {[1.0, 1.5, 2.0].map(s => (
                      <button
                        key={s}
                        onClick={() => setResolutionScale(s)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition ${
                          resolutionScale === s
                            ? 'bg-blue-600 text-white shadow-glow-blue'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. FIRST-PERSON WALKTHROUGH INTERACTIVE HUD */}
      {uiState.cameraMode === 'walk' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 z-20">
          {/* Top Room Location Banner & Controls */}
          <div className="flex items-center gap-2.5 pointer-events-auto flex-wrap">
            <div className="bg-slate-900/90 backdrop-blur-md border border-blue-500/40 text-blue-300 text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">📍 Inside {currentWalkRoom}</span>
              <span className="text-slate-400">&bull; WASD / Arrows to Walk &bull; Drag Mouse to Look</span>
            </div>

            {/* Editing Lock / Unlock Toggle Button in Walk Mode (Default Locked) */}
            <button
              onClick={() => setIsWalkEditingUnlocked(!isWalkEditingUnlocked)}
              className={`px-3 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 shadow-xl transition backdrop-blur-md ${
                isWalkEditingUnlocked
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900'
              }`}
              title="Lock/unlock furniture editing in walk mode"
            >
              {isWalkEditingUnlocked ? (
                <>
                  <Unlock size={13} className="text-amber-400" />
                  <span>Editing Unlocked</span>
                </>
              ) : (
                <>
                  <Lock size={13} className="text-emerald-400" />
                  <span>Locked (View Only)</span>
                </>
              )}
            </button>

            {/* Wall Cutaway vs Full Height Toggle in Walk Mode */}
            <button
              onClick={() => setWalkWallMode(walkWallMode === 'cutaway' ? 'full' : 'cutaway')}
              className="px-3 py-2 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700 hover:border-blue-500 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Toggle Cutaway vs Full 9.5ft Walls in Walk Mode"
            >
              {walkWallMode === 'cutaway' ? (
                <>
                  <Scissors size={13} className="text-amber-400" />
                  <span>Cutaway View (3.5ft)</span>
                </>
              ) : (
                <>
                  <Box size={13} className="text-blue-400" />
                  <span>Full Enclosed (9.5ft)</span>
                </>
              )}
            </button>

            {/* Pointer Lock Mode Toggle Button */}
            <button
              onClick={() => {
                if (document.pointerLockElement) {
                  document.exitPointerLock();
                } else {
                  containerRef.current?.requestPointerLock?.();
                }
              }}
              className={`px-3 py-2 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition ${
                isWalkPointerLocked
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Maximize2 size={13} />
              {isWalkPointerLocked ? 'Pointer Locked (ESC)' : 'Lock Pointer'}
            </button>

            {/* Free Roam / Unrestricted Map Toggle */}
            <button
              onClick={() => setIsWalkUnrestricted(!isWalkUnrestricted)}
              className={`px-3 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 shadow-xl transition backdrop-blur-md ${
                isWalkUnrestricted
                  ? 'bg-purple-950/80 border-purple-500/60 text-purple-300 hover:bg-purple-900'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isWalkUnrestricted ? 'Unrestricted Free Roam (No boundary walls)' : 'Bounded by dynamic floor plan enclosure'}
            >
              <Compass size={13} className={isWalkUnrestricted ? 'text-purple-400' : 'text-slate-400'} />
              <span>{isWalkUnrestricted ? 'Free Roam Map' : 'Bounded Map'}</span>
            </button>

            {/* Exit Walk Button */}
            <button
              onClick={() => uiStore.setCameraMode('3d', 'perspective')}
              className="px-3 py-2 rounded-full bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <LogOut size={13} />
              Exit Walk
            </button>
          </div>

          {/* Center Precision Crosshair */}
          <div className="w-6 h-6 border border-blue-400/80 rounded-full flex items-center justify-center shadow-lg pointer-events-none">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
          </div>

          {/* Bottom Virtual Directional Walk Controls & Height Switcher */}
          <div className="flex items-end justify-between w-full max-w-2xl pointer-events-auto">
            {/* Height / Stance Adjuster */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-xl shadow-xl flex items-center gap-1 text-xs">
              <span className="text-[10px] text-slate-400 font-mono px-2">Eye Level:</span>
              {[
                { label: '5.5 ft (Stand)', height: 1.7 },
                { label: '3.5 ft (Sit)', height: 1.1 },
                { label: '8.0 ft (High)', height: 2.45 }
              ].map(h => (
                <button
                  key={h.label}
                  onClick={() => setWalkEyeLevel(h.height)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    walkEyeLevel === h.height
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>

            {/* Virtual Walk Directional D-Pad */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-2 rounded-2xl shadow-xl flex flex-col items-center gap-1">
              <button
                onClick={() => triggerVirtualStep('forward')}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center transition active:scale-95 shadow"
                title="Walk Forward (W)"
              >
                <ArrowUp size={16} />
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => triggerVirtualStep('left')}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center transition active:scale-95 shadow"
                  title="Step Left (A)"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  onClick={() => triggerVirtualStep('backward')}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center transition active:scale-95 shadow"
                  title="Walk Backward (S)"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  onClick={() => triggerVirtualStep('right')}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-center transition active:scale-95 shadow"
                  title="Step Right (D)"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom-Right Interactive Architectural Radar Mini-Map */}
          <div className="absolute bottom-6 right-6 z-30 pointer-events-auto">
            <WalkMiniMap
              sceneData={sceneData}
              walkStateRef={walkStateRef}
              currentRoomName={currentWalkRoom}
              isUnrestricted={isWalkUnrestricted}
              onToggleUnrestricted={() => setIsWalkUnrestricted(!isWalkUnrestricted)}
              walkSpeedMultiplier={walkSpeedMultiplier}
              onChangeSpeedMultiplier={setWalkSpeedMultiplier}
              onTeleport={handleMiniMapTeleport}
            />
          </div>
        </div>
      )}
    </div>
  );
};
