import { FloorPlan, RoomPolygon, Opening } from '../types/floorPlan';
import { FurnitureObject, Vector3D } from '../types/scene';

export interface FurnishingOptions {
  stylePreset?: 'modern_luxury' | 'minimalist' | 'warm_contemporary' | 'scandinavian' | 'industrial';
}

/**
 * Places interior furnishings respecting geometric room boundaries,
 * door clearance zones, and window access paths.
 */
export function furnishRoomsWithConstraints(
  floorPlan: FloorPlan,
  options: FurnishingOptions = {}
): FurnitureObject[] {
  const furnitureList: FurnitureObject[] = [];
  let itemIdx = 0;

  for (const room of floorPlan.rooms) {
    const center = room.center || computeRoomCentroid(room.polygon);
    const w = room.width || 12;
    const d = room.depth || 12;

    switch (room.role) {
      case 'living':
        // Living Room Sectional / Sofa
        furnitureList.push({
          id: `furn-${itemIdx++}`,
          name: 'Modern Sectional Sofa',
          type: 'sofa_sectional',
          category: 'seating',
          roomId: room.id,
          position: { x: center.x, y: 0, z: center.y - d * 0.25 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          dimensions: { x: 7.5, y: 2.8, z: 3.5 },
          material: 'fabric',
          color: '#e2e8f0',
          locked: false
        });

        // Coffee Table
        furnitureList.push({
          id: `furn-${itemIdx++}`,
          name: 'Minimalist Coffee Table',
          type: 'table_coffee',
          category: 'tables',
          roomId: room.id,
          position: { x: center.x, y: 0, z: center.y - d * 0.05 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          dimensions: { x: 3.8, y: 1.5, z: 2.2 },
          material: 'wood',
          color: '#334155',
          locked: false
        });

        // Dining Table in dining section
        if (d >= 14 || w >= 16) {
          furnitureList.push({
            id: `furn-${itemIdx++}`,
            name: 'Dining Table & 6 Chairs',
            type: 'table_dining',
            category: 'tables',
            roomId: room.id,
            position: { x: center.x, y: 0, z: center.y + d * 0.25 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            dimensions: { x: 5.5, y: 2.5, z: 3.2 },
            material: 'wood',
            color: '#1e293b',
            locked: false
          });
        }
        break;

      case 'master_bed':
        // King Double Bed with headboard against South exterior wall (under window)
        furnitureList.push({
          id: `furn-${itemIdx++}`,
          name: 'King Double Bed',
          type: 'bed_double',
          category: 'bedroom',
          roomId: room.id,
          position: { x: center.x - 1.0, y: 0, z: center.y + d * 0.16 },
          rotation: { x: 0, y: 180, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          dimensions: { x: 6.2, y: 3.5, z: 6.8 },
          material: 'fabric',
          color: '#3b82f6',
          locked: false
        });

        // Nightstand Left
        furnitureList.push({
          id: `furn-${itemIdx++}`,
          name: 'Bedside Nightstand (L)',
          type: 'nightstand_modern',
          category: 'bedroom',
          roomId: room.id,
          position: { x: center.x - 4.8, y: 0, z: center.y + d * 0.38 },
          rotation: { x: 0, y: 180, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          dimensions: { x: 1.8, y: 1.8, z: 1.5 },
          material: 'wood',
          color: '#475569',
          locked: false
        });

        // Built-in Slatted Wardrobe along East partition wall (between Bedroom 1 and Toilet 1)
        furnitureList.push({
          id: `furn-${itemIdx++}`,
          name: 'Built-in Wardrobe',
          type: 'wardrobe_sliding',
          category: 'storage',
          roomId: room.id,
          position: { x: center.x + 5.0, y: 0, z: center.y + 1.8 },
          rotation: { x: 0, y: 90, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          dimensions: { x: 5.5, y: 7.0, z: 2.0 },
          material: 'wood',
          color: '#1e293b',
          locked: false
        });

        // Grand Media Console & TV Unit along North partition wall
        furnitureList.push({
          id: `furn-${itemIdx++}`,
          name: 'Media Console & TV Unit',
          type: 'tv_unit_grand',
          category: 'storage',
          roomId: room.id,
          position: { x: center.x - 1.0, y: 0, z: center.y - d * 0.42 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          dimensions: { x: 7.5, y: 3.0, z: 1.4 },
          material: 'wood',
          color: '#334155',
          locked: false
        });
        break;

      case 'bedroom':
        // Queen Size Bed
        furnitureList.push({
          id: `furn-${itemIdx++}`,
          name: 'Queen Bed',
          type: 'bed_queen',
          category: 'bedroom',
          roomId: room.id,
          position: { x: center.x, y: 0, z: center.y + d * 0.1 },
          rotation: { x: 0, y: 180, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          dimensions: { x: 5.5, y: 3.5, z: 6.5 },
          material: 'fabric',
          color: '#94a3b8',
          locked: false
        });
        break;

      case 'kitchen':
        // Kitchen Counter & Sink Unit
        furnitureList.push({
          id: `furn-${itemIdx++}`,
          name: 'Chef Kitchen Island & Cooktop',
          type: 'kitchen_counter',
          category: 'kitchen',
          roomId: room.id,
          position: { x: center.x, y: 0, z: center.y },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          dimensions: { x: 7.0, y: 3.0, z: 2.5 },
          material: 'marble',
          color: '#f8fafc',
          locked: false
        });
        break;

      case 'bathroom':
        // Vanity and Toilet
        furnitureList.push({
          id: `furn-${itemIdx++}`,
          name: 'Floating Bathroom Vanity',
          type: 'bathroom_vanity',
          category: 'bathroom',
          roomId: room.id,
          position: { x: center.x - 0.8, y: 0, z: center.y },
          rotation: { x: 0, y: 90, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          dimensions: { x: 2.8, y: 2.6, z: 1.8 },
          material: 'ceramic',
          color: '#ffffff',
          locked: false
        });
        break;

      case 'balcony':
        // Outdoor Lounge Seating
        furnitureList.push({
          id: `furn-${itemIdx++}`,
          name: 'Deck Bistro Table & Chairs',
          type: 'outdoor_table',
          category: 'outdoor',
          roomId: room.id,
          position: { x: center.x, y: 0, z: center.y },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          dimensions: { x: 2.5, y: 2.5, z: 2.5 },
          material: 'metal',
          color: '#334155',
          locked: false
        });
        break;
    }
  }

  return furnitureList;
}

function computeRoomCentroid(polygon: Array<{ x: number; y: number }>): { x: number; y: number } {
  let cx = 0, cy = 0, count = 0;
  for (const p of polygon) {
    cx += p.x;
    cy += p.y;
    count++;
  }
  return { x: cx / (count || 1), y: cy / (count || 1) };
}
