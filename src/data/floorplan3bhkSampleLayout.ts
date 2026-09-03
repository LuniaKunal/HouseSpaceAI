/**
 * Complete Architectural Project Definition for 3BHK_Sample
 * Exactly replicating Sample_maps/Sample_2.png floor plan blueprint:
 * - 12 Rooms & Functional Zones (Living/Dining, Deck, Kitchen, Wash, Store, Bed Room-1 + Toilet, Bed Room-3, Bed Room-2 + Toilet, Common Toilet, Lift Core)
 * - Exact Dimensions: 17'x18' Living/Dining, 5'x9'9" Deck, 10'x10' Kitchen, 6'x4' Wash, 4'x4' Store, 12'x10' Bed 1, 4'x6'9" Toilets, 10'x10' Bed 3, 10'x13' Bed 2, 7'6"x4'6" Toilet 2, 6'x7' Lift
 * - Precise Bed Orientations:
 *   - Bed Room-1: Headboard at SOUTH, facing NORTH (rotation.y = 180°)
 *   - Bed Room-3: Headboard at SOUTH, facing NORTH (rotation.y = 180°)
 *   - Bed Room-2: Headboard at EAST, facing WEST (rotation.y = -90° / 270°)
 * - Exact Doors with swing arcs matching blueprint & sliding door to Deck
 * - Calibrated CAD blueprint overlay pointing to /Sample_maps/Sample_2.png
 */

import { SceneData } from '../state/sceneStore';
import { Project, CADReferenceData } from '../types/project';
import { Room, DoorOpening, WindowOpening, ConnectionGate, FurnitureObject } from '../types/scene';

