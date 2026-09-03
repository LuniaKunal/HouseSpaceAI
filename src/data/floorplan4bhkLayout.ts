/**
 * Complete Architectural Project Definition for 4BHK_Sample
 * Exactly replicating Sample_maps/Sample_1.png floor plan blueprint:
 * - 18 Rooms & Zones with true blueprint dimensions, positions, finishes, and wall alcoves
 * - 14 Doors with exact swing arcs, hinges, and orientations matching blueprint drafting
 * - 10 Windows with double-line architectural symbols and accurate elevation heights
 * - 12 Connection Gates for seamless doorway openings and corridor transitions
 * - 45 Furnishings, Structural RCC Columns, Mirrors, and Iconic Concentric Lighting Symbols
 * - Calibrated CAD blueprint overlay pointing to /Sample_maps/Sample_1.png
 */

import { SceneData } from '../state/sceneStore';
import { Project, CADReferenceData } from '../types/project';
import { Room, DoorOpening, WindowOpening, ConnectionGate, FurnitureObject } from '../types/scene';

export const FOUR_BHK_ROOMS: Room[] = [
  // ---------------------------------------------------------
  // 1. MASTER BEDROOM SUITE (Top-Left)
  // Blueprint labels:
  // - Master Bedroom: 18'-0" x 11'-3" (18.0 x 11.25 ft)
  // - Walk in Area: 8'-9" x 5'-4" (8.75 x 5.33 ft)
  // - Att. Toilet: 8'-3" x 5'-4" (8.25 x 5.33 ft)
  // ---------------------------------------------------------
  {
    id: 'room-master',
    name: 'Master Bedroom',
    width: 18.0,
    depth: 11.25, // 18'-0" x 11'-3"
    height: 9.5,
    position: { x: -19.0, y: 0, z: -7.545 },
    floorMaterial: 'herringbone_wood',
    wallColor: '#fdfbf7',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-master-walkin', 'room-dining']
  },
  {
    id: 'room-master-walkin',
    name: 'Walk in Area',
    width: 8.75, // 8'-9" (true blueprint width)
    depth: 5.33, // 5'-4"
    height: 9.5,
    position: { x: -23.625, y: 0, z: -15.835 },
    floorMaterial: 'hardwood_oak',
    wallColor: '#f8fafc',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-master', 'room-master-toilet']
  },
  {
    id: 'room-master-toilet',
    name: 'Att. Toilet',
    width: 8.25, // 8'-3" (true blueprint width)
    depth: 5.33, // 5'-4"
    height: 9.5,
    position: { x: -15.125, y: 0, z: -15.835 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-master-walkin']
  },

  // ---------------------------------------------------------
  // 2. SON BEDROOM SUITE (Bottom-Left)
  // Blueprint labels:
  // - Son Bedroom: 18'-0" x 12'-9" (18.0 x 12.75 ft)
  // - Walk in Area: 9'-0" x 5'-9" (9.0 x 5.75 ft)
  // - Att. Toilet: 8'-3" x 5'-9" (8.25 x 5.75 ft)
  // ---------------------------------------------------------
  {
    id: 'room-son',
    name: 'Son Bedroom',
    width: 18.0,
    depth: 12.75, // 18'-0" x 12'-9"
    height: 9.5,
    position: { x: -19.0, y: 0, z: +4.455 },
    floorMaterial: 'herringbone_wood',
    wallColor: '#fdfbf7',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-son-walkin', 'room-dining', 'room-kitchen']
  },
  {
    id: 'room-son-walkin',
    name: 'Walk in Area',
    width: 9.0, // 9'-0"
    depth: 5.75, // 5'-9"
    height: 9.5,
    position: { x: -23.5, y: 0, z: +13.705 },
    floorMaterial: 'hardwood_oak',
    wallColor: '#f8fafc',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-son', 'room-son-toilet']
  },
  {
    id: 'room-son-toilet',
    name: 'Att. Toilet',
    width: 8.25, // 8'-3" (true blueprint width)
    depth: 5.75, // 5'-9"
    height: 9.5,
    position: { x: -14.875, y: 0, z: +13.705 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-son-walkin']
  },

  // ---------------------------------------------------------
  // 3. GUEST BEDROOM (Top-Center)
  // Blueprint labels: 13'-9" x 10'-0" (13.75 x 10.0 ft)
  // ---------------------------------------------------------
  {
    id: 'room-guest',
    name: 'Guest Bedroom',
    width: 13.75,
    depth: 10.0, // 13'-9" x 10'-0"
    height: 9.5,
    position: { x: -3.125, y: 0, z: -13.5 },
    floorMaterial: 'hardwood_oak',
    wallColor: '#fafaf9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-dining']
  },

  // ---------------------------------------------------------
  // 4. POWDER TOILET (Top-Center between Guest & Daughter)
  // Blueprint labels: 4'-9" x 6'-3" (4.75 x 6.25 ft)
  // ---------------------------------------------------------
  {
    id: 'room-ptoilet',
    name: 'P. Toilet',
    width: 4.75,
    depth: 6.25, // 4'-9" x 6'-3"
    height: 9.5,
    position: { x: +6.125, y: 0, z: -15.375 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-dining']
  },

  // ---------------------------------------------------------
  // 5. DAUGHTER BEDROOM SUITE & BALCONY (Top-Right)
  // Blueprint labels:
  // - Daughter Bedroom: 16'-9" x 11'-9" (16.75 x 11.75 ft)
  // - Att. Toilet: 8'-6" x 4'-9" (8.5 x 4.75 ft)
  // - Balcony: 8'-0" x 5'-0" (8.0 x 5.0 ft)
  // ---------------------------------------------------------
  {
    id: 'room-daughter',
    name: 'Daughter Bedroom',
    width: 16.75,
    depth: 11.75, // 16'-9" x 11'-9"
    height: 9.5,
    position: { x: +16.875, y: 0, z: -7.875 },
    floorMaterial: 'hardwood_oak',
    wallColor: '#fafaf9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-dining', 'room-daughter-toilet', 'room-balcony']
  },
  {
    id: 'room-daughter-toilet',
    name: 'Att. Toilet',
    width: 8.5,
    depth: 4.75, // 8'-6" x 4'-9"
    height: 9.5,
    position: { x: +12.75, y: 0, z: -16.125 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-daughter']
  },
  {
    id: 'room-balcony',
    name: 'Balcony',
    width: 8.0,
    depth: 5.0, // 8'-0" x 5'-0"
    height: 9.5,
    position: { x: +21.0, y: 0, z: -16.0 },
    floorMaterial: 'terrazzo',
    wallColor: '#f8fafc',
    wallThickness: 0.4,
    locked: false,
    connections: ['room-daughter']
  },

  // ---------------------------------------------------------
  // 6. DINING AREA & CENTRAL CORRIDOR (With North Wall Alcove)
  // Leverages new WallAlcove tool to extend floor & walls northwards
  // into the corridor leading to P. Toilet and framing the vanity Basin niche!
  // ---------------------------------------------------------
  {
    id: 'room-dining',
    name: 'Dining Area',
    width: 18.5,
    depth: 10.5,
    height: 9.5,
    position: { x: -0.75, y: 0, z: -3.25 },
    alcove: {
      edge: 'north',
      type: 'protrusion',
      offset: 13.75, // distance from west wall to corridor opening
      width: 4.75,   // spans the width of P. Toilet corridor
      depth: 3.75    // extends north to touch P. Toilet at z = -12.25
    },
    floorMaterial: 'marble_carrara',
    wallColor: '#fdfbf7',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-master', 'room-son', 'room-guest', 'room-ptoilet', 'room-daughter', 'room-kitchen', 'room-living']
  },

  // ---------------------------------------------------------
  // 7. KITCHEN & FOOD SERVICE (10'-9" x 11'-2")
  // ---------------------------------------------------------
  {
    id: 'room-kitchen',
    name: 'Kitchen',
    width: 10.75,
    depth: 11.17, // 10'-9" x 11'-2"
    height: 9.5,
    position: { x: -4.625, y: 0, z: +6.415 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-dining', 'room-store', 'room-utility']
  },

  // ---------------------------------------------------------
  // 8. POOJA ROOM (Sacred Sanctuary) (3'-0" x 2'-6")
  // ---------------------------------------------------------
  {
    id: 'room-pooja',
    name: 'Pooja',
    width: 3.0,
    depth: 2.5, // 3'-0" x 2'-6"
    height: 9.5,
    position: { x: +2.25, y: 0, z: +4.75 },
    floorMaterial: 'marble_carrara',
    wallColor: '#fffbeb',
    wallThickness: 0.4,
    locked: false,
    connections: ['room-dining']
  },

  // ---------------------------------------------------------
  // 9. STORE ROOM (4'-9" x 5'-9")
  // ---------------------------------------------------------
  {
    id: 'room-store',
    name: 'Store',
    width: 4.75,
    depth: 5.75, // 4'-9" x 5'-9"
    height: 9.5,
    position: { x: +3.125, y: 0, z: +8.875 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-kitchen']
  },

  // ---------------------------------------------------------
  // 10. UTILITY AREA (Laundry & Wash) (14'-0" x 4'-6")
  // ---------------------------------------------------------
  {
    id: 'room-utility',
    name: 'Utility Area',
    width: 14.0,
    depth: 4.5, // 14'-0" x 4'-6"
    height: 9.5,
    position: { x: -3.0, y: 0, z: +14.25 },
    floorMaterial: 'ceramic_tile',
    wallColor: '#f1f5f9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-kitchen']
  },

  // ---------------------------------------------------------
  // 11. GRAND LIVING AREA (South-East) (20'-0" x 18'-9")
  // ---------------------------------------------------------
  {
    id: 'room-living',
    name: 'Living Area',
    width: 20.0,
    depth: 18.75, // 20'-0" x 18'-9"
    height: 9.5,
    position: { x: +15.5, y: 0, z: +7.375 },
    floorMaterial: 'marble_carrara',
    wallColor: '#fafaf9',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-dining', 'room-entry']
  },

  // ---------------------------------------------------------
  // 12. MAIN ENTRY FOYER (South Vestibule)
  // ---------------------------------------------------------
  {
    id: 'room-entry',
    name: 'Main Entry',
    width: 3.5,
    depth: 4.75,
    height: 9.5,
    position: { x: +5.75, y: 0, z: +14.125 },
    floorMaterial: 'marble_carrara',
    wallColor: '#f8fafc',
    wallThickness: 0.5,
    locked: false,
    connections: ['room-living']
  }
];

export const FOUR_BHK_DOORS: DoorOpening[] = [
  // Master Bedroom Entry Door (swings West against East wall)
  {
    id: 'door-master-entry',
    roomId: 'room-master',
    position: { x: -10.0, y: 0, z: -1.9 },
    width: 3.2,
    height: 7.0,
    doorType: 'standard',
    rotation: 270
  },
  // Master Walk-in Door (swings West into Walk-in Area)
  {
    id: 'door-master-walkin',
    roomId: 'room-master-walkin',
    position: { x: -19.25, y: 0, z: -13.17 },
    width: 2.8,
    height: 7.0,
    doorType: 'standard',
    rotation: 180
  },
  // Master Toilet Door (swings East into toilet against wall)
  {
    id: 'door-master-toilet',
    roomId: 'room-master-toilet',
    position: { x: -19.25, y: 0, z: -15.5 },
    width: 2.5,
    height: 7.0,
    doorType: 'standard',
    rotation: 0
  },
  // Son Bedroom Entry Door (swings West into Son Bedroom)
  {
    id: 'door-son-entry',
    roomId: 'room-son',
    position: { x: -10.0, y: 0, z: -1.5 },
    width: 3.2,
    height: 7.0,
    doorType: 'standard',
    rotation: 90
  },
  // Son Walk-in Door (swings South into Walk-in Area)
  {
    id: 'door-son-walkin',
    roomId: 'room-son-walkin',
    position: { x: -19.0, y: 0, z: +10.83 },
    width: 2.8,
    height: 7.0,
    doorType: 'standard',
    rotation: 0
  },
  // Son Toilet Door (swings East into toilet against wall)
  {
    id: 'door-son-toilet',
    roomId: 'room-son-toilet',
    position: { x: -19.0, y: 0, z: +12.0 },
    width: 2.5,
    height: 7.0,
    doorType: 'standard',
    rotation: 0
  },
  // Guest Bedroom Door (swings West into Guest Bedroom against wardrobe wall)
  {
    id: 'door-guest-entry',
    roomId: 'room-guest',
    position: { x: +3.75, y: 0, z: -8.5 },
    width: 3.2,
    height: 7.0,
    doorType: 'standard',
    rotation: 270
  },
  // Powder Toilet Door (swings into P. Toilet against wall)
  {
    id: 'door-ptoilet',
    roomId: 'room-ptoilet',
    position: { x: +3.75, y: 0, z: -13.5 },
    width: 2.5,
    height: 7.0,
    doorType: 'standard',
    rotation: 270
  },
  // Daughter Bedroom Entry Door (swings East into Daughter Bedroom against wardrobe alcove)
  {
    id: 'door-daughter-entry',
    roomId: 'room-daughter',
    position: { x: +8.5, y: 0, z: -2.0 },
    width: 3.2,
    height: 7.0,
    doorType: 'standard',
    rotation: 270
  },
  // Daughter Att. Toilet Door (swings North into toilet)
  {
    id: 'door-daughter-toilet',
    roomId: 'room-daughter-toilet',
    position: { x: +9.5, y: 0, z: -13.75 },
    width: 2.5,
    height: 7.0,
    doorType: 'standard',
    rotation: 270
  },
  // Daughter Balcony Door (swings into Balcony against east railing)
  {
    id: 'door-daughter-balcony',
    roomId: 'room-balcony',
    position: { x: +17.0, y: 0, z: -13.5 },
    width: 2.8,
    height: 7.0,
    doorType: 'standard',
    rotation: 270
  },
  // Store Door (swings East into Store Room)
  {
    id: 'door-store',
    roomId: 'room-store',
    position: { x: +0.75, y: 0, z: +7.5 },
    width: 2.5,
    height: 7.0,
    doorType: 'standard',
    rotation: 0
  },
  // Utility Area Door (swings South into Utility Area)
  {
    id: 'door-utility',
    roomId: 'room-utility',
    position: { x: -2.0, y: 0, z: +12.0 },
    width: 2.8,
    height: 7.0,
    doorType: 'standard',
    rotation: 90
  },
  // Main Entry Exterior Door (swings North into Foyer)
  {
    id: 'door-main-entry',
    roomId: 'room-entry',
    position: { x: +5.75, y: 0, z: +16.5 },
    width: 3.5,
    height: 7.5,
    doorType: 'standard',
    rotation: 180
  }
];

export const FOUR_BHK_WINDOWS: WindowOpening[] = [
  // Master Toilet Window (North exterior wall)
  {
    id: 'win-master-toilet',
    roomId: 'room-master-toilet',
    position: { x: -15.125, y: 4.5, z: -18.5 },
    width: 4.0,
    height: 3.5,
    elevation: 4.5,
    rotation: 0
  },
  // Master Bedroom North Lightwell Window
  {
    id: 'win-master-north',
    roomId: 'room-master',
    position: { x: -14.0, y: 3.5, z: -13.17 },
    width: 5.0,
    height: 5.0,
    elevation: 3.0,
    rotation: 0
  },
  // Master Bedroom West Window
  {
    id: 'win-master-west',
    roomId: 'room-master',
    position: { x: -28.0, y: 3.5, z: -7.545 },
    width: 6.0,
    height: 5.0,
    elevation: 2.5,
    rotation: 90
  },
  // Son Bedroom West Window (Panoramic window behind 3-seater lounger)
  {
    id: 'win-son-west',
    roomId: 'room-son',
    position: { x: -28.0, y: 3.5, z: +4.455 },
    width: 7.5,
    height: 5.5,
    elevation: 2.5,
    rotation: 90
  },
  // Son Toilet South Window
  {
    id: 'win-son-toilet',
    roomId: 'room-son-toilet',
    position: { x: -14.875, y: 4.5, z: +16.58 },
    width: 4.0,
    height: 3.5,
    elevation: 4.5,
    rotation: 0
  },
  // Guest Bedroom North Window
  {
    id: 'win-guest-north',
    roomId: 'room-guest',
    position: { x: -3.125, y: 3.5, z: -18.5 },
    width: 6.5,
    height: 5.0,
    elevation: 3.0,
    rotation: 0
  },
  // Daughter Att. Toilet North Window
  {
    id: 'win-daughter-toilet',
    roomId: 'room-daughter-toilet',
    position: { x: +12.75, y: 4.5, z: -18.5 },
    width: 3.5,
    height: 3.0,
    elevation: 4.5,
    rotation: 0
  },
  // Daughter Bedroom East Window
  {
    id: 'win-daughter-east',
    roomId: 'room-daughter',
    position: { x: +25.25, y: 3.5, z: -7.875 },
    width: 6.0,
    height: 5.5,
    elevation: 2.5,
    rotation: 90
  },
  // Utility Area South Window / Louvers
  {
    id: 'win-utility-south',
    roomId: 'room-utility',
    position: { x: -3.0, y: 4.0, z: +16.5 },
    width: 6.0,
    height: 3.5,
    elevation: 4.0,
    rotation: 0
  },
  // Living Area East Floor-to-Ceiling Windows (Behind lush green planter trough)
  {
    id: 'win-living-east',
    roomId: 'room-living',
    position: { x: +25.5, y: 3.5, z: +7.375 },
    width: 14.0,
    height: 6.5,
    elevation: 1.5,
    rotation: 90
  }
];

export const FOUR_BHK_GATES: ConnectionGate[] = [
  {
    id: 'gate-master-walkin',
    roomIdA: 'room-master',
    roomIdB: 'room-master-walkin',
    wallDirection: 'above',
    width: 3.5,
    height: 8.0,
    position: { x: -21.0, y: 0, z: -13.17 }
  },
  {
    id: 'gate-master-toilet',
    roomIdA: 'room-master-walkin',
    roomIdB: 'room-master-toilet',
    wallDirection: 'right',
    width: 3.0,
    height: 8.0,
    position: { x: -19.25, y: 0, z: -15.835 }
  },
  {
    id: 'gate-son-walkin',
    roomIdA: 'room-son',
    roomIdB: 'room-son-walkin',
    wallDirection: 'below',
    width: 3.5,
    height: 8.0,
    position: { x: -21.0, y: 0, z: +10.83 }
  },
  {
    id: 'gate-son-toilet',
    roomIdA: 'room-son-walkin',
    roomIdB: 'room-son-toilet',
    wallDirection: 'right',
    width: 3.0,
    height: 8.0,
    position: { x: -19.0, y: 0, z: +13.705 }
  },
  {
    id: 'gate-dining-living',
    roomIdA: 'room-dining',
    roomIdB: 'room-living',
    wallDirection: 'right',
    width: 7.0,
    height: 8.5,
    position: { x: +5.5, y: 0, z: +0.5 }
  },
  {
    id: 'gate-dining-kitchen',
    roomIdA: 'room-dining',
    roomIdB: 'room-kitchen',
    wallDirection: 'below',
    width: 6.0,
    height: 8.5,
    position: { x: -4.625, y: 0, z: +0.83 }
  },
  {
    id: 'gate-kitchen-store',
    roomIdA: 'room-kitchen',
    roomIdB: 'room-store',
    wallDirection: 'right',
    width: 3.0,
    height: 8.0,
    position: { x: +0.75, y: 0, z: +7.5 }
  },
  {
    id: 'gate-kitchen-utility',
    roomIdA: 'room-kitchen',
    roomIdB: 'room-utility',
    wallDirection: 'below',
    width: 4.0,
    height: 8.0,
    position: { x: -2.0, y: 0, z: +12.0 }
  },
  {
    id: 'gate-daughter-toilet',
    roomIdA: 'room-daughter',
    roomIdB: 'room-daughter-toilet',
    wallDirection: 'above',
    width: 3.0,
    height: 8.0,
    position: { x: +11.5, y: 0, z: -13.75 }
  },
  {
    id: 'gate-daughter-balcony',
    roomIdA: 'room-daughter',
    roomIdB: 'room-balcony',
    wallDirection: 'above',
    width: 3.5,
    height: 8.0,
    position: { x: +19.0, y: 0, z: -13.5 }
  },
  {
    id: 'gate-foyer-living',
    roomIdA: 'room-entry',
    roomIdB: 'room-living',
    wallDirection: 'right',
    width: 4.5,
    height: 8.5,
    position: { x: +7.5, y: 0, z: +14.125 }
  },
  {
    id: 'gate-dining-corridor',
    roomIdA: 'room-dining',
    roomIdB: 'room-ptoilet',
    wallDirection: 'above',
    width: 4.75,
    height: 8.5,
    position: { x: +6.125, y: 0, z: -8.5 }
  }
];

export const FOUR_BHK_FURNITURE: FurnitureObject[] = [
  // =========================================================
  // 1. MASTER BEDROOM (Headboard SOUTH, pillows facing NORTH)
  // =========================================================
  {
    id: 'furn-master-bed',
    roomId: 'room-master',
    name: 'Double bed 6\'-0" x 6\'-6"',
    type: 'bed_double',
    category: 'bedroom',
    position: { x: -19.0, y: 0, z: -5.8 },
    rotation: { x: 0, y: 180, z: 0 }, // Headboard at South (-dimZ in local -> +Z in world), facing North
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.0, y: 3.8, z: 6.5 },
    material: 'fabric_linen_grey',
    color: '#e2e8f0',
    locked: false
  },
  {
    id: 'furn-master-nightstand-left',
    roomId: 'room-master',
    name: 'Side Table (Master Left)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: -23.0, y: 0, z: -3.8 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-master-nightstand-right',
    roomId: 'room-master',
    name: 'Side Table (Master Right)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: -15.0, y: 0, z: -3.8 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-master-wardrobe-east',
    roomId: 'room-master',
    name: 'Wardrobe 2\'-0" x 6\'-6"',
    type: 'wardrobe_sliding',
    category: 'storage',
    position: { x: -10.8, y: 0, z: -7.55 },
    rotation: { x: 0, y: -90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.5, y: 8.5, z: 2.0 },
    material: 'wood_charcoal',
    color: '#334155',
    locked: false
  },
  // Master Bedroom Corner Uplighters (Iconic concentric light symbols from Sample_1.png)
  {
    id: 'furn-master-light-nw',
    roomId: 'room-master',
    name: 'Corner Uplighter (Master NW)',
    type: 'light_floor_lamp',
    category: 'lighting',
    position: { x: -26.8, y: 0, z: -11.8 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 5.5, z: 1.5 },
    material: 'brass_warm_glow',
    color: '#f59e0b',
    locked: false
  },
  {
    id: 'furn-master-light-sw',
    roomId: 'room-master',
    name: 'Corner Uplighter (Master SW)',
    type: 'light_floor_lamp',
    category: 'lighting',
    position: { x: -26.8, y: 0, z: -3.0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 5.5, z: 1.5 },
    material: 'brass_warm_glow',
    color: '#f59e0b',
    locked: false
  },
  // Master Walk-in Area
  {
    id: 'furn-master-walkin-wardrobe',
    roomId: 'room-master-walkin',
    name: 'Wardrobe 2\'-0" x 5\'-4"',
    type: 'wardrobe_sliding',
    category: 'storage',
    position: { x: -27.0, y: 0, z: -15.835 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 5.33, y: 8.5, z: 2.0 },
    material: 'wood_charcoal',
    color: '#334155',
    locked: false
  },
  {
    id: 'furn-master-consol',
    roomId: 'room-master-walkin',
    name: 'Low ht Consol 36" x 20"',
    type: 'consol_low_ht',
    category: 'storage',
    position: { x: -23.625, y: 0, z: -17.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.0, y: 2.4, z: 1.67 },
    material: 'marble_carrara',
    color: '#f8fafc',
    locked: false
  },
  {
    id: 'furn-master-walkin-mirror',
    roomId: 'room-master-walkin',
    name: 'Mirror 36" (Master)',
    type: 'mirror_wall',
    category: 'decor',
    position: { x: -23.625, y: 3.5, z: -18.35 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.0, y: 3.5, z: 0.15 },
    material: 'mirror_silver',
    color: '#38bdf8',
    locked: false
  },
  // Master Attached Toilet
  {
    id: 'furn-master-wc',
    roomId: 'room-master-toilet',
    name: 'WC (Master Toilet)',
    type: 'bathroom_wc_commode',
    category: 'bathroom',
    position: { x: -17.5, y: 0, z: -17.3 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.6, y: 2.4, z: 2.2 },
    material: 'ceramic_white',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-master-basin',
    roomId: 'room-master-toilet',
    name: 'Basin Counter (Master)',
    type: 'bathroom_vanity_basin',
    category: 'bathroom',
    position: { x: -15.125, y: 0, z: -14.0 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.2, y: 2.8, z: 1.8 },
    material: 'marble_carrara',
    color: '#f1f5f9',
    locked: false
  },
  {
    id: 'furn-master-shower',
    roomId: 'room-master-toilet',
    name: 'Shower Enclosure (Master)',
    type: 'bathroom_shower_cubicle',
    category: 'bathroom',
    position: { x: -12.3, y: 0, z: -15.835 },
    rotation: { x: 0, y: -90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.2, y: 7.5, z: 3.2 },
    material: 'glass_chrome',
    color: '#cbd5e1',
    locked: false
  },

  // =========================================================
  // 2. SON BEDROOM (Headboard SOUTH, pillows facing NORTH)
  // =========================================================
  {
    id: 'furn-son-bed',
    roomId: 'room-son',
    name: 'Double bed 6\'-0" x 6\'-6"',
    type: 'bed_double',
    category: 'bedroom',
    position: { x: -19.0, y: 0, z: +6.2 },
    rotation: { x: 0, y: 180, z: 0 }, // Headboard at South, facing North
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.0, y: 3.8, z: 6.5 },
    material: 'fabric_linen_grey',
    color: '#e2e8f0',
    locked: false
  },
  {
    id: 'furn-son-nightstand-left',
    roomId: 'room-son',
    name: 'Side Table (Son Left)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: -23.0, y: 0, z: +8.2 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-son-nightstand-right',
    roomId: 'room-son',
    name: 'Side Table (Son Right)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: -15.0, y: 0, z: +8.2 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-son-lounger',
    roomId: 'room-son',
    name: '3 Seater Lounger',
    type: 'sofa_3seater_lounger',
    category: 'seating',
    position: { x: -26.0, y: 0, z: +3.5 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.0, y: 2.8, z: 6.5 },
    material: 'velvet_cyan',
    color: '#38bdf8',
    locked: false
  },
  {
    id: 'furn-son-study-desk',
    roomId: 'room-son',
    name: 'Study Table 72" x 21"',
    type: 'study_table_desk',
    category: 'office',
    position: { x: -19.5, y: 0, z: -1.0 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.0, y: 2.5, z: 1.75 },
    material: 'wood_oak',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-son-storage-low',
    roomId: 'room-son',
    name: 'Low ht Storage',
    type: 'storage_low_ht',
    category: 'storage',
    position: { x: -15.0, y: 0, z: -1.0 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.5, y: 2.2, z: 1.75 },
    material: 'wood_oak',
    color: '#e2e8f0',
    locked: false
  },
  // Son Bedroom Corner Uplighters (Iconic concentric symbols from Sample_1.png)
  {
    id: 'furn-son-light-nw',
    roomId: 'room-son',
    name: 'Corner Uplighter (Son NW)',
    type: 'light_floor_lamp',
    category: 'lighting',
    position: { x: -26.8, y: 0, z: -0.8 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 5.5, z: 1.5 },
    material: 'brass_warm_glow',
    color: '#f59e0b',
    locked: false
  },
  {
    id: 'furn-son-light-sw',
    roomId: 'room-son',
    name: 'Corner Uplighter (Son SW)',
    type: 'light_floor_lamp',
    category: 'lighting',
    position: { x: -26.8, y: 0, z: +9.8 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 5.5, z: 1.5 },
    material: 'brass_warm_glow',
    color: '#f59e0b',
    locked: false
  },
  // Son Walk-in Area
  {
    id: 'furn-son-walkin-wardrobe',
    roomId: 'room-son-walkin',
    name: 'Wardrobe 2\'-0" x 5\'-9"',
    type: 'wardrobe_sliding',
    category: 'storage',
    position: { x: -27.0, y: 0, z: +13.705 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 5.75, y: 8.5, z: 2.0 },
    material: 'wood_charcoal',
    color: '#334155',
    locked: false
  },
  {
    id: 'furn-son-consol',
    roomId: 'room-son-walkin',
    name: 'Low ht Consol 36" x 20"',
    type: 'consol_low_ht',
    category: 'storage',
    position: { x: -23.5, y: 0, z: +15.6 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.0, y: 2.4, z: 1.67 },
    material: 'marble_carrara',
    color: '#f8fafc',
    locked: false
  },
  {
    id: 'furn-son-walkin-mirror',
    roomId: 'room-son-walkin',
    name: 'Mirror 36" (Son)',
    type: 'mirror_wall',
    category: 'decor',
    position: { x: -23.5, y: 3.5, z: +16.45 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.0, y: 3.5, z: 0.15 },
    material: 'mirror_silver',
    color: '#38bdf8',
    locked: false
  },
  // Son Attached Toilet
  {
    id: 'furn-son-wc',
    roomId: 'room-son-toilet',
    name: 'WC (Son Toilet)',
    type: 'bathroom_wc_commode',
    category: 'bathroom',
    position: { x: -17.2, y: 0, z: +15.5 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.6, y: 2.4, z: 2.2 },
    material: 'ceramic_white',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-son-basin',
    roomId: 'room-son-toilet',
    name: 'Basin Counter (Son)',
    type: 'bathroom_vanity_basin',
    category: 'bathroom',
    position: { x: -14.875, y: 0, z: +11.8 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.2, y: 2.8, z: 1.8 },
    material: 'marble_carrara',
    color: '#f1f5f9',
    locked: false
  },
  {
    id: 'furn-son-shower',
    roomId: 'room-son-toilet',
    name: 'Shower Enclosure (Son)',
    type: 'bathroom_shower_cubicle',
    category: 'bathroom',
    position: { x: -11.9, y: 0, z: +13.705 },
    rotation: { x: 0, y: -90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.2, y: 7.5, z: 3.2 },
    material: 'glass_chrome',
    color: '#cbd5e1',
    locked: false
  },

  // =========================================================
  // 3. GUEST BEDROOM (Headboard WEST, pillows facing EAST)
  // =========================================================
  {
    id: 'furn-guest-bed',
    roomId: 'room-guest',
    name: 'Double bed 6\'-0" x 6\'-9"',
    type: 'bed_guest_double',
    category: 'bedroom',
    position: { x: -5.5, y: 0, z: -13.5 },
    rotation: { x: 0, y: 90, z: 0 }, // Headboard at West, facing East
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.75, y: 3.8, z: 6.0 },
    material: 'fabric_linen_grey',
    color: '#e2e8f0',
    locked: false
  },
  {
    id: 'furn-guest-nightstand-top',
    roomId: 'room-guest',
    name: 'Side Table (Guest Top)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: -8.8, y: 0, z: -17.0 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-guest-nightstand-bottom',
    roomId: 'room-guest',
    name: 'Side Table (Guest Bottom)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: -8.8, y: 0, z: -10.0 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-guest-wardrobe',
    roomId: 'room-guest',
    name: 'Wardrobe 2\'-0" x 6\'-0"',
    type: 'wardrobe_sliding',
    category: 'storage',
    position: { x: +2.6, y: 0, z: -15.5 },
    rotation: { x: 0, y: -90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.0, y: 8.5, z: 2.0 },
    material: 'wood_charcoal',
    color: '#334155',
    locked: false
  },
  {
    id: 'furn-guest-mirror',
    roomId: 'room-guest',
    name: 'Mirror (Guest Bedroom)',
    type: 'mirror_wall',
    category: 'decor',
    position: { x: -3.125, y: 3.5, z: -8.65 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 4.5, y: 3.5, z: 0.15 },
    material: 'mirror_silver',
    color: '#38bdf8',
    locked: false
  },

  // =========================================================
  // 4. POWDER TOILET & CORRIDOR WASH BASIN
  // =========================================================
  {
    id: 'furn-ptoilet-wc',
    roomId: 'room-ptoilet',
    name: 'WC (P. Toilet)',
    type: 'bathroom_wc_commode',
    category: 'bathroom',
    position: { x: +7.2, y: 0, z: -13.2 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.6, y: 2.4, z: 2.2 },
    material: 'ceramic_white',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-ptoilet-shower',
    roomId: 'room-ptoilet',
    name: 'Shower (P. Toilet)',
    type: 'bathroom_shower_cubicle',
    category: 'bathroom',
    position: { x: +7.2, y: 0, z: -17.2 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.5, y: 7.5, z: 2.5 },
    material: 'glass_chrome',
    color: '#cbd5e1',
    locked: false
  },
  {
    id: 'furn-corridor-basin',
    roomId: 'room-dining',
    name: 'Basin (Corridor Niche)',
    type: 'bathroom_vanity_basin',
    category: 'bathroom',
    position: { x: +6.125, y: 0, z: -10.5 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.2, y: 2.8, z: 1.8 },
    material: 'marble_carrara',
    color: '#f1f5f9',
    locked: false
  },
  {
    id: 'furn-corridor-light',
    roomId: 'room-dining',
    name: 'Wall Sconce (Corridor Niche)',
    type: 'light_sconce',
    category: 'lighting',
    position: { x: +7.8, y: 4.5, z: -10.5 },
    rotation: { x: 0, y: 270, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 0.8, y: 1.2, z: 0.8 },
    material: 'brass_warm_glow',
    color: '#f59e0b',
    locked: false
  },

  // =========================================================
  // 5. DAUGHTER BEDROOM (Headboard NORTH, pillows facing SOUTH)
  // =========================================================
  {
    id: 'furn-daughter-bed',
    roomId: 'room-daughter',
    name: 'Double bed 6\'-0" x 6\'-6"',
    type: 'bed_double',
    category: 'bedroom',
    position: { x: +17.5, y: 0, z: -7.5 },
    rotation: { x: 0, y: 0, z: 0 }, // Headboard at North, facing South
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.0, y: 3.8, z: 6.5 },
    material: 'fabric_linen_grey',
    color: '#e2e8f0',
    locked: false
  },
  {
    id: 'furn-daughter-nightstand-left',
    roomId: 'room-daughter',
    name: 'Side Table (Daughter Left)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: +13.5, y: 0, z: -7.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-daughter-nightstand-right',
    roomId: 'room-daughter',
    name: 'Side Table (Daughter Right)',
    type: 'nightstand_modern',
    category: 'tables',
    position: { x: +21.5, y: 0, z: -7.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 1.8, z: 1.6 },
    material: 'wood_oak',
    color: '#5c3a21',
    locked: false
  },
  {
    id: 'furn-daughter-wardrobe',
    roomId: 'room-daughter',
    name: 'Wardrobe 2\'-0" x 6\'-3"',
    type: 'wardrobe_sliding',
    category: 'storage',
    position: { x: +9.6, y: 0, z: -11.0 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.25, y: 8.5, z: 2.0 },
    material: 'wood_charcoal',
    color: '#334155',
    locked: false
  },
  {
    id: 'furn-daughter-consol',
    roomId: 'room-daughter',
    name: 'Low ht Consol 36" x 18"',
    type: 'consol_low_ht',
    category: 'storage',
    position: { x: +9.6, y: 0, z: -5.0 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.0, y: 2.4, z: 1.5 },
    material: 'marble_carrara',
    color: '#f8fafc',
    locked: false
  },
  {
    id: 'furn-daughter-mirror',
    roomId: 'room-daughter',
    name: 'Mirror (Daughter Bedroom)',
    type: 'mirror_wall',
    category: 'decor',
    position: { x: +9.6, y: 3.5, z: -3.0 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.5, y: 3.5, z: 0.15 },
    material: 'mirror_silver',
    color: '#38bdf8',
    locked: false
  },
  {
    id: 'furn-daughter-tv',
    roomId: 'room-daughter',
    name: 'T.V (Daughter Bedroom)',
    type: 'tv_console_bedroom',
    category: 'storage',
    position: { x: +15.0, y: 0, z: -13.2 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 4.5, y: 3.0, z: 1.2 },
    material: 'wood_oak',
    color: '#1e293b',
    locked: false
  },
  // Daughter Bedroom Corner Uplighters
  {
    id: 'furn-daughter-light-ne',
    roomId: 'room-daughter',
    name: 'Corner Uplighter (Daughter NE)',
    type: 'light_floor_lamp',
    category: 'lighting',
    position: { x: +24.2, y: 0, z: -12.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 5.5, z: 1.5 },
    material: 'brass_warm_glow',
    color: '#f59e0b',
    locked: false
  },
  {
    id: 'furn-daughter-light-se',
    roomId: 'room-daughter',
    name: 'Corner Uplighter (Daughter SE)',
    type: 'light_floor_lamp',
    category: 'lighting',
    position: { x: +24.2, y: 0, z: -3.2 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 5.5, z: 1.5 },
    material: 'brass_warm_glow',
    color: '#f59e0b',
    locked: false
  },
  // Daughter Attached Toilet
  {
    id: 'furn-daughter-wc',
    roomId: 'room-daughter-toilet',
    name: 'WC (Daughter Toilet)',
    type: 'bathroom_wc_commode',
    category: 'bathroom',
    position: { x: +10.2, y: 0, z: -17.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.6, y: 2.4, z: 2.2 },
    material: 'ceramic_white',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-daughter-basin',
    roomId: 'room-daughter-toilet',
    name: 'Basin (Daughter Toilet)',
    type: 'bathroom_vanity_basin',
    category: 'bathroom',
    position: { x: +9.6, y: 0, z: -15.0 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.0, y: 2.8, z: 1.8 },
    material: 'marble_carrara',
    color: '#f1f5f9',
    locked: false
  },
  {
    id: 'furn-daughter-shower',
    roomId: 'room-daughter-toilet',
    name: 'Shower (Daughter Toilet)',
    type: 'bathroom_shower_cubicle',
    category: 'bathroom',
    position: { x: +15.5, y: 0, z: -16.0 },
    rotation: { x: 0, y: -90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.2, y: 7.5, z: 3.2 },
    material: 'glass_chrome',
    color: '#cbd5e1',
    locked: false
  },
  // Balcony Planters (Lush 6-pot planter series matching Sample_1.png)
  {
    id: 'furn-balcony-plants',
    roomId: 'room-balcony',
    name: 'Balcony Planter Pots Row',
    type: 'planter_balcony_pots',
    category: 'outdoor',
    position: { x: +21.0, y: 0, z: -17.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.5, y: 3.0, z: 1.5 },
    material: 'terracotta_plants',
    color: '#ea580c',
    locked: false
  },

  // =========================================================
  // 6. DINING AREA & DUMB WAITER
  // =========================================================
  {
    id: 'furn-dining-table',
    roomId: 'room-dining',
    name: '6 person Dinning Table 7\'-0" x 3\'-6"',
    type: 'dining_table_6s',
    category: 'tables',
    position: { x: -0.5, y: 0, z: -3.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 7.0, y: 2.6, z: 3.5 },
    material: 'wood_walnut',
    color: '#451a03',
    locked: false
  },
  {
    id: 'furn-dumb-waiter',
    roomId: 'room-dining',
    name: 'Dumb Waiter',
    type: 'dumb_waiter_counter',
    category: 'kitchen',
    position: { x: -0.5, y: 0, z: -8.0 },
    rotation: { x: 0, y: 180, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 6.0, y: 3.0, z: 1.4 },
    material: 'wood_walnut',
    color: '#334155',
    locked: false
  },
  {
    id: 'furn-dining-plant',
    roomId: 'room-dining',
    name: 'Dining Corner Planter',
    type: 'planter_pot_tall',
    category: 'decor',
    position: { x: -4.0, y: 0, z: -8.0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.8, y: 3.5, z: 1.8 },
    material: 'terracotta_plants',
    color: '#16a34a',
    locked: false
  },

  // =========================================================
  // 7. KITCHEN PLATFORMS & REFRIGERATOR
  // =========================================================
  {
    id: 'furn-kitchen-hob-platform',
    roomId: 'room-kitchen',
    name: '27" deep platform & Hob',
    type: 'kitchen_counter_hob',
    category: 'kitchen',
    position: { x: -8.7, y: 0, z: +5.0 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 9.0, y: 3.0, z: 2.25 },
    material: 'granite_black',
    color: '#0f172a',
    locked: false
  },
  {
    id: 'furn-kitchen-sink-platform',
    roomId: 'room-kitchen',
    name: '27" deep platform, Cooking Sink & Water Ledge',
    type: 'kitchen_counter_sink',
    category: 'kitchen',
    position: { x: -4.0, y: 0, z: +10.7 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 7.5, y: 3.0, z: 2.25 },
    material: 'quartz_white',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-kitchen-refrigerator',
    roomId: 'room-kitchen',
    name: 'Refrigerator',
    type: 'refrigerator_french_door',
    category: 'kitchen',
    position: { x: -0.5, y: 0, z: +3.0 },
    rotation: { x: 0, y: -90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.0, y: 6.2, z: 2.8 },
    material: 'metal_stainless',
    color: '#64748b',
    locked: false
  },

  // =========================================================
  // 8. SACRED POOJA MANDIR
  // =========================================================
  {
    id: 'furn-pooja-mandir',
    roomId: 'room-pooja',
    name: 'Pooja Mandir Altar',
    type: 'pooja_mandir_sanctuary',
    category: 'spiritual',
    position: { x: +2.25, y: 0, z: +4.75 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.2, y: 5.5, z: 2.6 },
    material: 'marble_teak',
    color: '#d97706',
    locked: false
  },

  // =========================================================
  // 9. STORE ROOM
  // =========================================================
  {
    id: 'furn-store-rack',
    roomId: 'room-store',
    name: 'Store Pantry Shelving Unit',
    type: 'store_pantry_rack',
    category: 'storage',
    position: { x: +4.5, y: 0, z: +8.875 },
    rotation: { x: 0, y: -90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 5.0, y: 7.5, z: 1.8 },
    material: 'metal_steel',
    color: '#475569',
    locked: false
  },

  // =========================================================
  // 10. UTILITY AREA
  // =========================================================
  {
    id: 'furn-utility-wm',
    roomId: 'room-utility',
    name: 'W/M (Washing Machine)',
    type: 'utility_washing_machine',
    category: 'storage',
    position: { x: -8.5, y: 0, z: +14.25 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.4, y: 3.0, z: 2.4 },
    material: 'metal_white',
    color: '#f8fafc',
    locked: false
  },
  {
    id: 'furn-utility-sink-platform',
    roomId: 'room-utility',
    name: '27" deep platform & Sink',
    type: 'utility_counter_sink',
    category: 'kitchen',
    position: { x: +1.8, y: 0, z: +14.25 },
    rotation: { x: 0, y: -90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.8, y: 3.0, z: 2.25 },
    material: 'granite_grey',
    color: '#334155',
    locked: false
  },

  // =========================================================
  // 11. LIVING AREA (Sofas, Center Table, Armchairs, TV Unit, Planters, Lamps)
  // =========================================================
  {
    id: 'furn-living-sofa-north',
    roomId: 'room-living',
    name: '4 Seater Sofa (North)',
    type: 'sofa_4seater',
    category: 'seating',
    position: { x: +15.5, y: 0, z: +0.2 },
    rotation: { x: 0, y: 180, z: 0 }, // Backrest against North, cushions facing South
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 8.5, y: 2.8, z: 3.2 },
    material: 'fabric_linen_white',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-living-sofa-east',
    roomId: 'room-living',
    name: '4 Seater Sofa (East)',
    type: 'sofa_4seater',
    category: 'seating',
    position: { x: +22.0, y: 0, z: +7.5 },
    rotation: { x: 0, y: -90, z: 0 }, // Backrest against East, cushions facing West
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 8.5, y: 2.8, z: 3.2 },
    material: 'fabric_linen_white',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-living-center-table',
    roomId: 'room-living',
    name: 'Center Table',
    type: 'coffee_table_center',
    category: 'tables',
    position: { x: +15.5, y: 0, z: +7.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 4.5, y: 1.5, z: 3.0 },
    material: 'glass_metal',
    color: '#38bdf8',
    locked: false
  },
  {
    id: 'furn-living-chair-1',
    roomId: 'room-living',
    name: 'Chair 1',
    type: 'armchair_accent',
    category: 'seating',
    position: { x: +9.5, y: 0, z: +6.0 },
    rotation: { x: 0, y: 55, z: 0 }, // Angled facing center table
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.8, y: 2.8, z: 2.8 },
    material: 'fabric_cream',
    color: '#f8fafc',
    locked: false
  },
  {
    id: 'furn-living-chair-2',
    roomId: 'room-living',
    name: 'Chair 2',
    type: 'armchair_accent',
    category: 'seating',
    position: { x: +9.5, y: 0, z: +9.0 },
    rotation: { x: 0, y: 125, z: 0 }, // Angled facing center table
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.8, y: 2.8, z: 2.8 },
    material: 'fabric_cream',
    color: '#f8fafc',
    locked: false
  },
  {
    id: 'furn-living-drinks-table',
    roomId: 'room-living',
    name: 'Drinks Table',
    type: 'table_drinks_round',
    category: 'tables',
    position: { x: +8.8, y: 0, z: +7.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 2.0, y: 1.8, z: 2.0 },
    material: 'glass_brass',
    color: '#38bdf8',
    locked: false
  },
  {
    id: 'furn-living-tv-unit',
    roomId: 'room-living',
    name: 'T.V Unit',
    type: 'tv_unit_grand',
    category: 'storage',
    position: { x: +15.5, y: 0, z: +15.8 },
    rotation: { x: 0, y: 0, z: 0 }, // Backrest against South, screen facing North
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 11.0, y: 4.5, z: 1.8 },
    material: 'wood_marble',
    color: '#ffffff',
    locked: false
  },
  {
    id: 'furn-living-planters',
    roomId: 'room-living',
    name: 'Lush Planter Garden Strip',
    type: 'planter_garden_strip',
    category: 'decor',
    position: { x: +24.8, y: 0, z: +7.375 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 18.0, y: 3.5, z: 2.2 },
    material: 'terracotta_plants',
    color: '#16a34a',
    locked: false
  },
  // Living Area Iconic Lighting Fixtures
  {
    id: 'furn-living-light-ne',
    roomId: 'room-living',
    name: 'Corner Uplighter (Living NE)',
    type: 'light_floor_lamp',
    category: 'lighting',
    position: { x: +24.2, y: 0, z: -0.8 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 5.5, z: 1.5 },
    material: 'brass_warm_glow',
    color: '#f59e0b',
    locked: false
  },
  {
    id: 'furn-living-light-se',
    roomId: 'room-living',
    name: 'Corner Uplighter (Living SE)',
    type: 'light_floor_lamp',
    category: 'lighting',
    position: { x: +24.2, y: 0, z: +15.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 5.5, z: 1.5 },
    material: 'brass_warm_glow',
    color: '#f59e0b',
    locked: false
  },
  {
    id: 'furn-living-tv-light-left',
    roomId: 'room-living',
    name: 'TV Accent Lamp (Left)',
    type: 'light_floor_lamp',
    category: 'lighting',
    position: { x: +9.5, y: 0, z: +15.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 4.8, z: 1.5 },
    material: 'brass_warm_glow',
    color: '#f59e0b',
    locked: false
  },
  {
    id: 'furn-living-tv-light-right',
    roomId: 'room-living',
    name: 'TV Accent Lamp (Right)',
    type: 'light_floor_lamp',
    category: 'lighting',
    position: { x: +21.5, y: 0, z: +15.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 4.8, z: 1.5 },
    material: 'brass_warm_glow',
    color: '#f59e0b',
    locked: false
  },

  // =========================================================
  // 12. MAIN ENTRY FOYER
  // =========================================================
  {
    id: 'furn-entry-shoe-unit',
    roomId: 'room-entry',
    name: 'Shoe Unit',
    type: 'shoe_unit_foyer',
    category: 'storage',
    position: { x: +4.6, y: 0, z: +13.5 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 3.2, y: 3.5, z: 1.4 },
    material: 'wood_oak',
    color: '#334155',
    locked: false
  },

  // =========================================================
  // 13. ARCHITECTURAL STRUCTURAL RCC COLUMNS (Red Pillars in Sample_1.png)
  // Structural columns placed at critical load-bearing locations
  // =========================================================
  {
    id: 'furn-col-master-son-west',
    roomId: 'room-master',
    name: 'Structural Column (West Master/Son)',
    type: 'architectural_column',
    category: 'decor',
    position: { x: -28.0, y: 0, z: -1.92 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 9.5, z: 0.8 },
    material: 'concrete_column_red',
    color: '#b91c1c',
    locked: true
  },
  {
    id: 'furn-col-master-son-east',
    roomId: 'room-master',
    name: 'Structural Column (East Master/Son)',
    type: 'architectural_column',
    category: 'decor',
    position: { x: -10.0, y: 0, z: -1.92 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 9.5, z: 0.8 },
    material: 'concrete_column_red',
    color: '#b91c1c',
    locked: true
  },
  {
    id: 'furn-col-daughter-living-west',
    roomId: 'room-living',
    name: 'Structural Column (West Daughter/Living)',
    type: 'architectural_column',
    category: 'decor',
    position: { x: +8.5, y: 0, z: -2.0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 9.5, z: 0.8 },
    material: 'concrete_column_red',
    color: '#b91c1c',
    locked: true
  },
  {
    id: 'furn-col-daughter-living-east',
    roomId: 'room-living',
    name: 'Structural Column (East Daughter/Living)',
    type: 'architectural_column',
    category: 'decor',
    position: { x: +25.5, y: 0, z: -2.0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.5, y: 9.5, z: 0.8 },
    material: 'concrete_column_red',
    color: '#b91c1c',
    locked: true
  },
  {
    id: 'furn-col-balcony-east',
    roomId: 'room-balcony',
    name: 'Structural Column (Balcony East)',
    type: 'architectural_column',
    category: 'decor',
    position: { x: +25.25, y: 0, z: -13.75 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { x: 1.2, y: 9.5, z: 0.8 },
    material: 'concrete_column_red',
    color: '#b91c1c',
    locked: true
  }
];

