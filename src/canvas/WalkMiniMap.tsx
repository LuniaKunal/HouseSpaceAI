import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Room, ConnectionGate, M_TO_FT } from '../types/scene';
import { SceneData } from '../state/sceneStore';
import { getRoomWorldPolygon } from '../geometry/roomGeometry';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  Compass,
  Footprints,
  Shield,
  ShieldAlert,
  Zap,
  Navigation
} from 'lucide-react';

interface Props {
  sceneData: SceneData;
  walkStateRef: React.MutableRefObject<{
    position: THREE.Vector3;
    yaw: number;
    [key: string]: any;
  }>;
  currentRoomName: string;
  isUnrestricted: boolean;
  onToggleUnrestricted: () => void;
  walkSpeedMultiplier: number;
  onChangeSpeedMultiplier: (speed: number) => void;
  onTeleport: (ftX: number, ftZ: number, roomId?: string) => void;
}

export const WalkMiniMap: React.FC<Props> = ({
  sceneData,
  walkStateRef,
  currentRoomName,
  isUnrestricted,
  onToggleUnrestricted,
  walkSpeedMultiplier,
  onChangeSpeedMultiplier,
  onTeleport
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [playerPose, setPlayerPose] = useState({ ftX: 0, ftZ: 0, yaw: 0 });
  const [teleportRipple, setTeleportRipple] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 60FPS Player Pose updater (isolated to avoid re-rendering main canvas)
  useEffect(() => {
    let animId: number;
    const updatePose = () => {
      if (walkStateRef.current) {
        const ftX = walkStateRef.current.position.x * M_TO_FT;
        const ftZ = walkStateRef.current.position.z * M_TO_FT;
        const yaw = walkStateRef.current.yaw;
        setPlayerPose(prev => {
          if (
            Math.abs(prev.ftX - ftX) > 0.05 ||
            Math.abs(prev.ftZ - ftZ) > 0.05 ||
            Math.abs(prev.yaw - yaw) > 0.02
          ) {
            return { ftX, ftZ, yaw };
          }
          return prev;
        });
      }
      animId = requestAnimationFrame(updatePose);
    };
    animId = requestAnimationFrame(updatePose);
    return () => cancelAnimationFrame(animId);
  }, [walkStateRef]);

  // Dimensions of SVG based on expansion state
  const svgWidth = isExpanded ? 340 : 220;
  const svgHeight = isExpanded ? 260 : 165;

  // Scene Bounding Box
  const sceneBounds = useMemo(() => {
    const rooms = sceneData.rooms || [];
    if (rooms.length === 0) {
      return { minX: -30, maxX: 30, minZ: -20, maxZ: 20, midX: 0, midZ: 0, spanX: 60, spanZ: 40 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    rooms.forEach((r: Room) => {
      const halfW = (r.width || 12) / 2;
      const halfD = (r.depth || 12) / 2;
      minX = Math.min(minX, r.position.x - halfW);
      maxX = Math.max(maxX, r.position.x + halfW);
      minZ = Math.min(minZ, r.position.z - halfD);
      maxZ = Math.max(maxZ, r.position.z + halfD);
    });

    const midX = (minX + maxX) / 2;
    const midZ = (minZ + maxZ) / 2;
    const spanX = Math.max(20, maxX - minX);
    const spanZ = Math.max(16, maxZ - minZ);

    return { minX, maxX, minZ, maxZ, midX, midZ, spanX, spanZ };
  }, [sceneData.rooms]);

  // Coordinate projection from scene feet to MiniMap SVG pixels
  const scale = useMemo(() => {
    const baseScale = Math.min((svgWidth - 24) / sceneBounds.spanX, (svgHeight - 24) / sceneBounds.spanZ);
    return baseScale * zoom;
  }, [svgWidth, svgHeight, sceneBounds, zoom]);

  const toSvgX = (ftX: number) => svgWidth / 2 + (ftX - sceneBounds.midX) * scale;
  const toSvgY = (ftZ: number) => svgHeight / 2 + (ftZ - sceneBounds.midZ) * scale;
  const toFeetX = (svgX: number) => sceneBounds.midX + (svgX - svgWidth / 2) / scale;
  const toFeetZ = (svgY: number) => sceneBounds.midZ + (svgY - svgHeight / 2) / scale;

  // Click on MiniMap to Teleport
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickSvgX = e.clientX - rect.left;
    const clickSvgY = e.clientY - rect.top;

    const ftX = toFeetX(clickSvgX);
    const ftZ = toFeetZ(clickSvgY);

    // Find target room
    const targetRoom = sceneData.rooms.find((r: Room) => {
      const halfW = (r.width || 10) / 2;
      const halfD = (r.depth || 10) / 2;
      return (
        ftX >= r.position.x - halfW &&
        ftX <= r.position.x + halfW &&
        ftZ >= r.position.z - halfD &&
        ftZ <= r.position.z + halfD
      );
    });

    setTeleportRipple({ x: clickSvgX, y: clickSvgY });
    setTimeout(() => setTeleportRipple(null), 800);

    onTeleport(ftX, ftZ, targetRoom?.id);
  };

  // Player SVG coordinates
  const playerSvgX = toSvgX(playerPose.ftX);
  const playerSvgY = toSvgY(playerPose.ftZ);

  // Vision cone points (72deg field of view)
  const coneLength = 26;
  const fovHalfRad = (36 * Math.PI) / 180;
  const baseAngle = playerPose.yaw;
  const leftAngle = baseAngle - fovHalfRad;
  const rightAngle = baseAngle + fovHalfRad;

  const leftPtX = playerSvgX - Math.sin(leftAngle) * coneLength;
  const leftPtY = playerSvgY - Math.cos(leftAngle) * coneLength;
  const rightPtX = playerSvgX - Math.sin(rightAngle) * coneLength;
  const rightPtY = playerSvgY - Math.cos(rightAngle) * coneLength;
  const conePoints = `${playerSvgX},${playerSvgY} ${leftPtX},${leftPtY} ${rightPtX},${rightPtY}`;

  return (
    <div className="flex flex-col items-end gap-1.5 pointer-events-auto select-none">
      {/* Mini-Map Header Bar */}
      <div className="flex items-center justify-between w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-xl shadow-xl text-xs">
        <div className="flex items-center gap-1.5">
          <Navigation size={13} className="text-blue-400 rotate-45" />
          <span className="font-semibold text-slate-200 text-[11px] truncate max-w-[120px]">
            {currentRoomName || 'Floor Plan'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Unrestricted / Free Roam Boundary Toggle */}
          <button
            onClick={onToggleUnrestricted}
            className={`p-1 rounded-lg transition ${
              isUnrestricted
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={isUnrestricted ? 'Bounds: Free Roam (Unrestricted)' : 'Bounds: Dynamic Floor Plan Enclosure'}
            aria-label="Toggle map boundary limit"
          >
            {isUnrestricted ? <ShieldAlert size={12} /> : <Shield size={12} />}
          </button>

          {/* Speed Multiplier Quick Switcher */}
          <button
            onClick={() => {
              const next = walkSpeedMultiplier === 1 ? 2 : walkSpeedMultiplier === 2 ? 3 : 1;
              onChangeSpeedMultiplier(next);
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
              walkSpeedMultiplier > 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Toggle walk speed (1x Normal, 2x Sprint, 3x Cruise)"
          >
            {walkSpeedMultiplier}x
          </button>

          {/* Zoom In */}
          <button
            onClick={() => setZoom(z => Math.min(2.5, z + 0.25))}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Zoom In"
          >
            <ZoomIn size={12} />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => setZoom(z => Math.max(0.7, z - 0.25))}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Zoom Out"
          >
            <ZoomOut size={12} />
          </button>

          {/* Expand / Minimize Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title={isExpanded ? 'Minimize Radar' : 'Expand Radar'}
          >
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Mini-Map Interactive SVG Canvas */}
      <div className="relative bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl transition-all duration-200">
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          onClick={handleMapClick}
          className="cursor-crosshair block"
        >
          {/* Background Grid Pattern */}
          <defs>
            <pattern id="minimap-grid" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="100%" height="100%" fill="#0a0e17" />
          <rect width="100%" height="100%" fill="url(#minimap-grid)" />

          {/* Boundary envelope indicator if clamped */}
          {!isUnrestricted && (
            <rect
              x={toSvgX(sceneBounds.minX - 5)}
              y={toSvgY(sceneBounds.minZ - 5)}
              width={(sceneBounds.spanX + 10) * scale}
              height={(sceneBounds.spanZ + 10) * scale}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="0.8"
              strokeDasharray="4 3"
              opacity="0.3"
            />
          )}

          {/* 1. ROOMS */}
          {sceneData.rooms.map((room: Room) => {
            const x = toSvgX(room.position.x - room.width / 2);
            const y = toSvgY(room.position.z - room.depth / 2);
            const w = room.width * scale;
            const h = room.depth * scale;
            const isCurrent = room.name === currentRoomName;

            const isLShaped = room.notch || (room.footprint && room.footprint.length > 4);
            const polyPts = isLShaped ? getRoomWorldPolygon(room) : null;
            const ptsStr = polyPts ? polyPts.map(p => `${toSvgX(p.x)},${toSvgY(p.z)}`).join(' ') : '';

            return (
              <g key={`mini-${room.id}`} className="transition-opacity">
                {isLShaped ? (
                  <polygon
                    points={ptsStr}
                    fill={isCurrent ? '#1e3a5f' : '#111827'}
                    stroke={isCurrent ? '#60a5fa' : '#334155'}
                    strokeWidth={isCurrent ? 1.5 : 0.9}
                  />
                ) : (
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={2}
                    fill={isCurrent ? '#1e3a5f' : '#111827'}
                    stroke={isCurrent ? '#60a5fa' : '#334155'}
                    strokeWidth={isCurrent ? 1.5 : 0.9}
                  />
                )}

                {/* Room Name Label */}
                {(isExpanded || w > 35) && (
                  <text
                    x={toSvgX(room.position.x)}
                    y={toSvgY(room.position.z) + 3}
                    textAnchor="middle"
                    fill={isCurrent ? '#93c5fd' : '#64748b'}
                    fontSize={isExpanded ? 8 : 7}
                    fontFamily="monospace"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {room.name.length > 10 && !isExpanded ? room.name.slice(0, 8) + '..' : room.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* 2. DOORS & GATES */}
          {sceneData.gates.map((gate: ConnectionGate) => (
            <circle
              key={`mini-gate-${gate.id}`}
              cx={toSvgX(gate.position.x)}
              cy={toSvgY(gate.position.z)}
              r={1.8}
              fill="#22c55e"
              opacity="0.8"
            />
          ))}

          {/* 3. TELEPORT RIPPLE ANIMATION */}
          {teleportRipple && (
            <circle
              cx={teleportRipple.x}
              cy={teleportRipple.y}
              r={14}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              className="animate-ping"
            />
          )}

          {/* 4. PLAYER VISION RADAR CONE */}
          <polygon
            points={conePoints}
            fill="url(#radar-glow)"
            stroke="#38bdf8"
            strokeWidth="0.8"
            strokeOpacity="0.7"
            pointerEvents="none"
          />

          {/* 5. PLAYER POSITION AVATAR */}
          <g pointerEvents="none">
            {/* Outer Pulsing Aura */}
            <circle cx={playerSvgX} cy={playerSvgY} r={6} fill="#38bdf8" opacity="0.3" className="animate-pulse" />
            {/* Main Center Dot */}
            <circle cx={playerSvgX} cy={playerSvgY} r={3.5} fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
          </g>
        </svg>

        {/* Floating Mini-Map Click Hint */}
        <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between text-[9px] text-slate-400 font-mono pointer-events-none">
          <span className="flex items-center gap-1">
            <Footprints size={10} className="text-emerald-400" />
            <span>Click map to teleport</span>
          </span>
          <span className={isUnrestricted ? 'text-amber-400 font-bold' : 'text-slate-500'}>
            {isUnrestricted ? 'Boundless' : 'Bounded'}
          </span>
        </div>
      </div>
    </div>
  );
};