export const THREE_BHK_ROOMS: Room[] = [
  // ---------------------------------------------------------
  // 1. LIVING / DINING (Center-Top) - 17'-0" X 18'-0"
  // ---------------------------------------------------------
  {
    id: 'room-living-dining',
    name: 'LIVING / DINING',
    width: 17.0,
    depth: 18.0, // 17'-0" X 18'-0"
    height: 9.5,
    position: { x: +5.0, y: 0, z: -5.0 },
    floorMaterial: 'marble_carrara',
    wallColor: '#fdfbf7',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-deck', 'room-kitchen', 'room-bed-1', 'room-bed-3', 'room-bed-2']
  },

  // ---------------------------------------------------------
  // 2. DECK AREA (Top-Right attached to Living) - 5'-0" X 9'-9"
  // ---------------------------------------------------------
  {
    id: 'room-deck',
    name: 'DECK AREA',
    width: 5.0,
    depth: 9.75, // 5'-0" X 9'-9"
    height: 9.5,
    position: { x: +16.0, y: 0, z: -9.125 },
    floorMaterial: 'terrazzo',
    wallColor: '#f8fafc',
    wallThickness: 0.4,
    locked: false,
    connections: ['room-living-dining']
  },

  // ---------------------------------------------------------
  // 3. KITCHEN (Top-Left) - 10'-0" X 10'-0"
  // ---------------------------------------------------------
  {
    id: 'room-kitchen',
    name: 'KITCHEN',
    width: 10.0,
    depth: 10.0, // 10'-0" X 10'-0"
    height: 9.5,
    position: { x: -8.5, y: 0, z: -6.0 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-living-dining', 'room-wash', 'room-store']
  },

  // ---------------------------------------------------------
  // 4. WASH (Below Kitchen West) - 6'-0" X 4'-0"
  // ---------------------------------------------------------
  {
    id: 'room-wash',
    name: 'WASH',
    width: 6.0,
    depth: 4.0, // 6'-0" X 4'-0"
    height: 9.5,
    position: { x: -10.5, y: 0, z: +1.0 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.4,
    locked: false,
    connections: ['room-kitchen']
  },

  // ---------------------------------------------------------
  // 5. STORE (Below Kitchen East) - 4'-0" X 4'-0"
  // ---------------------------------------------------------
  {
    id: 'room-store',
    name: 'STORE',
    width: 4.0,
    depth: 4.0, // 4'-0" X 4'-0"
    height: 9.5,
    position: { x: -5.5, y: 0, z: +1.0 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.4,
    locked: false,
    connections: ['room-kitchen']
  },

  // ---------------------------------------------------------
  // 6. BED ROOM-1 (Bottom-Left) - 12'-0" X 10'-0"
  // ---------------------------------------------------------
  {
    id: 'room-bed-1',
    name: 'BED ROOM-1',
    width: 12.0,
    depth: 10.0, // 12'-0" X 10'-0"
    height: 9.5,
    position: { x: -9.5, y: 0, z: +8.25 },
    floorMaterial: 'hardwood_oak',
    wallColor: '#fafaf9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-toilet-1', 'room-living-dining']
  },

  // ---------------------------------------------------------
  // 7. TOILET (Attached to Bed 1) - 4'-0" X 6'-9"
  // ---------------------------------------------------------
  {
    id: 'room-toilet-1',
    name: 'TOILET',
    width: 4.0,
    depth: 6.75, // 4'-0" X 6'-9"
    height: 9.5,
    position: { x: -1.5, y: 0, z: +9.875 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.4,
    locked: false,
    connections: ['room-bed-1']
  },

  // ---------------------------------------------------------
  // 8. COMMON TOILET (COM. TOI.) - 4'-0" X 6'-9"
  // ---------------------------------------------------------
  {
    id: 'room-com-toilet',
    name: 'COM. TOI.',
    width: 4.0,
    depth: 6.75, // 4'-0" X 6'-9"
    height: 9.5,
    position: { x: +2.5, y: 0, z: +9.875 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.4,
    locked: false,
    connections: ['room-living-dining']
  },

  // ---------------------------------------------------------
  // 9. BED ROOM-3 (Bottom-Center) - 10'-0" X 10'-0"
  // ---------------------------------------------------------
  {
    id: 'room-bed-3',
    name: 'BED ROOM-3',
    width: 10.0,
    depth: 10.0, // 10'-0" X 10'-0"
    height: 9.5,
    position: { x: +9.5, y: 0, z: +8.25 },
    floorMaterial: 'hardwood_oak',
    wallColor: '#fafaf9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-living-dining']
  },

  // ---------------------------------------------------------
  // 10. BED ROOM-2 (Bottom-Right) - 10'-0" X 13'-0"
  // ---------------------------------------------------------
  {
    id: 'room-bed-2',
    name: 'BED ROOM-2',
    width: 10.0,
    depth: 13.0, // 10'-0" X 13'-0"
    height: 9.5,
    position: { x: +18.5, y: 0, z: +6.75 },
    floorMaterial: 'hardwood_oak',
    wallColor: '#fafaf9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-toilet-2', 'room-living-dining']
  },

  // ---------------------------------------------------------
  // 11. TOILET (Attached to Bed 2) - 7'-6" X 4'-6"
  // ---------------------------------------------------------
  {
    id: 'room-toilet-2',
    name: 'TOILET',
    width: 7.5,
    depth: 4.5, // 7'-6" X 4'-6"
    height: 9.5,
    position: { x: +17.25, y: 0, z: -2.0 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.4,
    locked: false,
    connections: ['room-bed-2']
  },

  // ---------------------------------------------------------
  // 12. LIFT (Exterior core on Left) - 6'-0" X 7'-0"
  // ---------------------------------------------------------
  {
    id: 'room-lift',
    name: 'LIFT',
    width: 6.0,
    depth: 7.0, // 6'-0" X 7'-0"
    height: 9.5,
    position: { x: -20.5, y: 0, z: -5.0 },
    floorMaterial: 'concrete_polished',
    wallColor: '#334155',
    wallThickness: 0.6,
    locked: false,
    connections: []
  }
];

export const THREE_BHK_DOORS: DoorOpening[] = [
  // Bed Room-1 Entry Door (swings West into Bed Room-1)
  {
    id: 'door-bed-1',
    roomId: 'room-bed-1',
    position: { x: -3.5, y: 0, z: +4.0 },
    width: 3.2,
    height: 7.0,
    doorType: 'standard',
    rotation: 90
  },
  // Bed Room-1 Toilet Door (swings East into toilet)
  {
    id: 'door-toilet-1',
    roomId: 'room-toilet-1',
    position: { x: -3.5, y: 0, z: +7.2 },
    width: 2.5,
    height: 7.0,
    doorType: 'standard',
    rotation: 0
  },
  // Common Toilet Door (swings South into Common Toilet)
  {
    id: 'door-com-toilet',
    roomId: 'room-com-toilet',
    position: { x: +2.5, y: 0, z: +6.5 },
    width: 2.5,
    height: 7.0,
    doorType: 'standard',
    rotation: 90
  },
  // Bed Room-3 Entry Door (swings South into Bed Room-3)
  {
    id: 'door-bed-3',
    roomId: 'room-bed-3',
    position: { x: +5.5, y: 0, z: +3.25 },
    width: 3.2,
    height: 7.0,
    doorType: 'standard',
    rotation: 0
  },
  // Bed Room-2 Entry Door (swings East into Bed Room-2 vestibule)
  {
    id: 'door-bed-2',
    roomId: 'room-bed-2',
    position: { x: +13.5, y: 0, z: +1.5 },
    width: 3.2,
    height: 7.0,
    doorType: 'standard',
    rotation: 90
  },
  // Toilet 2 Door (swings North into Bed Room-2 toilet)
  {
    id: 'door-toilet-2',
    roomId: 'room-toilet-2',
    position: { x: +15.5, y: 0, z: +0.25 },
    width: 2.5,
    height: 7.0,
    doorType: 'standard',
    rotation: 270
  },
  // Sliding Door from Living to Deck Area
  {
    id: 'door-deck-sliding',
    roomId: 'room-deck',
    position: { x: +13.5, y: 0, z: -9.125 },
    width: 6.0,
    height: 7.5,
    doorType: 'sliding',
    rotation: 90
  },
  // Wash Area Door from Kitchen
  {
    id: 'door-wash',
    roomId: 'room-wash',
    position: { x: -10.5, y: 0, z: -1.0 },
    width: 2.5,
    height: 7.0,
    doorType: 'standard',
    rotation: 90
  },
  // Store Room Door from Kitchen
  {
    id: 'door-store',
    roomId: 'room-store',
    position: { x: -5.5, y: 0, z: -1.0 },
    width: 2.5,
    height: 7.0,
    doorType: 'standard',
    rotation: 90
  },
  // Main Entry Door (swings South into Living/Dining)
  {
    id: 'door-main-entry',
    roomId: 'room-living-dining',
    position: { x: +5.0, y: 0, z: -14.0 },
    width: 3.5,
    height: 7.5,
    doorType: 'standard',
    rotation: 90
  }
];

export const THREE_BHK_WINDOWS: WindowOpening[] = [
  // Bed Room-1 South Window
  {
    id: 'win-bed-1-south',
    roomId: 'room-bed-1',
    position: { x: -9.5, y: 3.5, z: +13.25 },
    width: 6.0,
    height: 5.0,
    elevation: 2.5,
    rotation: 0
  },
  // Bed 1 Toilet South Window
  {
    id: 'win-toilet-1-south',
    roomId: 'room-toilet-1',
    position: { x: -1.5, y: 4.5, z: +13.25 },
    width: 3.0,
    height: 3.0,
    elevation: 4.5,
    rotation: 0
  },
  // Common Toilet South Window
  {
    id: 'win-com-toilet-south',
    roomId: 'room-com-toilet',
    position: { x: +2.5, y: 4.5, z: +13.25 },
    width: 3.0,
    height: 3.0,
    elevation: 4.5,
    rotation: 0
  },
  // Bed Room-3 South Window
  {
    id: 'win-bed-3-south',
    roomId: 'room-bed-3',
    position: { x: +9.5, y: 3.5, z: +13.25 },
    width: 6.0,
    height: 5.0,
    elevation: 2.5,
    rotation: 0
  },
  // Bed Room-2 South Window
  {
    id: 'win-bed-2-south',
    roomId: 'room-bed-2',
    position: { x: +18.5, y: 3.5, z: +13.25 },
    width: 6.0,
    height: 5.0,
    elevation: 2.5,
    rotation: 0
  },
  // Bed Room-2 East Window (above/beside bed)
  {
    id: 'win-bed-2-east',
    roomId: 'room-bed-2',
    position: { x: +23.5, y: 3.5, z: +6.75 },
    width: 6.0,
    height: 5.0,
    elevation: 2.5,
    rotation: 90
  },
  // Toilet 2 East Window
  {
    id: 'win-toilet-2-east',
    roomId: 'room-toilet-2',
    position: { x: +21.0, y: 4.5, z: -2.0 },
    width: 3.0,
    height: 3.0,
    elevation: 4.5,
    rotation: 90
  },
  // Kitchen West Window
  {
    id: 'win-kitchen-west',
    roomId: 'room-kitchen',
    position: { x: -13.5, y: 3.5, z: -6.0 },
    width: 5.0,
    height: 4.5,
    elevation: 3.0,
    rotation: 90
  }
];

export const THREE_BHK_GATES: ConnectionGate[] = [
  // Living/Dining <-> Deck Area
  {
    id: 'gate-living-deck',
    roomIdA: 'room-living-dining',
    roomIdB: 'room-deck',
    wallDirection: 'right',
    width: 6.0,
    height: 8.0,
    position: { x: +13.5, y: 0, z: -9.125 }
  },
  // Living/Dining <-> Kitchen (open breakfast counter/opening)
  {
    id: 'gate-living-kitchen',
    roomIdA: 'room-living-dining',
    roomIdB: 'room-kitchen',
    wallDirection: 'left',
    width: 4.5,
    height: 8.5,
    position: { x: -3.5, y: 0, z: -6.0 }
  },
  // Kitchen <-> Wash
  {
    id: 'gate-kitchen-wash',
    roomIdA: 'room-kitchen',
    roomIdB: 'room-wash',
    wallDirection: 'below',
    width: 2.8,
    height: 7.5,
    position: { x: -10.5, y: 0, z: -1.0 }
  },
  // Kitchen <-> Store
  {
    id: 'gate-kitchen-store',
    roomIdA: 'room-kitchen',
    roomIdB: 'room-store',
    wallDirection: 'below',
    width: 2.8,
    height: 7.5,
    position: { x: -5.5, y: 0, z: -1.0 }
  },
  // Bed Room-1 <-> Toilet 1
  {
    id: 'gate-bed-1-toilet',
    roomIdA: 'room-bed-1',
    roomIdB: 'room-toilet-1',
    wallDirection: 'right',
    width: 2.8,
    height: 7.5,
    position: { x: -3.5, y: 0, z: +7.2 }
  },
  // Bed Room-2 <-> Toilet 2
  {
    id: 'gate-bed-2-toilet',
    roomIdA: 'room-bed-2',
    roomIdB: 'room-toilet-2',
    wallDirection: 'above',
    width: 2.8,
    height: 7.5,
    position: { x: +15.5, y: 0, z: +0.25 }
  }
];

export const THREE_BHK_FURNITURE: FurnitureObject[] = [
  // =========================================================
  // 1. BED ROOM-1 (Headboard SOUTH, facing NORTH)
  // =========================================================
  {
    id: 'furn-b3-bed-1',
    roomId: 'room-bed-1',
    name: 'Double Bed (Bed Room-1)',
    type: 'bed_double',
    category: 'bedroom',
    position: { x: -9.5, y: 0, z: +9.8 },
    rotation: { x: 0, y: 180, z: 0 }, // Headboard against SOUTH wall, facing NORTH
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.0, y: 3.8, z: 6.5 },
    material: 'fabric_linen_grey',
    color: '#e2e8f0',
    locked: false
  },
  {
    id: 'furn-b3-bed-1-nightstand-left',
    roomId: 'room-bed-1',
    name: 'Side Table (Bed 1 Left)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: -13.5, y: 0, z: +11.8 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-b3-bed-1-nightstand-right',
    roomId: 'room-bed-1',
    name: 'Side Table (Bed 1 Right)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: -5.5, y: 0, z: +11.8 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-b3-bed-1-wardrobe',
    roomId: 'room-bed-1',
    name: 'Wardrobe (Bed Room-1)',
    type: 'wardrobe_sliding',
    category: 'storage',
    position: { x: -4.3, y: 0, z: +9.5 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.5, y: 8.5, z: 2.0 },
    material: 'wood_charcoal',
    color: '#334155',
    locked: false
  },
  {
    id: 'furn-b3-bed-1-tv',
    roomId: 'room-bed-1',
    name: 'TV Unit (Bed Room-1)',
    type: 'tv_console_bedroom',
    category: 'storage',
    position: { x: -9.5, y: 0, z: +4.0 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 4.5, y: 3.0, z: 1.2 },
    material: 'wood_oak',
    color: '#1e293b',
    locked: false
  },
  // Bed 1 Attached Toilet
  {
    id: 'furn-b3-toilet-1-wc',
    roomId: 'room-toilet-1',
    name: 'WC (Toilet 1)',
    type: 'bathroom_wc_commode',
    category: 'bathroom',
    position: { x: -1.5, y: 0, z: +12.3 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.6, y: 2.4, z: 2.2 },
    material: 'ceramic_white',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-b3-toilet-1-basin',
    roomId: 'room-toilet-1',
    name: 'Basin (Toilet 1)',
    type: 'bathroom_vanity_basin',
    category: 'bathroom',
    position: { x: -1.5, y: 0, z: +7.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.6, y: 2.8, z: 1.6 },
    material: 'marble_carrara',
    color: '#f1f5f9',
    locked: false
  },
  {
    id: 'furn-b3-toilet-1-shower',
    roomId: 'room-toilet-1',
    name: 'Shower (Toilet 1)',
    type: 'bathroom_shower_cubicle',
    category: 'bathroom',
    position: { x: -1.5, y: 0, z: +9.8 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.8, y: 7.5, z: 2.8 },
    material: 'glass_chrome',
    color: '#cbd5e1',
    locked: false
  },

  // =========================================================
  // 2. COMMON TOILET & CORRIDOR BASIN
  // =========================================================
  {
    id: 'furn-b3-com-toilet-wc',
    roomId: 'room-com-toilet',
    name: 'WC (Common Toilet)',
    type: 'bathroom_wc_commode',
    category: 'bathroom',
    position: { x: +2.5, y: 0, z: +12.3 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.6, y: 2.4, z: 2.2 },
    material: 'ceramic_white',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-b3-corridor-basin',
    roomId: 'room-living-dining',
    name: 'Corridor Vanity Basin',
    type: 'bathroom_vanity_basin',
    category: 'bathroom',
    position: { x: +2.5, y: 0, z: +5.2 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.8, y: 2.8, z: 1.6 },
    material: 'marble_carrara',
    color: '#f1f5f9',
    locked: false
  },

  // =========================================================
  // 3. BED ROOM-3 (Headboard SOUTH, facing NORTH)
  // =========================================================
  {
    id: 'furn-b3-bed-3',
    roomId: 'room-bed-3',
    name: 'Double Bed (Bed Room-3)',
    type: 'bed_double',
    category: 'bedroom',
    position: { x: +9.5, y: 0, z: +9.8 },
    rotation: { x: 0, y: 180, z: 0 }, // Headboard at SOUTH wall, facing NORTH
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.0, y: 3.8, z: 6.5 },
    material: 'fabric_linen_grey',
    color: '#e2e8f0',
    locked: false
  },
  {
    id: 'furn-b3-bed-3-nightstand-left',
    roomId: 'room-bed-3',
    name: 'Side Table (Bed 3 Left)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: +5.8, y: 0, z: +11.8 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-b3-bed-3-nightstand-right',
    roomId: 'room-bed-3',
    name: 'Side Table (Bed 3 Right)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: +13.2, y: 0, z: +11.8 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-b3-bed-3-wardrobe',
    roomId: 'room-bed-3',
    name: 'Wardrobe (Bed Room-3)',
    type: 'wardrobe_sliding',
    category: 'storage',
    position: { x: +10.5, y: 0, z: +4.0 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.0, y: 8.5, z: 2.0 },
    material: 'wood_charcoal',
    color: '#334155',
    locked: false
  },

  // =========================================================
  // 4. BED ROOM-2 (Headboard EAST, facing WEST)
  // =========================================================
  {
    id: 'furn-b3-bed-2',
    roomId: 'room-bed-2',
    name: 'Double Bed (Bed Room-2)',
    type: 'bed_double',
    category: 'bedroom',
    position: { x: +20.0, y: 0, z: +7.2 },
    rotation: { x: 0, y: -90, z: 0 }, // Headboard at EAST wall, facing WEST
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.0, y: 3.8, z: 6.5 },
    material: 'fabric_linen_grey',
    color: '#e2e8f0',
    locked: false
  },
  {
    id: 'furn-b3-bed-2-nightstand-top',
    roomId: 'room-bed-2',
    name: 'Side Table (Bed 2 Top)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: +22.0, y: 0, z: +3.5 },
    rotation: { x: 0, y: -90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-b3-bed-2-nightstand-bottom',
    roomId: 'room-bed-2',
    name: 'Side Table (Bed 2 Bottom)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: +22.0, y: 0, z: +10.8 },
    rotation: { x: 0, y: -90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-b3-bed-2-wardrobe',
    roomId: 'room-bed-2',
    name: 'Wardrobe (Bed Room-2)',
    type: 'wardrobe_sliding',
    category: 'storage',
    position: { x: +19.5, y: 0, z: +1.2 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.5, y: 8.5, z: 2.0 },
    material: 'wood_charcoal',
    color: '#334155',
    locked: false
  },
  {
    id: 'furn-b3-bed-2-tv',
    roomId: 'room-bed-2',
    name: 'TV Unit (Bed Room-2)',
    type: 'tv_console_bedroom',
    category: 'storage',
    position: { x: +14.2, y: 0, z: +7.2 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 4.5, y: 3.0, z: 1.2 },
    material: 'wood_oak',
    color: '#1e293b',
    locked: false
  },
  // Bed 2 Attached Toilet (7'-6" X 4'-6")
  {
    id: 'furn-b3-toilet-2-basin',
    roomId: 'room-toilet-2',
    name: 'Basin (Toilet 2)',
    type: 'bathroom_vanity_basin',
    category: 'bathroom',
    position: { x: +14.6, y: 0, z: -2.0 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.8, y: 2.8, z: 1.6 },
    material: 'marble_carrara',
    color: '#f1f5f9',
    locked: false
  },
  {
    id: 'furn-b3-toilet-2-wc',
    roomId: 'room-toilet-2',
    name: 'WC (Toilet 2)',
    type: 'bathroom_wc_commode',
    category: 'bathroom',
    position: { x: +19.8, y: 0, z: -2.0 },
    rotation: { x: 0, y: -90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.6, y: 2.4, z: 2.2 },
    material: 'ceramic_white',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-b3-toilet-2-shower',
    roomId: 'room-toilet-2',
    name: 'Shower (Toilet 2)',
    type: 'bathroom_shower_cubicle',
    category: 'bathroom',
    position: { x: +17.25, y: 0, z: -3.0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.6, y: 7.5, z: 2.6 },
    material: 'glass_chrome',
    color: '#cbd5e1',
    locked: false
  },

  // =========================================================
  // 5. LIVING / DINING AREA
  // =========================================================
  // North Sofa
  {
    id: 'furn-b3-sofa-north',
    roomId: 'room-living-dining',
    name: '3-Seater Sofa (North)',
    type: 'sofa_4seater',
    category: 'seating',
    position: { x: +7.0, y: 0, z: -12.5 },
    rotation: { x: 0, y: 180, z: 0 }, // Backrest against North, cushions facing South
    scale: { x: 0.85, y: 1, z: 1 },
    dimensions: { x: 7.0, y: 2.8, z: 3.2 },
    material: 'fabric_linen_white',
    color: '#ffffff',
    locked: false
  },
  // East Sofa
  {
    id: 'furn-b3-sofa-east',
    roomId: 'room-living-dining',
    name: '3-Seater Sofa (East)',
    type: 'sofa_4seater',
    category: 'seating',
    position: { x: +11.8, y: 0, z: -8.0 },
    rotation: { x: 0, y: -90, z: 0 }, // Backrest against East, cushions facing West
    scale: { x: 0.85, y: 1, z: 1 },
    dimensions: { x: 7.0, y: 2.8, z: 3.2 },
    material: 'fabric_linen_white',
    color: '#ffffff',
    locked: false
  },
  // Center Coffee Table
  {
    id: 'furn-b3-center-table',
    roomId: 'room-living-dining',
    name: 'Center Table',
    type: 'coffee_table_center',
    category: 'tables',
    position: { x: +7.0, y: 0, z: -8.0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.5, y: 1.5, z: 3.5 },
    material: 'glass_metal',
    color: '#38bdf8',
    locked: false
  },
  // 6-Person Dining Table
  {
    id: 'furn-b3-dining-table',
    roomId: 'room-living-dining',
    name: 'Dining Table (6-Seater)',
    type: 'dining_table_6s',
    category: 'tables',
    position: { x: +5.0, y: 0, z: -1.0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 0.9, y: 1, z: 1 },
    dimensions: { x: 6.5, y: 2.6, z: 3.5 },
    material: 'wood_walnut',
    color: '#451a03',
    locked: false
  },

  // =========================================================
  // 6. KITCHEN PLATFORM & FIXTURES
  // =========================================================
  {
    id: 'furn-b3-kitchen-hob',
    roomId: 'room-kitchen',
    name: '4-Burner Hob Counter',
    type: 'kitchen_counter_hob',
    category: 'kitchen',
    position: { x: -12.3, y: 0, z: -6.5 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 5.0, y: 3.0, z: 2.25 },
    material: 'granite_black',
    color: '#0f172a',
    locked: false
  },
  {
    id: 'furn-b3-kitchen-sink',
    roomId: 'room-kitchen',
    name: 'Kitchen Sink Counter',
    type: 'kitchen_counter_sink',
    category: 'kitchen',
    position: { x: -12.3, y: 0, z: -2.5 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.5, y: 3.0, z: 2.25 },
    material: 'quartz_white',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-b3-kitchen-fridge',
    roomId: 'room-kitchen',
    name: 'Refrigerator',
    type: 'refrigerator_french_door',
    category: 'kitchen',
    position: { x: -5.0, y: 0, z: -9.8 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.0, y: 6.2, z: 2.8 },
    material: 'metal_stainless',
    color: '#64748b',
    locked: false
  },

  // =========================================================
  // 7. WASH & STORE FIXTURES
  // =========================================================
  {
    id: 'furn-b3-wash-wm',
    roomId: 'room-wash',
    name: 'Washing Machine (Wash)',
    type: 'utility_washing_machine',
    category: 'storage',
    position: { x: -11.5, y: 0, z: +1.5 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.4, y: 3.0, z: 2.4 },
    material: 'metal_white',
    color: '#f8fafc',
    locked: false
  },
  {
    id: 'furn-b3-store-rack',
    roomId: 'room-store',
    name: 'Pantry Rack (Store)',
    type: 'store_pantry_rack',
    category: 'storage',
    position: { x: -4.3, y: 0, z: +1.5 },
    rotation: { x: 0, y: -90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.2, y: 7.5, z: 1.6 },
    material: 'metal_steel',
    color: '#475569',
    locked: false
  },

  // =========================================================
  // 8. DECK AREA BALCONY PLANTERS
  // =========================================================
  {
    id: 'furn-b3-deck-planters',
    roomId: 'room-deck',
    name: 'Deck Planter Pots Trio',
    type: 'planter_balcony_pots',
    category: 'outdoor',
    position: { x: +16.0, y: 0, z: -12.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 4.0, y: 3.0, z: 1.4 },
    material: 'terracotta_plants',
    color: '#ea580c',
    locked: false
  }
];

export const THREE_BHK_SAMPLE_SCENE: SceneData = {
  rooms: THREE_BHK_ROOMS,
  furniture: THREE_BHK_FURNITURE,
  gates: THREE_BHK_GATES,
  doors: THREE_BHK_DOORS,
  windows: THREE_BHK_WINDOWS,
  customWalls: [],
  globalCeilingHeight: 9.5
};

export const THREE_BHK_SAMPLE_CAD_DATA: CADReferenceData & { bounds?: any } = {
  fileName: 'Sample_2.png',
  dataUrl: '/Sample_maps/Sample_2.png',
  opacity: 0.65,
  visible: true,
  position: { x: 0, z: 0 },
  bounds: {
    minX: -26.0,
    minY: -16.5,
    widthFeet: 51.5,
    depthFeet: 32.5
  }
};

export function build3BHKSampleProject(): Project {
  const totalAreaSqFt = THREE_BHK_ROOMS.reduce((acc, r) => acc + r.width * r.depth, 0);

  return {
    metadata: {
      id: 'proj-3bhk-sample-residence',
      name: '3BHK_Sample',
      description: 'Custom 3BHK architectural residence matching Sample_2.png blueprint with Living/Dining (17x18), Deck Area (5x9\'9"), Kitchen (10x10), Wash (6x4), Store (4x4), Bed Room-1 (12x10), Bed Room-3 (10x10), Bed Room-2 (10x13), 3 Toilets, and Lift Core.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      roomCount: THREE_BHK_ROOMS.length,
      furnitureCount: THREE_BHK_FURNITURE.length,
      totalAreaSqFt: Math.round(totalAreaSqFt),
      tags: ['3bhk', 'residential', 'luxury', 'architectural'],
      unit: 'feet',
      version: '1.0.0'
    },
    sceneData: THREE_BHK_SAMPLE_SCENE,
    cadData: THREE_BHK_SAMPLE_CAD_DATA,
    aiChatHistory: [
      {
        id: 'msg-seed-3bhk',
        role: 'agent',
        text: 'Welcome to the 3BHK_Sample workspace! All 12 rooms, bed orientations, and fixtures match Sample_2.png with millimeter precision.',
        timestamp: Date.now()
      }
    ]
  };
}