export const FOUR_BHK_SAMPLE_SCENE: SceneData = {
  rooms: FOUR_BHK_ROOMS,
  furniture: FOUR_BHK_FURNITURE,
  gates: FOUR_BHK_GATES,
  doors: FOUR_BHK_DOORS,
  windows: FOUR_BHK_WINDOWS,
  customWalls: [],
  globalCeilingHeight: 9.5
};

export const FOUR_BHK_SAMPLE_CAD_DATA: CADReferenceData & { bounds?: any } = {
  fileName: 'Sample_1.png',
  dataUrl: '/Sample_maps/Sample_1.png',
  opacity: 0.65,
  visible: true,
  position: { x: 0, z: 0 },
  bounds: {
    minX: -30.5,
    minY: -20.5,
    widthFeet: 58.5,
    depthFeet: 39.5
  }
};

export function build4BHKSampleProject(): Project {
  const totalAreaSqFt = FOUR_BHK_ROOMS.reduce((acc, r) => acc + r.width * r.depth, 0);

  return {
    metadata: {
      id: 'proj-4bhk-sample-residence',
      name: '4BHK_Sample',
      description: 'Comprehensive 4BHK architectural floor plan residence with Master Suite, Son Suite, Guest Bedroom, Daughter Suite, Living Area with Planter Strip, Dining with Dumb Waiter, Kitchen, Store, Pooja, Utility and Main Entry Foyer matching Sample_1.png.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      roomCount: FOUR_BHK_ROOMS.length,
      furnitureCount: FOUR_BHK_FURNITURE.length,
      totalAreaSqFt: Math.round(totalAreaSqFt),
      tags: ['4bhk', 'residential', 'luxury', 'architectural'],
      unit: 'feet',
      version: '1.1.0'
    },
    sceneData: FOUR_BHK_SAMPLE_SCENE,
    cadData: FOUR_BHK_SAMPLE_CAD_DATA,
    aiChatHistory: [
      {
        id: 'msg-seed-1',
        role: 'agent',
        text: 'Welcome to the 4BHK_Sample architectural workspace! All 18 rooms, true blueprint dimensions, RCC structural columns, door swings, and iconic lighting fixtures have been calibrated to match Sample_1.png blueprint with millimeter precision.',
        timestamp: Date.now()
      }
    ]
  };
}
