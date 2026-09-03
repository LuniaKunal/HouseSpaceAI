import { FurnitureCategory, Vector3D } from '../types/scene';

export interface CatalogItem {
  id: string;
  type: string;
  name: string;
  category: FurnitureCategory;
  description: string;
  defaultDimensions: Vector3D; // width, height, depth in feet
  defaultMaterial: string;
  defaultColor: string;
  iconName: string;
  tags: string[];
}

export const CATALOG_ITEMS: CatalogItem[] = [
  // ==========================================
  // SEATING
  // ==========================================
  {
    id: 'cat-sofa-4seater',
    type: 'sofa_4seater',
    name: '4-Seater Luxury Sofa',
    category: 'seating',
    description: 'Grand 4-seater white linen sofa with plush cushions and wood plinth base',
    defaultDimensions: { x: 8.5, y: 2.8, z: 3.2 },
    defaultMaterial: 'fabric_linen_white',
    defaultColor: '#ffffff',
    iconName: 'Armchair',
    tags: ['living', 'sofa', 'seating', 'luxury', '4-seater']
  },
  {
    id: 'cat-sofa-3seater-lounger',
    type: 'sofa_3seater_lounger',
    name: '3-Seater Cyan Lounger',
    category: 'seating',
    description: 'Modern 3-seater lounger with deep chaise seating in vibrant cyan upholstery',
    defaultDimensions: { x: 3.0, y: 2.8, z: 6.5 },
    defaultMaterial: 'velvet_cyan',
    defaultColor: '#38bdf8',
    iconName: 'Armchair',
    tags: ['bedroom', 'son', 'lounger', 'sofa', 'cyan']
  },
  {
    id: 'cat-armchair-accent',
    type: 'armchair_accent',
    name: 'Designer Accent Lounge Chair',
    category: 'seating',
    description: 'Sculptural curved lounge chair with brass tapered legs',
    defaultDimensions: { x: 2.8, y: 2.8, z: 2.8 },
    defaultMaterial: 'fabric_cream',
    defaultColor: '#f8fafc',
    iconName: 'Armchair',
    tags: ['living', 'chair', 'accent', 'lounge']
  },
  {
    id: 'cat-sofa-sectional',
    type: 'sofa_sectional',
    name: 'L-Shape Sectional Sofa',
    category: 'seating',
    description: 'Generous 4-seater modular fabric sectional with chaise',
    defaultDimensions: { x: 9.0, y: 2.8, z: 6.5 },
    defaultMaterial: 'fabric_linen_grey',
    defaultColor: '#4b5563',
    iconName: 'Armchair',
    tags: ['living', 'sofa', 'lounge', 'luxury']
  },

  // ==========================================
  // TABLES
  // ==========================================
  {
    id: 'cat-dining-table-6s',
    type: 'dining_table_6s',
    name: '6 Person Dinning Table (7\'-0" x 3\'-6")',
    category: 'tables',
    description: 'Solid walnut dining table with 6 matching modern chairs',
    defaultDimensions: { x: 7.0, y: 2.6, z: 3.5 },
    defaultMaterial: 'wood_walnut',
    defaultColor: '#451a03',
    iconName: 'UtensilsCrossed',
    tags: ['dining', 'table', 'walnut', '6-person']
  },
  {
    id: 'cat-coffee-table-center',
    type: 'coffee_table_center',
    name: 'Glass & Brass Center Table',
    category: 'tables',
    description: 'Architectural tempered glass coffee table with brushed brass frame and lower marble shelf',
    defaultDimensions: { x: 4.5, y: 1.5, z: 3.0 },
    defaultMaterial: 'glass_metal',
    defaultColor: '#38bdf8',
    iconName: 'Table',
    tags: ['living', 'coffee table', 'center table', 'glass']
  },
  {
    id: 'cat-table-drinks-round',
    type: 'table_drinks_round',
    name: 'Round Drinks Table',
    category: 'tables',
    description: 'Pedestal drinks side table with marble top and brass stem',
    defaultDimensions: { x: 2.0, y: 1.8, z: 2.0 },
    defaultMaterial: 'glass_brass',
    defaultColor: '#38bdf8',
    iconName: 'Circle',
    tags: ['living', 'drinks table', 'side table', 'accent']
  },
  {
    id: 'cat-nightstand-modern',
    type: 'nightstand_modern',
    name: 'Modern Bedside Nightstand',
    category: 'tables',
    description: 'Oak bedside nightstand with brass handle and integrated table lamp',
    defaultDimensions: { x: 1.8, y: 1.8, z: 1.6 },
    defaultMaterial: 'wood_oak',
    defaultColor: '#5c3a21',
    iconName: 'Box',
    tags: ['bedroom', 'nightstand', 'side table']
  },

  // ==========================================
  // BEDROOMS
  // ==========================================
  {
    id: 'cat-bed-double-master',
    type: 'bed_double',
    name: 'Double Bed (6\'-0" x 6\'-6")',
    category: 'bedroom',
    description: 'King double bed with tufted headboard, folded duvet, and soft pillows',
    defaultDimensions: { x: 6.0, y: 3.8, z: 6.5 },
    defaultMaterial: 'fabric_linen_grey',
    defaultColor: '#e2e8f0',
    iconName: 'Bed',
    tags: ['bedroom', 'bed', 'double bed', 'master', 'son', 'daughter']
  },
  {
    id: 'cat-bed-guest-double',
    type: 'bed_guest_double',
    name: 'Guest Double Bed (6\'-0" x 6\'-9")',
    category: 'bedroom',
    description: 'Extended guest suite double bed with upholstered headboard',
    defaultDimensions: { x: 6.75, y: 3.8, z: 6.0 },
    defaultMaterial: 'fabric_linen_grey',
    defaultColor: '#e2e8f0',
    iconName: 'Bed',
    tags: ['bedroom', 'guest', 'bed']
  },

  // ==========================================
  // STORAGE & WARDROBES
  // ==========================================
  {
    id: 'cat-wardrobe-sliding',
    type: 'wardrobe_sliding',
    name: 'Sliding Door Wardrobe',
    category: 'storage',
    description: 'Full-height built-in wardrobe with smooth sliding panels and brass edge trim',
    defaultDimensions: { x: 6.25, y: 8.5, z: 2.0 },
    defaultMaterial: 'wood_charcoal',
    defaultColor: '#334155',
    iconName: 'Archive',
    tags: ['storage', 'wardrobe', 'closet', 'bedroom']
  },
  {
    id: 'cat-consol-low-ht',
    type: 'consol_low_ht',
    name: 'Low Ht Consol & Mirror',
    category: 'storage',
    description: 'Low-height dressing console table (36" x 20") with full-length wall mirror',
    defaultDimensions: { x: 3.0, y: 2.4, z: 1.67 },
    defaultMaterial: 'marble_carrara',
    defaultColor: '#f8fafc',
    iconName: 'LayoutGrid',
    tags: ['storage', 'console', 'dresser', 'mirror', 'walkin']
  },
  {
    id: 'cat-study-table-desk',
    type: 'study_table_desk',
    name: 'Study Table (72" x 21")',
    category: 'office',
    description: 'Executive study work desk with monitor setup and ergonomic chair',
    defaultDimensions: { x: 6.0, y: 2.5, z: 1.75 },
    defaultMaterial: 'wood_oak',
    defaultColor: '#ffffff',
    iconName: 'Laptop',
    tags: ['study', 'office', 'desk', 'son', 'table']
  },
  {
    id: 'cat-storage-low-ht',
    type: 'storage_low_ht',
    name: 'Low Ht Storage Credenza',
    category: 'storage',
    description: 'Low-profile storage unit with dual sliding compartments',
    defaultDimensions: { x: 3.5, y: 2.2, z: 1.75 },
    defaultMaterial: 'wood_oak',
    defaultColor: '#e2e8f0',
    iconName: 'Archive',
    tags: ['storage', 'credenza', 'study']
  },
  {
    id: 'cat-shoe-unit-foyer',
    type: 'shoe_unit_foyer',
    name: 'Main Entry Shoe Unit',
    category: 'storage',
    description: 'Foyer entryway shoe storage cabinet with marble top ledge',
    defaultDimensions: { x: 3.2, y: 3.5, z: 1.4 },
    defaultMaterial: 'wood_oak',
    defaultColor: '#334155',
    iconName: 'Archive',
    tags: ['entry', 'foyer', 'shoe unit', 'storage']
  },
  {
    id: 'cat-dumb-waiter',
    type: 'dumb_waiter_counter',
    name: 'Dumb Waiter Service Ledge',
    category: 'kitchen',
    description: 'Dining buffet service counter ledge with dumb waiter compartment',
    defaultDimensions: { x: 6.0, y: 3.0, z: 1.4 },
    defaultMaterial: 'wood_walnut',
    defaultColor: '#334155',
    iconName: 'Box',
    tags: ['dining', 'kitchen', 'dumb waiter', 'buffet']
  },

  // ==========================================
  // MEDIA & ENTERTAINMENT
  // ==========================================
  {
    id: 'cat-tv-unit-grand',
    type: 'tv_unit_grand',
    name: 'Grand T.V Unit & 85" Screen',
    category: 'storage',
    description: 'Custom fluted marble media wall backing with 85-inch 4K TV and low media credenza',
    defaultDimensions: { x: 11.0, y: 4.5, z: 1.8 },
    defaultMaterial: 'wood_marble',
    defaultColor: '#ffffff',
    iconName: 'Tv',
    tags: ['living', 'tv', 'media', 'entertainment']
  },
  {
    id: 'cat-tv-console-bedroom',
    type: 'tv_console_bedroom',
    name: 'Bedroom T.V Console',
    category: 'storage',
    description: 'Sleek wall-mounted media console with 55-inch TV',
    defaultDimensions: { x: 4.5, y: 3.0, z: 1.2 },
    defaultMaterial: 'wood_oak',
    defaultColor: '#1e293b',
    iconName: 'Tv',
    tags: ['bedroom', 'daughter', 'tv']
  },

  // ==========================================
  // MODULAR KITCHEN & UTILITY
  // ==========================================
  {
    id: 'cat-kitchen-counter-hob',
    type: 'kitchen_counter_hob',
    name: '27" Deep Platform & 4-Burner Hob',
    category: 'kitchen',
    description: '27" deep quartz modular kitchen counter with 4-burner black glass gas hob',
    defaultDimensions: { x: 9.0, y: 3.0, z: 2.25 },
    defaultMaterial: 'granite_black',
    defaultColor: '#0f172a',
    iconName: 'Flame',
    tags: ['kitchen', 'counter', 'hob', 'cooking']
  },
  {
    id: 'cat-kitchen-counter-sink',
    type: 'kitchen_counter_sink',
    name: 'Cooking Sink & Water Ledge',
    category: 'kitchen',
    description: '27" deep quartz counter with double stainless sink, gooseneck faucet and water purifier ledge',
    defaultDimensions: { x: 7.5, y: 3.0, z: 2.25 },
    defaultMaterial: 'quartz_white',
    defaultColor: '#ffffff',
    iconName: 'Droplet',
    tags: ['kitchen', 'sink', 'faucet', 'water ledge']
  },
  {
    id: 'cat-refrigerator-french-door',
    type: 'refrigerator_french_door',
    name: 'French Door Refrigerator',
    category: 'kitchen',
    description: 'Stainless steel multi-door French refrigerator with ice dispenser',
    defaultDimensions: { x: 3.0, y: 6.2, z: 2.8 },
    defaultMaterial: 'metal_stainless',
    defaultColor: '#64748b',
    iconName: 'Box',
    tags: ['kitchen', 'fridge', 'refrigerator', 'appliance']
  },
  {
    id: 'cat-pooja-mandir',
    type: 'pooja_mandir_sanctuary',
    name: 'Sacred Pooja Mandir Altar',
    category: 'spiritual',
    description: 'Ornate marble & teakwood temple altar with glowing golden deity and brass diya lamps',
    defaultDimensions: { x: 2.2, y: 5.5, z: 2.6 },
    defaultMaterial: 'marble_teak',
    defaultColor: '#d97706',
    iconName: 'Sparkles',
    tags: ['pooja', 'mandir', 'spiritual', 'altar', 'sacred']
  },
  {
    id: 'cat-store-pantry-rack',
    type: 'store_pantry_rack',
    name: 'Store Pantry Shelving Unit',
    category: 'storage',
    description: 'Multi-tier steel heavy-duty pantry storage shelving rack',
    defaultDimensions: { x: 5.0, y: 7.5, z: 1.8 },
    defaultMaterial: 'metal_steel',
    defaultColor: '#475569',
    iconName: 'Archive',
    tags: ['store', 'pantry', 'shelving', 'storage']
  },
  {
    id: 'cat-utility-washing-machine',
    type: 'utility_washing_machine',
    name: 'Front-Load Washing Machine (W/M)',
    category: 'storage',
    description: 'Energy-efficient front-load washing machine with glass porthole',
    defaultDimensions: { x: 2.4, y: 3.0, z: 2.4 },
    defaultMaterial: 'metal_white',
    defaultColor: '#f8fafc',
    iconName: 'Box',
    tags: ['utility', 'washing machine', 'appliance', 'laundry']
  },
  {
    id: 'cat-utility-counter-sink',
    type: 'utility_counter_sink',
    name: '27" Deep Platform & Sink (Utility)',
    category: 'kitchen',
    description: 'Heavy duty stone platform counter with deep laundry utility sink',
    defaultDimensions: { x: 3.8, y: 3.0, z: 2.25 },
    defaultMaterial: 'granite_grey',
    defaultColor: '#334155',
    iconName: 'Droplet',
    tags: ['utility', 'sink', 'platform']
  },

  // ==========================================
  // BATHROOM SUITES
  // ==========================================
  {
    id: 'cat-bathroom-wc-commode',
    type: 'bathroom_wc_commode',
    name: 'Wall-Hung WC Commode',
    category: 'bathroom',
    description: 'Sleek wall-hung ceramic toilet commode with dual-flush chrome plate',
    defaultDimensions: { x: 1.6, y: 2.4, z: 2.2 },
    defaultMaterial: 'ceramic_white',
    defaultColor: '#ffffff',
    iconName: 'Box',
    tags: ['toilet', 'bathroom', 'wc', 'commode']
  },
  {
    id: 'cat-bathroom-vanity-basin',
    type: 'bathroom_vanity_basin',
    name: 'Bathroom Vanity Basin & Mirror',
    category: 'bathroom',
    description: 'Floating vanity storage counter with ceramic sink, tall faucet and LED mirror',
    defaultDimensions: { x: 3.2, y: 2.8, z: 1.8 },
    defaultMaterial: 'marble_carrara',
    defaultColor: '#f1f5f9',
    iconName: 'Droplet',
    tags: ['bathroom', 'vanity', 'basin', 'sink', 'mirror']
  },
  {
    id: 'cat-bathroom-shower-cubicle',
    type: 'bathroom_shower_cubicle',
    name: 'Glass Shower Cubicle Enclosure',
    category: 'bathroom',
    description: 'Frameless glass shower enclosure with chrome rainfall shower column',
    defaultDimensions: { x: 3.2, y: 7.5, z: 3.2 },
    defaultMaterial: 'glass_chrome',
    defaultColor: '#cbd5e1',
    iconName: 'Droplet',
    tags: ['bathroom', 'shower', 'glass']
  },

  // ==========================================
  // GREENERY & DECOR
  // ==========================================
  {
    id: 'cat-planter-garden-strip',
    type: 'planter_garden_strip',
    name: 'Lush Planter Garden Strip (Living)',
    category: 'decor',
    description: 'Continuous living green landscape trough with tropical foliage, ferns, and ground uplighting',
    defaultDimensions: { x: 18.0, y: 3.5, z: 2.2 },
    defaultMaterial: 'terracotta_plants',
    defaultColor: '#16a34a',
    iconName: 'Trees',
    tags: ['living', 'plants', 'garden', 'greenery', 'landscape']
  },
  {
    id: 'cat-planter-balcony-pots',
    type: 'planter_balcony_pots',
    name: 'Balcony Planter Pots Trio',
    category: 'outdoor',
    description: 'Row of terracotta balcony planters with lush ornamental plants',
    defaultDimensions: { x: 7.5, y: 2.5, z: 1.2 },
    defaultMaterial: 'terracotta_plants',
    defaultColor: '#15803d',
    iconName: 'Trees',
    tags: ['balcony', 'outdoor', 'planter', 'plants']
  },
  {
    id: 'cat-dining-chandelier',
    type: 'chandelier_modern',
    name: 'Modern Linear Chandelier',
    category: 'lighting',
    description: 'Suspended brass linear fixture with glowing frosted glass globe pendants',
    defaultDimensions: { x: 5.0, y: 2.2, z: 2.0 },
    defaultMaterial: 'glass_brass',
    defaultColor: '#d4af37',
    iconName: 'Sparkles',
    tags: ['lighting', 'dining', 'chandelier', 'pendant']
  },
  {
    id: 'cat-lamp-floor',
    type: 'lamp_floor',
    name: 'Standing Floor Lamp',
    category: 'lighting',
    description: 'Slender architectural brass floor lamp with cylindrical linen diffuser shade',
    defaultDimensions: { x: 1.5, y: 5.2, z: 1.5 },
    defaultMaterial: 'metal_brass',
    defaultColor: '#e2e8f0',
    iconName: 'Sparkles',
    tags: ['lighting', 'lamp', 'floor lamp', 'bedroom', 'living']
  }
];
