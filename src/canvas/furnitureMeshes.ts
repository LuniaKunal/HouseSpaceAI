import * as THREE from 'three';
import { FurnitureObject, FT_TO_M } from '../types/scene';

/**
 * Creates rich, multi-part procedural 3D meshes for every furniture catalog item & architectural fixture.
 */
export function createFurnitureMeshGroup(item: FurnitureObject): THREE.Group {
  const group = new THREE.Group();
  group.name = `Furniture_${item.id}`;

  const dimX = item.dimensions.x * item.scale.x * FT_TO_M;
  const dimY = item.dimensions.y * item.scale.y * FT_TO_M;
  const dimZ = item.dimensions.z * item.scale.z * FT_TO_M;

  const hexColor = item.color ? parseInt(item.color.replace('#', '0x'), 16) : 0x475569;

  // Base materials
  const mainMat = new THREE.MeshStandardMaterial({
    color: hexColor,
    roughness: 0.55,
    metalness: 0.1
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a21,
    roughness: 0.45,
    metalness: 0.05
  });

  const lightWoodMat = new THREE.MeshStandardMaterial({
    color: 0xb48b57,
    roughness: 0.5,
    metalness: 0.05
  });

  const cushionMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hexColor).clone().offsetHSL(0, -0.05, 0.1),
    roughness: 0.8
  });

  const whiteFabricMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.85,
    metalness: 0.02
  });

  const marbleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.18,
    metalness: 0.08
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.3,
    metalness: 0.85
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.95
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.4,
    roughness: 0.08,
    transmission: 0.85
  });

  const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.2 });
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
  const plantMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
  const darkPlantMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.65 });
  const potMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.7 });
  const goldAltarMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.9 });

  switch (item.type) {
    // ----------------------------------------------------
    // 1. SOFAS & SEATING
    // ----------------------------------------------------
    case 'sofa_4seater': {
      // 4-Seater Luxury Sofa Base
      const base = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.98, dimY * 0.42, dimZ * 0.85), whiteFabricMat);
      base.position.set(0, dimY * 0.21, 0);
      base.castShadow = true;
      group.add(base);

      // Backrest
      const back = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.98, dimY * 0.58, dimZ * 0.22), whiteFabricMat);
      back.position.set(0, dimY * 0.71, -dimZ * 0.35);
      back.castShadow = true;
      group.add(back);

      // Armrests
      const armL = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.08, dimY * 0.48, dimZ * 0.85), whiteFabricMat);
      armL.position.set(-dimX * 0.45, dimY * 0.48, 0);
      armL.castShadow = true;
      group.add(armL);
      const armR = armL.clone();
      armR.position.set(dimX * 0.45, dimY * 0.48, 0);
      group.add(armR);

      // 4 Individual Seat Cushions
      const cW = (dimX * 0.8) / 4;
      for (let i = 0; i < 4; i++) {
        const cX = -dimX * 0.3 + i * (dimX * 0.2);
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(cW * 0.95, dimY * 0.14, dimZ * 0.6), whiteFabricMat);
        cushion.position.set(cX, dimY * 0.48, dimZ * 0.05);
        cushion.castShadow = true;
        group.add(cushion);

        // Accent throw pillow
        if (i === 0 || i === 3) {
          const pillow = new THREE.Mesh(new THREE.BoxGeometry(cW * 0.8, dimY * 0.28, dimZ * 0.15), mainMat);
          pillow.position.set(cX, dimY * 0.65, -dimZ * 0.2);
          pillow.rotation.x = -0.15;
          group.add(pillow);
        }
      }

      // Wooden Plinth Base
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.96, 0.04, dimZ * 0.8), woodMat);
      plinth.position.set(0, 0.02, 0);
      group.add(plinth);
      break;
    }

    case 'sofa_3seater_lounger': {
      // 3-Seater Cyan Lounger
      const base = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.95, dimY * 0.42, dimZ * 0.9), cushionMat);
      base.position.set(0, dimY * 0.21, 0);
      base.castShadow = true;
      group.add(base);

      // Backrest
      const back = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.22, dimY * 0.58, dimZ * 0.9), cushionMat);
      back.position.set(-dimX * 0.38, dimY * 0.7, 0);
      back.castShadow = true;
      group.add(back);

      // Side armrest
      const arm = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.9, dimY * 0.48, dimZ * 0.1), cushionMat);
      arm.position.set(0, dimY * 0.45, dimZ * 0.42);
      group.add(arm);

      // Cushions
      for (const cz of [-0.3, 0.3]) {
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.2, dimY * 0.25, dimZ * 0.3), mainMat);
        pillow.position.set(-dimX * 0.2, dimY * 0.6, dimZ * cz);
        pillow.rotation.y = 0.2;
        group.add(pillow);
      }
      break;
    }

    case 'armchair_accent': {
      // Modern accent chair
      const seat = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.85, dimY * 0.35, dimZ * 0.85), cushionMat);
      seat.position.set(0, dimY * 0.32, 0);
      seat.castShadow = true;
      group.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.85, dimY * 0.58, dimZ * 0.18), cushionMat);
      back.position.set(0, dimY * 0.68, -dimZ * 0.32);
      back.rotation.x = 0.12;
      back.castShadow = true;
      group.add(back);

      // Angled brass frame legs
      for (const lx of [-0.38, 0.38]) {
        for (const lz of [-0.35, 0.35]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, dimY * 0.35), brassMat);
          leg.position.set(dimX * lx, dimY * 0.16, dimZ * lz);
          leg.rotation.z = lx > 0 ? -0.1 : 0.1;
          group.add(leg);
        }
      }
      break;
    }

    // ----------------------------------------------------
    // 2. TABLES & SURFACES
    // ----------------------------------------------------
    case 'coffee_table_center': {
      // Center Glass & Brass Coffee Table
      const glassTop = new THREE.Mesh(new THREE.BoxGeometry(dimX, 0.03, dimZ), glassMat);
      glassTop.position.set(0, dimY * 0.95, 0);
      glassTop.castShadow = true;
      group.add(glassTop);

      const bottomShelf = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.9, 0.02, dimZ * 0.9), marbleMat);
      bottomShelf.position.set(0, dimY * 0.25, 0);
      group.add(bottomShelf);

      // Brass geometric frame
      const frameGeo = new THREE.BoxGeometry(0.025, dimY * 0.9, 0.025);
      for (const fx of [-0.45, 0.45]) {
        for (const fz of [-0.45, 0.45]) {
          const leg = new THREE.Mesh(frameGeo, brassMat);
          leg.position.set(dimX * fx, dimY * 0.48, dimZ * fz);
          group.add(leg);
        }
      }
      break;
    }

    case 'table_drinks_round': {
      // Round drinks side table
      const roundTop = new THREE.Mesh(new THREE.CylinderGeometry(dimX * 0.45, dimX * 0.45, 0.03, 24), marbleMat);
      roundTop.position.set(0, dimY * 0.95, 0);
      group.add(roundTop);

      const centralStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, dimY * 0.9, 16), brassMat);
      centralStem.position.set(0, dimY * 0.48, 0);
      group.add(centralStem);

      const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(dimX * 0.35, dimX * 0.35, 0.02, 24), brassMat);
      baseDisc.position.set(0, 0.01, 0);
      group.add(baseDisc);
      break;
    }

    case 'dining_table_6s': {
      // 6-Person Walnut Dining Table
      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY * 0.08, dimZ), woodMat);
      tableTop.position.set(0, dimY * 0.95, 0);
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      group.add(tableTop);

      // Tapered legs
      const legGeo = new THREE.BoxGeometry(dimX * 0.05, dimY * 0.92, dimZ * 0.06);
      for (const lx of [-0.43, 0.43]) {
        for (const lz of [-0.4, 0.4]) {
          const leg = new THREE.Mesh(legGeo, woodMat);
          leg.position.set(dimX * lx, dimY * 0.46, dimZ * lz);
          leg.castShadow = true;
          group.add(leg);
        }
      }

      // 6 Surrounding Dining Chairs (3 on top, 3 on bottom)
      for (const side of [-1, 1]) {
        for (let i = -1; i <= 1; i++) {
          const chairGroup = new THREE.Group();
          const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.44), whiteFabricMat);
          seat.position.set(0, dimY * 0.52, 0);
          seat.castShadow = true;
          chairGroup.add(seat);

          const back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.04), woodMat);
          back.position.set(0, dimY * 0.72, side * -0.2);
          back.castShadow = true;
          chairGroup.add(back);

          chairGroup.position.set(i * dimX * 0.32, 0, side * (dimZ * 0.68));
          chairGroup.rotation.y = side === 1 ? Math.PI : 0;
          group.add(chairGroup);
        }
      }
      break;
    }

    // ----------------------------------------------------
    // 3. BEDROOMS & BEDS
    // ----------------------------------------------------
    case 'bed_double':
    case 'bed_guest_double': {
      // Double Bed Base Platform
      const bedBase = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.96, dimY * 0.28, dimZ * 0.96), woodMat);
      bedBase.position.set(0, dimY * 0.14, 0);
      bedBase.castShadow = true;
      group.add(bedBase);

      // Mattress
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.92, dimY * 0.25, dimZ * 0.92), whiteFabricMat);
      mattress.position.set(0, dimY * 0.4, 0);
      mattress.castShadow = true;
      group.add(mattress);

      // Folded Luxury Duvet / Coverlet
      const duvet = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.94, dimY * 0.1, dimZ * 0.62), cushionMat);
      duvet.position.set(0, dimY * 0.52, dimZ * 0.14);
      group.add(duvet);

      // Pillows
      for (const px of [-0.25, 0.25]) {
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.35, dimY * 0.14, dimZ * 0.22), whiteFabricMat);
        pillow.position.set(dimX * px, dimY * 0.56, -dimZ * 0.3);
        pillow.rotation.x = 0.2;
        group.add(pillow);
      }

      // Upholstered Headboard
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY, dimZ * 0.12), mainMat);
      headboard.position.set(0, dimY * 0.5, -dimZ * 0.45);
      headboard.castShadow = true;
      group.add(headboard);
      break;
    }

    case 'nightstand_modern': {
      // Nightstand Side Table
      const box = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY * 0.8, dimZ), woodMat);
      box.position.set(0, dimY * 0.4, 0);
      box.castShadow = true;
      group.add(box);

      // Brass drawer handle
      const handle = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.3, 0.02, 0.02), brassMat);
      handle.position.set(0, dimY * 0.5, dimZ * 0.51);
      group.add(handle);

      // Table lamp on top
      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.03, 16), brassMat);
      lampBase.position.set(0, dimY * 0.82, 0);
      group.add(lampBase);

      const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 12), brassMat);
      lampStem.position.set(0, dimY * 0.95, 0);
      group.add(lampStem);

      const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.18, 16), whiteFabricMat);
      lampShade.position.set(0, dimY * 1.1, 0);
      group.add(lampShade);
      break;
    }

    case 'wardrobe_sliding': {
      // Full Height Wardrobe Closet
      const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY, dimZ), darkMat);
      wardrobe.position.set(0, dimY * 0.5, 0);
      wardrobe.castShadow = true;
      group.add(wardrobe);

      // Sliding door tracks & panels
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.1 });
      for (const px of [-0.25, 0.25]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.48, dimY * 0.94, 0.02), panelMat);
        panel.position.set(dimX * px, dimY * 0.5, dimZ * 0.51);
        group.add(panel);

        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, dimY * 0.4, 0.03), brassMat);
        handle.position.set(dimX * (px + (px < 0 ? 0.2 : -0.2)), dimY * 0.5, dimZ * 0.53);
        group.add(handle);
      }
      break;
    }

    case 'consol_low_ht': {
      // Low Height Consol & Mirror Dresser
      const consolBox = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY * 0.75, dimZ), marbleMat);
      consolBox.position.set(0, dimY * 0.38, 0);
      consolBox.castShadow = true;
      group.add(consolBox);

      // Wall Mirror above console
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.85, dimY * 1.1, 0.03), glassMat);
      mirror.position.set(0, dimY * 1.35, -dimZ * 0.45);
      group.add(mirror);

      const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.88, dimY * 1.13, 0.02), brassMat);
      mirrorFrame.position.set(0, dimY * 1.35, -dimZ * 0.46);
      group.add(mirrorFrame);
      break;
    }

    case 'study_table_desk': {
      // 72" x 21" Study Desk
      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(dimX, 0.04, dimZ), lightWoodMat);
      deskTop.position.set(0, dimY * 0.95, 0);
      deskTop.castShadow = true;
      group.add(deskTop);

      // Metal Frame Legs
      for (const lx of [-0.45, 0.45]) {
        const sideFrame = new THREE.Mesh(new THREE.BoxGeometry(0.03, dimY * 0.94, dimZ * 0.9), darkMat);
        sideFrame.position.set(dimX * lx, dimY * 0.47, 0);
        group.add(sideFrame);
      }

      // Laptop / Monitor on desk
      const monitor = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.3, dimY * 0.4, 0.02), screenMat);
      monitor.position.set(0, dimY * 1.2, -dimZ * 0.2);
      group.add(monitor);

      // Study Chair
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), darkMat);
      chair.position.set(0, dimY * 0.5, dimZ * 0.4);
      group.add(chair);
      const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.05), darkMat);
      chairBack.position.set(0, dimY * 0.75, dimZ * 0.62);
      group.add(chairBack);
      break;
    }

    case 'storage_low_ht': {
      // Low storage credenza / cabinets
      const credenza = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY, dimZ), woodMat);
      credenza.position.set(0, dimY * 0.5, 0);
      credenza.castShadow = true;
      group.add(credenza);
      break;
    }

    // ----------------------------------------------------
    // 4. KITCHEN, UTILITY & POOJA
    // ----------------------------------------------------
    case 'kitchen_counter_hob': {
      // 27" Deep Platform with 4-Burner Gas Hob
      const counter = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY * 0.88, dimZ), darkMat);
      counter.position.set(0, dimY * 0.44, 0);
      counter.castShadow = true;
      group.add(counter);

      const counterTop = new THREE.Mesh(new THREE.BoxGeometry(dimX * 1.02, 0.05, dimZ * 1.02), marbleMat);
      counterTop.position.set(0, dimY * 0.9, 0);
      counterTop.castShadow = true;
      group.add(counterTop);

      // 4-Burner Glass Hob in center
      const hobPlate = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.4, 0.02, dimZ * 0.6), screenMat);
      hobPlate.position.set(0, dimY * 0.93, 0);
      group.add(hobPlate);

      // 4 Cast iron burner rings
      for (const bx of [-0.1, 0.1]) {
        for (const bz of [-0.15, 0.15]) {
          const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16), brassMat);
          burner.position.set(dimX * bx, dimY * 0.95, dimZ * bz);
          group.add(burner);
        }
      }
      break;
    }

    case 'kitchen_counter_sink': {
      // 27" Deep Counter with Cooking Sink & Water Ledge
      const counter = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY * 0.88, dimZ), darkMat);
      counter.position.set(0, dimY * 0.44, 0);
      counter.castShadow = true;
      group.add(counter);

      const counterTop = new THREE.Mesh(new THREE.BoxGeometry(dimX * 1.02, 0.05, dimZ * 1.02), marbleMat);
      counterTop.position.set(0, dimY * 0.9, 0);
      group.add(counterTop);

      // Stainless Double Sink Basin
      const sink = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.4, 0.15, dimZ * 0.6), chromeMat);
      sink.position.set(-dimX * 0.15, dimY * 0.85, 0);
      group.add(sink);

      // Gooseneck Chrome Faucet
      const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 12), chromeMat);
      faucet.position.set(-dimX * 0.15, dimY * 1.08, -dimZ * 0.25);
      group.add(faucet);

      // Water purifier ledge on right
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.25, 0.45, dimZ * 0.4), darkMat);
      ledge.position.set(dimX * 0.32, dimY * 1.15, -dimZ * 0.25);
      group.add(ledge);
      break;
    }

    case 'refrigerator_french_door': {
      // French Door Stainless Steel Refrigerator
      const fridge = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY, dimZ), chromeMat);
      fridge.position.set(0, dimY * 0.5, 0);
      fridge.castShadow = true;
      group.add(fridge);

      // Double door center seam & vertical handles
      for (const hx of [-0.05, 0.05]) {
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, dimY * 0.4, 8), darkMat);
        handle.position.set(dimX * hx, dimY * 0.55, dimZ * 0.52);
        group.add(handle);
      }
      break;
    }

    case 'pooja_mandir_sanctuary': {
      // Sacred Mandir Shrine
      const altarBase = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY * 0.35, dimZ), marbleMat);
      altarBase.position.set(0, dimY * 0.175, 0);
      altarBase.castShadow = true;
      group.add(altarBase);

      // 4 Brass Pillars
      for (const px of [-0.42, 0.42]) {
        for (const pz of [-0.4, 0.4]) {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, dimY * 0.5, 12), brassMat);
          pillar.position.set(dimX * px, dimY * 0.6, dimZ * pz);
          group.add(pillar);
        }
      }

      // Mandir Ornate Canopy & Gopuram Dome
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(dimX * 1.05, 0.08, dimZ * 1.05), woodMat);
      canopy.position.set(0, dimY * 0.88, 0);
      group.add(canopy);

      const dome = new THREE.Mesh(new THREE.ConeGeometry(dimX * 0.35, dimY * 0.25, 4), brassMat);
      dome.position.set(0, dimY * 1.05, 0);
      dome.rotation.y = Math.PI / 4;
      group.add(dome);

      // Golden Deity Statue in Sanctum
      const idol = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.35, 12), goldAltarMat);
      idol.position.set(0, dimY * 0.52, 0);
      group.add(idol);
      break;
    }

    case 'store_pantry_rack': {
      // Metal wire / wood storage shelving
      const rack = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY, dimZ), darkMat);
      rack.position.set(0, dimY * 0.5, 0);
      rack.castShadow = true;
      group.add(rack);
      break;
    }

    case 'utility_washing_machine': {
      // Front-Load Washing Machine
      const body = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY, dimZ), whiteFabricMat);
      body.position.set(0, dimY * 0.5, 0);
      body.castShadow = true;
      group.add(body);

      // Glass front porthole door
      const door = new THREE.Mesh(new THREE.CylinderGeometry(dimX * 0.32, dimX * 0.32, 0.04, 24), darkMat);
      door.rotation.x = Math.PI / 2;
      door.position.set(0, dimY * 0.45, dimZ * 0.51);
      group.add(door);

      const glass = new THREE.Mesh(new THREE.CylinderGeometry(dimX * 0.25, dimX * 0.25, 0.05, 24), glassMat);
      glass.rotation.x = Math.PI / 2;
      glass.position.set(0, dimY * 0.45, dimZ * 0.52);
      group.add(glass);
      break;
    }

    case 'utility_counter_sink': {
      // 27" Deep Platform & Deep Utility Sink
      const counter = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY * 0.88, dimZ), darkMat);
      counter.position.set(0, dimY * 0.44, 0);
      counter.castShadow = true;
      group.add(counter);

      const sink = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.7, 0.25, dimZ * 0.7), chromeMat);
      sink.position.set(0, dimY * 0.82, 0);
      group.add(sink);
      break;
    }

    case 'shoe_unit_foyer': {
      // Entryway Shoe Unit Console
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY, dimZ), woodMat);
      cabinet.position.set(0, dimY * 0.5, 0);
      cabinet.castShadow = true;
      group.add(cabinet);

      const topLedge = new THREE.Mesh(new THREE.BoxGeometry(dimX * 1.04, 0.03, dimZ * 1.04), marbleMat);
      topLedge.position.set(0, dimY * 1.01, 0);
      group.add(topLedge);
      break;
    }

    case 'dumb_waiter_counter': {
      // Dumb Waiter / Service Buffet Counter
      const buffet = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY, dimZ), darkMat);
      buffet.position.set(0, dimY * 0.5, 0);
      buffet.castShadow = true;
      group.add(buffet);

      const topPlatter = new THREE.Mesh(new THREE.BoxGeometry(dimX * 1.02, 0.04, dimZ * 1.02), marbleMat);
      topPlatter.position.set(0, dimY * 1.02, 0);
      group.add(topPlatter);
      break;
    }

    // ----------------------------------------------------
    // 5. BATHROOM SUITES & FIXTURES
    // ----------------------------------------------------
    case 'bathroom_wc_commode': {
      // Modern Wall-Hung WC Commode
      const bowl = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY * 0.45, dimZ * 0.7), whiteFabricMat);
      bowl.position.set(0, dimY * 0.35, dimZ * 0.1);
      bowl.castShadow = true;
      group.add(bowl);

      const tank = new THREE.Mesh(new THREE.BoxGeometry(dimX * 1.1, dimY * 0.5, dimZ * 0.3), whiteFabricMat);
      tank.position.set(0, dimY * 0.72, -dimZ * 0.35);
      group.add(tank);

      // Dual Flush Plate
      const flush = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.02), chromeMat);
      flush.position.set(0, dimY * 0.85, -dimZ * 0.18);
      group.add(flush);
      break;
    }

    case 'bathroom_vanity_basin':
    case 'vanity_corridor_basin': {
      // Floating Vanity Cabinet & Integrated Sink
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY * 0.5, dimZ), woodMat);
      cabinet.position.set(0, dimY * 0.45, 0);
      cabinet.castShadow = true;
      group.add(cabinet);

      const counterTop = new THREE.Mesh(new THREE.BoxGeometry(dimX * 1.04, 0.06, dimZ * 1.04), marbleMat);
      counterTop.position.set(0, dimY * 0.73, 0);
      group.add(counterTop);

      // Ceramic Washbasin Basin
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(dimX * 0.3, dimX * 0.24, 0.12, 20), whiteFabricMat);
      basin.position.set(0, dimY * 0.82, 0);
      group.add(basin);

      // Chrome Tall Faucet
      const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 12), chromeMat);
      faucet.position.set(0, dimY * 0.95, -dimZ * 0.28);
      group.add(faucet);

      // LED Backlit Mirror
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.85, dimY * 0.85, 0.02), glassMat);
      mirror.position.set(0, dimY * 1.45, -dimZ * 0.45);
      group.add(mirror);
      break;
    }

    case 'bathroom_shower_cubicle': {
      // Glass Shower Cubicle Enclosure
      const tray = new THREE.Mesh(new THREE.BoxGeometry(dimX, 0.04, dimZ), marbleMat);
      tray.position.set(0, 0.02, 0);
      group.add(tray);

      // Glass screens
      const glassWall = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY * 0.95, 0.02), glassMat);
      glassWall.position.set(0, dimY * 0.5, dimZ * 0.48);
      group.add(glassWall);

      // Chrome Shower Column & Rainfall Head
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, dimY * 0.75, 12), chromeMat);
      column.position.set(0, dimY * 0.55, -dimZ * 0.42);
      group.add(column);

      const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), chromeMat);
      showerHead.position.set(0, dimY * 0.92, -dimZ * 0.25);
      group.add(showerHead);
      break;
    }

    // ----------------------------------------------------
    // 6. ENTERTAINMENT & LIVING MEDIA
    // ----------------------------------------------------
    case 'tv_unit_grand': {
      // Grand Living Room TV Unit Console & Wall Panel
      const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY * 0.35, dimZ), darkMat);
      consoleBox.position.set(0, dimY * 0.175, 0);
      consoleBox.castShadow = true;
      group.add(consoleBox);

      // Marble fluted wall backing panel
      const backPanel = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.92, dimY * 0.85, 0.05), marbleMat);
      backPanel.position.set(0, dimY * 0.65, -dimZ * 0.42);
      group.add(backPanel);

      // 85-inch Ultra HD TV
      const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.65, dimY * 0.5, 0.03), darkMat);
      tvFrame.position.set(0, dimY * 0.65, -dimZ * 0.38);
      group.add(tvFrame);

      const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.63, dimY * 0.48, 0.01), screenMat);
      tvScreen.position.set(0, dimY * 0.65, -dimZ * 0.36);
      group.add(tvScreen);
      break;
    }

    case 'tv_console_bedroom': {
      // Bedroom TV console
      const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY * 0.4, dimZ), woodMat);
      consoleBox.position.set(0, dimY * 0.2, 0);
      consoleBox.castShadow = true;
      group.add(consoleBox);

      const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.75, dimY * 0.55, 0.02), screenMat);
      tvScreen.position.set(0, dimY * 0.75, 0);
      group.add(tvScreen);
      break;
    }

    // ----------------------------------------------------
    // 7. LANDSCAPE & GREENERY
    // ----------------------------------------------------
    case 'planter_garden_strip': {
      // Lush Indoor/Outdoor Planter Garden Trough along Right Wall
      const trough = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.98, dimY * 0.25, dimZ * 0.95), darkMat);
      trough.position.set(0, dimY * 0.125, 0);
      trough.castShadow = true;
      group.add(trough);

      // Soil layer
      const soil = new THREE.Mesh(new THREE.BoxGeometry(dimX * 0.95, 0.04, dimZ * 0.9), new THREE.MeshStandardMaterial({ color: 0x271c19, roughness: 0.9 }));
      soil.position.set(0, dimY * 0.24, 0);
      group.add(soil);

      // Dense tropical plants and flowering shrubs
      const plantCount = 12;
      for (let i = 0; i < plantCount; i++) {
        const pX = -dimX * 0.42 + i * (dimX * 0.076);
        const pZ = (i % 2 === 0 ? 1 : -1) * (dimZ * 0.2);
        const scale = 0.8 + (i % 4) * 0.15;

        // Stem & Foliage clusters
        const foliage = new THREE.Mesh(
          new THREE.SphereGeometry(dimZ * 0.32 * scale, 8, 8),
          i % 2 === 0 ? plantMat : darkPlantMat
        );
        foliage.scale.set(1, 1.4, 1);
        foliage.position.set(pX, dimY * (0.45 + (i % 3) * 0.1), pZ);
        foliage.castShadow = true;
        group.add(foliage);

        // Ground accent uplight spot
        if (i % 3 === 0) {
          const uplight = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12), brassMat);
          uplight.position.set(pX, dimY * 0.26, 0);
          group.add(uplight);
        }
      }
      break;
    }

    case 'planter_balcony_pots': {
      // Row of terracotta & glazed planter pots for Balcony
      for (let i = -2; i <= 2; i++) {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, dimY * 0.4, 16), potMat);
        pot.position.set(i * (dimX * 0.2), dimY * 0.2, 0);
        pot.castShadow = true;
        group.add(pot);

        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), plantMat);
        bush.scale.set(1, 1.3, 1);
        bush.position.set(i * (dimX * 0.2), dimY * 0.55, 0);
        bush.castShadow = true;
        group.add(bush);
      }
      break;
    }

    case 'chandelier_modern': {
      // Modern Linear Dining Chandelier
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, dimX * 0.7, 12), brassMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, dimY * 0.5, 0);
      group.add(bar);

      // 4 Glowing Globe Pendants
      for (let i = -1.5; i <= 1.5; i += 1) {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, dimY * 0.4, 8), brassMat);
        cord.position.set(i * (dimX * 0.2), dimY * 0.7, 0);
        group.add(cord);

        const globe = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xfef08a, emissiveIntensity: 0.6, roughness: 0.1 })
        );
        globe.position.set(i * (dimX * 0.2), dimY * 0.45, 0);
        group.add(globe);
      }
      break;
    }

    case 'lamp_floor': {
      // Standing Brass Floor Lamp
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.04, 16), brassMat);
      base.position.set(0, 0.02, 0);
      group.add(base);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, dimY * 0.75, 12), brassMat);
      pole.position.set(0, dimY * 0.38, 0);
      group.add(pole);

      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 0.35, 16),
        new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfef08a, emissiveIntensity: 0.5, roughness: 0.3 })
      );
      shade.position.set(0, dimY * 0.8, 0);
      shade.castShadow = true;
      group.add(shade);
      break;
    }

    default: {
      // High-quality beveled furniture block
      const box = new THREE.Mesh(new THREE.BoxGeometry(dimX, dimY, dimZ), mainMat);
      box.position.set(0, dimY / 2, 0);
      box.castShadow = true;
      box.receiveShadow = true;
      group.add(box);
      break;
    }
  }

  return group;
}
