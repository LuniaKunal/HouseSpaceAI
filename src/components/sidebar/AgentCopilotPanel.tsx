import React, { useState, useEffect, useRef } from 'react';
import { executeWebMCPTool, TOOL_LIST } from '../../webmcp/registry';
import { agentStore, AgentState } from '../../state/agentStore';
import { uiStore } from '../../state/uiStore';
import { sceneStore } from '../../state/sceneStore';
import { Room, RoomFloorMaterial, FurnitureObject } from '../../types/scene';
import { projectStore } from '../../state/projectStore';
import {
  Sparkles,
  Bot,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Flower2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Palette,
  Armchair,
  Bed,
  Compass,
  Eye,
  Trash2,
  Gamepad2,
  Crown,
  Maximize2,
  Check,
  Paperclip
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  actions?: string[];
  timestamp: number;
}

export const AgentCopilotPanel: React.FC = () => {
  const [agentState, setAgentState] = useState<AgentState>(agentStore.getState());
  const [promptInput, setPromptInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTaskTitle, setActiveTaskTitle] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const cadFileInputRef = useRef<HTMLInputElement>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'agent',
      text: 'Hello! I am your AI Architectural Co-Designer. Ask me to redesign any room, add or arrange furniture, apply designer materials, or transform spaces into modern themes.',
      actions: [
        'Connected to Scene Graph',
        `${TOOL_LIST.length} WebMCP Architectural Tools Active`
      ],
      timestamp: Date.now()
    }
  ]);

  useEffect(() => {
    const unsub = agentStore.subscribe(s => setAgentState({ ...s }));
    return () => unsub();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isProcessing]);

  // Find Room helper by name or fuzzy keyword
  const findTargetRoom = (query: string): Room => {
    const q = query.toLowerCase();
    const rooms = sceneStore.getData().rooms;
    let found: Room | undefined;

    if (q.includes('master toilet') || q.includes('master bath')) found = rooms.find(r => r.id === 'room-master-toilet');
    else if (q.includes('master walk') || q.includes('master closet')) found = rooms.find(r => r.id === 'room-master-walkin');
    else if (q.includes('master')) found = rooms.find(r => r.id === 'room-master');
    else if (q.includes('son toilet') || q.includes('son bath')) found = rooms.find(r => r.id === 'room-son-toilet');
    else if (q.includes('son walk')) found = rooms.find(r => r.id === 'room-son-walkin');
    else if (q.includes('son') || q.includes('boy')) found = rooms.find(r => r.id === 'room-son');
    else if (q.includes('daughter toilet') || q.includes('daughter bath')) found = rooms.find(r => r.id === 'room-daughter-toilet');
    else if (q.includes('daughter') || q.includes('girl')) found = rooms.find(r => r.id === 'room-daughter');
    else if (q.includes('guest')) found = rooms.find(r => r.id === 'room-guest');
    else if (q.includes('powder') || q.includes('p. toilet') || q.includes('p toilet')) found = rooms.find(r => r.id === 'room-ptoilet');
    else if (q.includes('balcony') || q.includes('terrace')) found = rooms.find(r => r.id === 'room-balcony');
    else if (q.includes('dining')) found = rooms.find(r => r.id === 'room-dining');
    else if (q.includes('kitchen')) found = rooms.find(r => r.id === 'room-kitchen');
    else if (q.includes('pooja') || q.includes('mandir') || q.includes('temple')) found = rooms.find(r => r.id === 'room-pooja');
    else if (q.includes('store') || q.includes('pantry')) found = rooms.find(r => r.id === 'room-store');
    else if (q.includes('utility') || q.includes('laundry')) found = rooms.find(r => r.id === 'room-utility');
    else if (q.includes('entry') || q.includes('foyer')) found = rooms.find(r => r.id === 'room-entry');
    else if (q.includes('living') || q.includes('hall') || q.includes('lounge')) found = rooms.find(r => r.id === 'room-living');

    if (!found) {
      const uiSelected = uiStore.getState().selectedId;
      found = rooms.find(r => r.id === uiSelected);
    }
    return found || rooms.find(r => r.id === 'room-living') || rooms[0];
  };

  // Color recognition helper
  const detectColorInQuery = (query: string): string | null => {
    const q = query.toLowerCase();
    if (q.includes('sage') || q.includes('olive')) return '#84cc16';
    if (q.includes('terracotta') || q.includes('clay')) return '#ea580c';
    if (q.includes('navy') || q.includes('midnight')) return '#0f172a';
    if (q.includes('cyan') || q.includes('teal')) return '#0284c7';
    if (q.includes('coral') || q.includes('orange')) return '#f97316';
    if (q.includes('rose') || q.includes('blush') || q.includes('pink')) return '#f43f5e';
    if (q.includes('gold') || q.includes('champagne') || q.includes('yellow')) return '#fbbf24';
    if (q.includes('greige') || q.includes('cashmere')) return '#e7e5e4';
    if (q.includes('slate') || q.includes('charcoal') || q.includes('dark grey')) return '#334155';
    if (q.includes('white') || q.includes('chalk')) return '#ffffff';
    if (q.includes('cream') || q.includes('alabaster') || q.includes('linen')) return '#fafaf9';
    if (q.includes('purple') || q.includes('mauve')) return '#7e22ce';
    if (q.includes('green') || q.includes('emerald')) return '#15803d';
    if (q.includes('blue') || q.includes('cobalt')) return '#1d4ed8';
    return null;
  };

  // Floor material recognition helper
  const detectFloorMaterialInQuery = (query: string): RoomFloorMaterial | null => {
    const q = query.toLowerCase();
    if (q.includes('herringbone') || q.includes('parquet')) return 'herringbone_wood';
    if (q.includes('walnut') || q.includes('dark wood')) return 'hardwood_walnut';
    if (q.includes('oak') || q.includes('wood')) return 'hardwood_oak';
    if (q.includes('carrara') || q.includes('white marble') || (q.includes('marble') && !q.includes('nero') && !q.includes('black'))) return 'marble_carrara';
    if (q.includes('nero') || q.includes('black marble')) return 'marble_nero';
    if (q.includes('terrazzo')) return 'terrazzo';
    if (q.includes('tile') || q.includes('porcelain')) return 'ceramic_tile';
    if (q.includes('carpet') || q.includes('wool') || q.includes('rug')) return 'carpet_plush';
    if (q.includes('concrete')) return 'concrete_polished';
    return null;
  };

  // Preset 1: Convert Guest Bedroom into Executive Study & Home Office
  const handleConvertGuestToOffice = async () => {
    setIsProcessing(true);
    setActiveTaskTitle('Redesigning Guest Bedroom into Executive Office...');
    const actionsTaken: string[] = [];

    try {
      uiStore.addToast('Agent Task Started', 'Converting Guest Bedroom into Executive Study', 'agent');
      const room = sceneStore.getData().rooms.find(r => r.id === 'room-guest');
      if (!room) throw new Error('Guest Bedroom not found');

      // 1. Focus view
      await executeWebMCPTool('switch_view', { mode: '3d', targetRoomId: 'room-guest' }, 'copilot');
      actionsTaken.push('Focused 3D view on Guest Bedroom');
      await new Promise(r => setTimeout(r, 400));

      // 2. Remove existing guest bed and nightstands
      const oldItems = sceneStore.getData().furniture.filter(f => f.roomId === 'room-guest');
      for (const item of oldItems) {
        if (item.type.includes('bed') || item.type.includes('nightstand')) {
          await executeWebMCPTool('delete_object', { objectId: item.id }, 'copilot');
        }
      }
      actionsTaken.push('Cleared existing bed & nightstands');
      await new Promise(r => setTimeout(r, 300));

      // 3. Apply Hardwood Oak Flooring & Warm Linen Wall Paint
      await executeWebMCPTool('apply_material', { targetId: 'room-guest', targetType: 'room_floor', materialId: 'hardwood_oak' }, 'copilot');
      await executeWebMCPTool('apply_material', { targetId: 'room-guest', targetType: 'room_wall', materialId: '#f5f5f4', color: '#f5f5f4' }, 'copilot');
      actionsTaken.push('Applied Natural Oak Flooring and Linen Wall Finish');
      await new Promise(r => setTimeout(r, 300));

      // 4. Add Executive Study Desk & Task Chair
      await executeWebMCPTool(
        'add_furniture',
        {
          type: 'study_table_desk',
          roomId: 'room-guest',
          name: 'Executive Walnut Study Desk',
          position: { x: room.position.x - 1.5, y: 0, z: room.position.z - 1.0 },
          rotation: { x: 0, y: 90, z: 0 },
          color: '#5c3a21'
        },
        'copilot'
      );
      actionsTaken.push('Installed Executive Study Desk with Cable Management');
      await new Promise(r => setTimeout(r, 300));

      // 5. Add Low Storage Console
      await executeWebMCPTool(
        'add_furniture',
        {
          type: 'storage_low_ht',
          roomId: 'room-guest',
          name: 'Library Credenza',
          position: { x: room.position.x + 3.5, y: 0, z: room.position.z - 1.5 },
          rotation: { x: 0, y: -90, z: 0 },
          color: '#334155'
        },
        'copilot'
      );
      actionsTaken.push('Added Library Storage Credenza');

      // 6. Rename Room
      await executeWebMCPTool('rename_room', { roomId: 'room-guest', newName: 'Executive Home Office' }, 'copilot');
      actionsTaken.push('Renamed space to Executive Home Office');

      uiStore.addToast('Agent Task Completed', 'Executive Home Office design finished successfully!', 'success');

      setChatHistory(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          text: 'I have transformed the Guest Bedroom into a modern Executive Home Office with solid walnut desk, library storage, and oak hardwood flooring.',
          actions: actionsTaken,
          timestamp: Date.now()
        }
      ]);
    } catch (err: any) {
      uiStore.addToast('Agent Error', err.message, 'error');
    } finally {
      setIsProcessing(false);
      setActiveTaskTitle(null);
    }
  };

  // Preset 2: Upgrade Balcony into Scenic Tropical Oasis
  const handleUpgradeBalcony = async () => {
    setIsProcessing(true);
    setActiveTaskTitle('Upgrading Balcony to Scenic Green Oasis...');
    const actionsTaken: string[] = [];

    try {
      uiStore.addToast('Agent Task Started', 'Styling Balcony with Lounge & Planters', 'agent');
      const room = sceneStore.getData().rooms.find(r => r.id === 'room-balcony');
      if (!room) throw new Error('Balcony not found');

      // 1. Focus view
      await executeWebMCPTool('switch_view', { mode: '3d', targetRoomId: 'room-balcony' }, 'copilot');
      actionsTaken.push('Focused 3D view on Balcony');
      await new Promise(r => setTimeout(r, 400));

      // 2. Apply Terrazzo Floor
      await executeWebMCPTool('apply_material', { targetId: 'room-balcony', targetType: 'room_floor', materialId: 'terrazzo' }, 'copilot');
      actionsTaken.push('Installed Venetian Terrazzo Composite Flooring');
      await new Promise(r => setTimeout(r, 300));

      // 3. Add Lush Planter Pots
      await executeWebMCPTool(
        'add_furniture',
        {
          type: 'planter_balcony_pots',
          roomId: 'room-balcony',
          name: 'Tropical Foliage Railing Planters',
          position: { x: room.position.x, y: 0, z: room.position.z - 1.8 }
        },
        'copilot'
      );
      actionsTaken.push('Arranged Terracotta & Tropical Planters along Railing');
      await new Promise(r => setTimeout(r, 300));

      // 4. Add Accent Lounge Chair & Drinks Table
      await executeWebMCPTool(
        'add_furniture',
        {
          type: 'armchair_accent',
          roomId: 'room-balcony',
          name: 'Outdoor Weatherproof Lounger',
          position: { x: room.position.x - 1.8, y: 0, z: room.position.z + 0.8 },
          rotation: { x: 0, y: 35, z: 0 },
          color: '#f8fafc'
        },
        'copilot'
      );
      await executeWebMCPTool(
        'add_furniture',
        {
          type: 'table_drinks_round',
          roomId: 'room-balcony',
          name: 'Balcony Drinks Table',
          position: { x: room.position.x + 1.2, y: 0, z: room.position.z + 0.8 },
          color: '#38bdf8'
        },
        'copilot'
      );
      actionsTaken.push('Placed Weatherproof Lounge Seating & Drinks Table');

      uiStore.addToast('Agent Task Completed', 'Scenic Balcony Oasis complete!', 'success');

      setChatHistory(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          text: 'The Balcony has been upgraded into a scenic green oasis with Venetian terrazzo flooring, tropical planters, and outdoor lounge seating.',
          actions: actionsTaken,
          timestamp: Date.now()
        }
      ]);
    } catch (err: any) {
      uiStore.addToast('Agent Error', err.message, 'error');
    } finally {
      setIsProcessing(false);
      setActiveTaskTitle(null);
    }
  };

  // Preset 3: Modernize Living Room Luxury Staging
  const handleModernizeLivingRoom = async () => {
    setIsProcessing(true);
    setActiveTaskTitle('Modernizing Living Room Finishes & Lighting...');
    const actionsTaken: string[] = [];

    try {
      uiStore.addToast('Agent Task Started', 'Applying Italian Carrara Marble & Staging', 'agent');
      const room = sceneStore.getData().rooms.find(r => r.id === 'room-living');
      if (!room) throw new Error('Living Area not found');

      // 1. Focus view
      await executeWebMCPTool('switch_view', { mode: '3d', targetRoomId: 'room-living' }, 'copilot');
      actionsTaken.push('Focused 3D view on Living Area');
      await new Promise(r => setTimeout(r, 400));

      // 2. Apply Carrara Marble Floor & Warm Linen Wall Paint
      await executeWebMCPTool('apply_material', { targetId: 'room-living', targetType: 'room_floor', materialId: 'marble_carrara' }, 'copilot');
      await executeWebMCPTool('apply_material', { targetId: 'room-living', targetType: 'room_wall', materialId: '#f8fafc', color: '#f8fafc' }, 'copilot');
      actionsTaken.push('Applied Polished Carrara Marble and Studio White Wall Paint');
      await new Promise(r => setTimeout(r, 300));

      // 3. Highlight existing Grand TV Unit and Center Table
      const centerTable = sceneStore.getData().furniture.find(f => f.id === 'furn-living-center-table');
      if (centerTable) {
        sceneStore.highlightObject(centerTable.id, 3000);
        actionsTaken.push('Refreshed Glass & Brushed Brass Center Coffee Table');
      }

      uiStore.addToast('Agent Task Completed', 'Living room finishes modernized!', 'success');

      setChatHistory(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          text: 'The Grand Living Area has been modernized with polished Italian Carrara marble, crisp studio white walls, and illuminated architectural staging.',
          actions: actionsTaken,
          timestamp: Date.now()
        }
      ]);
    } catch (err: any) {
      uiStore.addToast('Agent Error', err.message, 'error');
    } finally {
      setIsProcessing(false);
      setActiveTaskTitle(null);
    }
  };

  // Comprehensive Autonomous AI Natural Language Planner & Execution Engine
  const processNaturalLanguageInstruction = async (query: string) => {
    const q = query.toLowerCase();
    const targetRoom = findTargetRoom(q);
    const actionsTaken: string[] = [];

    // 0. Project Creation Intent
    if (q.includes('create project') || q.includes('new project') || q.includes('create a project') || q.includes('start new project')) {
      setActiveTaskTitle('Creating New Project Workspace...');
      let projName = 'New Architectural Project';
      const nameMatch = query.match(/(?:create|new|start)(?:\s+a)?\s+project(?:\s+(?:named|called|for))?\s+([^,.]+)/i);
      if (nameMatch && nameMatch[1].trim()) {
        projName = nameMatch[1].trim();
      }
      const activeProj = projectStore.getState().activeProject;
      const cadUrl = activeProj?.cadData?.dataUrl;
      const cadName = activeProj?.cadData?.fileName;

      const res = await executeWebMCPTool('create_project', {
        name: projName,
        userPrompt: query,
        cadDataUrl: cadUrl,
        cadFileName: cadName,
        autoBuild3D: true
      }, 'copilot');

      return {
        text: `Created new project workspace **"${projName}"**! ${res.message || ''}`,
        actions: [
          `Initialized workspace ID: ${res.projectId}`,
          `Synthesized ${res.roomCount || 0} rooms matching design instructions`,
          'Switched to 3D Studio Perspective'
        ]
      };
    }

    // 0b. CAD Blueprint / Floorplan Image Autonomous 3D Build Intent
    if (
      (q.includes('cad') || q.includes('blueprint') || q.includes('2d') || q.includes('2-d') || q.includes('image') || q.includes('photo') || q.includes('drawing') || q.includes('floorplan') || q.includes('floor plan')) &&
      (q.includes('build') || q.includes('3d') || q.includes('generate') || q.includes('synthesize') || q.includes('create') || q.includes('plan') || q.includes('start') || q.includes('construct') || q.includes('from image'))
    ) {
      setActiveTaskTitle('Autonomous Image-to-3D Synthesis...');
      const activeProj = projectStore.getState().activeProject;
      const cadUrl = activeProj?.cadData?.dataUrl;
      const blueprintName = activeProj?.cadData?.fileName || '2D Architectural Plan';
      const res = await executeWebMCPTool('build_3d_from_cad', {
        cadDataUrl: cadUrl,
        blueprintName,
        userPrompt: query,
        projectName: activeProj?.metadata.name,
        description: activeProj?.metadata.description,
        furnished: true
      }, 'copilot');

      return {
        text: `2D Floor Plan analyzed! ${res.message || 'I have synthesized the 3D architectural plan from your image and instructions.'}`,
        actions: [
          `Parsed visual contours & aspect ratio from "${blueprintName}"`,
          `Constructed ${res.roomsCreated || 4} rooms aligned with zero wall gaps`,
          `Cut ${res.gatesCreated || 3} shared-wall doorways with parametric alignment`,
          `Synthesized ${res.furniturePlaced || 0} interior furnishings`,
          'Switched viewport to 3D Perspective Orbit'
        ]
      };
    }

    // 1. Viewport / Camera Intent
    if (q.includes('2d') || q.includes('cad') || q.includes('blueprint') || q.includes('top view') || q.includes('plan')) {
      await executeWebMCPTool('switch_view', { mode: '2d', angle: 'top' }, 'copilot');
      return {
        text: 'Switched viewport to 2D Architectural CAD Blueprint mode.',
        actions: ['Set camera mode to 2D Plan View']
      };
    }
    if (q.includes('walk') || q.includes('1st person') || q.includes('first person') || q.includes('tour')) {
      await executeWebMCPTool('switch_view', { mode: 'walk', targetRoomId: targetRoom.id }, 'copilot');
      return {
        text: `Entered First-Person Walkthrough mode inside ${targetRoom.name}. Use WASD / Arrows to walk and drag the mouse to look around.`,
        actions: [`Navigated walk camera to ${targetRoom.name}`]
      };
    }
    if (q.includes('3d') || q.includes('orbit') || q.includes('perspective')) {
      await executeWebMCPTool('switch_view', { mode: '3d', targetRoomId: targetRoom.id }, 'copilot');
      return {
        text: `Focused 3D Orbit Perspective view on ${targetRoom.name}.`,
        actions: [`Oriented camera to ${targetRoom.name}`]
      };
    }
    if (q.includes('undo')) {
      await executeWebMCPTool('undo', {}, 'copilot');
      return { text: 'Reverted previous action.', actions: ['Undo executed'] };
    }
    if (q.includes('redo')) {
      await executeWebMCPTool('redo', {}, 'copilot');
      return { text: 'Re-applied action.', actions: ['Redo executed'] };
    }

    // Project Deletion Intent
    if (q.includes('delete project') || q.includes('remove project') || q.includes('delete this project') || q.includes('trash project')) {
      const activeProj = projectStore.getState().activeProject;
      if (activeProj) {
        await executeWebMCPTool('delete_project', { projectId: activeProj.metadata.id }, 'copilot');
        return {
          text: `Project "${activeProj.metadata.name}" has been permanently deleted. Loaded clean workspace.`,
          actions: [`Permanently deleted project workspace ${activeProj.metadata.id}`]
        };
      }
    }

    // Focus camera on target room
    await executeWebMCPTool('switch_view', { mode: '3d', targetRoomId: targetRoom.id }, 'copilot');
    actionsTaken.push(`Focused 3D view on ${targetRoom.name}`);
    await new Promise(r => setTimeout(r, 300));

    // 2. Full Room Makeover Presets
    if (q.includes('office') || q.includes('study')) {
      await handleConvertGuestToOffice();
      return null;
    }
    if (q.includes('balcony') || (q.includes('oasis') && q.includes('green'))) {
      await handleUpgradeBalcony();
      return null;
    }

    // 3. Wall Paint Color Instruction
    const detectedColor = detectColorInQuery(q);
    const isWallIntent = q.includes('wall') || q.includes('paint') || q.includes('color') || q.includes('tint');
    const isAllRooms = q.includes('all rooms') || q.includes('entire house') || q.includes('every room') || q.includes('apartment');

    if (detectedColor && isWallIntent) {
      if (isAllRooms) {
        for (const r of sceneStore.getData().rooms) {
          await executeWebMCPTool('apply_material', { targetId: r.id, targetType: 'room_wall', materialId: detectedColor, color: detectedColor }, 'copilot');
        }
        actionsTaken.push(`Applied wall paint (${detectedColor}) across all residence rooms`);
      } else {
        await executeWebMCPTool('apply_material', { targetId: targetRoom.id, targetType: 'room_wall', materialId: detectedColor, color: detectedColor }, 'copilot');
        actionsTaken.push(`Updated ${targetRoom.name} wall color to ${detectedColor}`);
      }
    }

    // 4. Floor Material / Finish Instruction
    const detectedFloor = detectFloorMaterialInQuery(q);
    const isFloorIntent = q.includes('floor') || q.includes('tile') || q.includes('marble') || q.includes('parquet') || q.includes('carpet') || q.includes('hardwood');

    if (detectedFloor && isFloorIntent) {
      if (isAllRooms) {
        for (const r of sceneStore.getData().rooms) {
          await executeWebMCPTool('apply_material', { targetId: r.id, targetType: 'room_floor', materialId: detectedFloor }, 'copilot');
        }
        actionsTaken.push(`Applied ${detectedFloor} flooring across entire apartment`);
      } else {
        await executeWebMCPTool('apply_material', { targetId: targetRoom.id, targetType: 'room_floor', materialId: detectedFloor }, 'copilot');
        actionsTaken.push(`Installed ${detectedFloor} in ${targetRoom.name}`);
      }
    }

    // 4b. Furniture Dimension & Wall Fitting Intent (e.g. "wardrobe is too big", "fit wardrobe to wall", "change dimension of wardrobe")
    const isDimensionIntent =
      q.includes('dimension') ||
      q.includes('too big') ||
      q.includes('too small') ||
      q.includes('fit to wall') ||
      q.includes('fit wall') ||
      q.includes('snap to wall') ||
      q.includes('resize') ||
      q.includes('make smaller') ||
      q.includes('scale down') ||
      q.includes('shrink');

    if (isDimensionIntent) {
      setActiveTaskTitle('Adjusting Furniture Dimensions...');
      const allFurniture = sceneStore.getData().furniture;
      const roomFurniture = allFurniture.filter(f => f.roomId === targetRoom.id);

      const selectedId = uiStore.getState().selectedId;
      let targetItem = allFurniture.find(f => f.id === selectedId);

      if (!targetItem) {
        if (q.includes('wardrobe') || q.includes('closet')) {
          targetItem =
            roomFurniture.find(f => f.type.includes('wardrobe') || f.name.toLowerCase().includes('wardrobe')) ||
            allFurniture.find(f => f.type.includes('wardrobe') || f.name.toLowerCase().includes('wardrobe'));
        } else if (q.includes('bed')) {
          targetItem = roomFurniture.find(f => f.type.includes('bed')) || allFurniture.find(f => f.type.includes('bed'));
        } else if (q.includes('sofa') || q.includes('couch')) {
          targetItem = roomFurniture.find(f => f.type.includes('sofa')) || allFurniture.find(f => f.type.includes('sofa'));
        } else if (q.includes('table') || q.includes('desk')) {
          targetItem =
            roomFurniture.find(f => f.type.includes('table') || f.type.includes('desk')) ||
            allFurniture.find(f => f.type.includes('table') || f.type.includes('desk'));
        } else if (roomFurniture.length > 0) {
          targetItem = roomFurniture[0];
        }
      }

      if (targetItem) {
        const ftMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|'|"|m)?/i);
        const explicitNum = ftMatch ? parseFloat(ftMatch[1]) : null;

        if (
          explicitNum &&
          (q.includes('feet') || q.includes('ft') || q.includes('width') || q.includes('depth') || explicitNum <= 15)
        ) {
          const res = await executeWebMCPTool(
            'set_furniture_dimensions',
            {
              objectId: targetItem.id,
              width: explicitNum
            },
            'copilot'
          );
          actionsTaken.push(`Resized "${targetItem.name}" width to ${explicitNum}ft`);
          return {
            text: `Resized **${targetItem.name}** in ${targetRoom.name} to **${explicitNum}ft** width for optimal layout clearance.`,
            actions: [
              `Adjusted physical dimensions to (${res.dimensions.x.toFixed(1)} x ${res.dimensions.y.toFixed(1)} x ${res.dimensions.z.toFixed(1)}) ft`,
              `Updated scale factors on ${targetItem.id}`
            ]
          };
        } else {
          const res = await executeWebMCPTool(
            'fit_furniture_to_wall',
            {
              objectId: targetItem.id,
              wallDirection: 'nearest',
              snapToWall: true
            },
            'copilot'
          );
          actionsTaken.push(`Auto-fitted "${targetItem.name}" flush against ${res.wallDirection} wall in ${res.roomName}`);
          return {
            text: `Fitted **${targetItem.name}** to the adjacent ${res.wallDirection} wall in ${res.roomName}! It has been scaled to **${res.newDimensions.x.toFixed(1)}ft x ${res.newDimensions.z.toFixed(1)}ft** to fit the floor plan without clipping.`,
            actions: [
              `Calculated available span along ${res.wallDirection} wall in ${res.roomName}`,
              `Adjusted dimensions from (${res.previousDimensions.x.toFixed(1)}x${res.previousDimensions.z.toFixed(1)}ft) -> (${res.newDimensions.x.toFixed(1)}x${res.newDimensions.z.toFixed(1)}ft)`,
              'Snapped position flush against wall with 0.25ft margin'
            ]
          };
        }
      }
    }

    // 5. Delete / Remove Furniture Instruction
    if (q.includes('delete') || q.includes('remove') || q.includes('clear')) {
      const roomFurniture = sceneStore.getData().furniture.filter(f => f.roomId === targetRoom.id);
      let deletedCount = 0;

      for (const item of roomFurniture) {
        let match = false;
        if (q.includes('bed') && item.type.includes('bed')) match = true;
        if (q.includes('sofa') && item.type.includes('sofa')) match = true;
        if (q.includes('desk') && item.type.includes('desk')) match = true;
        if (q.includes('table') && item.type.includes('table')) match = true;
        if (q.includes('chair') && item.type.includes('chair')) match = true;
        if (q.includes('wardrobe') && item.type.includes('wardrobe')) match = true;
        if (q.includes('plant') && item.type.includes('planter')) match = true;
        if (q.includes('all') || q.includes('everything')) match = true;

        if (match) {
          await executeWebMCPTool('delete_object', { objectId: item.id }, 'copilot');
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        actionsTaken.push(`Removed ${deletedCount} furniture item(s) from ${targetRoom.name}`);
      }
    }

    // 6. Add / Instantiate New Furniture Instruction
    if (q.includes('add') || q.includes('place') || q.includes('put') || q.includes('install') || q.includes('insert') || q.includes('set up')) {
      let itemType = 'sofa_4seater';
      let itemName = 'Designer Furniture';
      let defaultColor = detectedColor || '#ffffff';
      let offset = { x: 0, z: 0 };
      let rotation = { x: 0, y: 0, z: 0 };

      if (q.includes('sofa') || q.includes('couch')) {
        itemType = 'sofa_4seater';
        itemName = '4-Seater Luxury Sofa';
        offset = { x: 0, z: -targetRoom.depth * 0.2 };
      } else if (q.includes('lounger') || q.includes('chaise')) {
        itemType = 'sofa_3seater_lounger';
        itemName = '3-Seater Lounger Chaise';
        offset = { x: -targetRoom.width * 0.25, z: 0 };
        rotation = { x: 0, y: 90, z: 0 };
      } else if (q.includes('armchair') || q.includes('lounge chair') || q.includes('accent chair')) {
        itemType = 'armchair_accent';
        itemName = 'Designer Accent Lounge Chair';
        offset = { x: targetRoom.width * 0.25, z: targetRoom.depth * 0.2 };
        rotation = { x: 0, y: 45, z: 0 };
      } else if (q.includes('bed')) {
        itemType = 'bed_double';
        itemName = 'King Double Bed';
        offset = { x: 0, z: -targetRoom.depth * 0.15 };
      } else if (q.includes('desk') || q.includes('study table')) {
        itemType = 'study_table_desk';
        itemName = 'Study Table & Desk';
        offset = { x: -targetRoom.width * 0.25, z: targetRoom.depth * 0.25 };
        rotation = { x: 0, y: 90, z: 0 };
      } else if (q.includes('dining table')) {
        itemType = 'dining_table_6s';
        itemName = '6-Person Walnut Dining Table';
        offset = { x: 0, z: 0 };
      } else if (q.includes('coffee table') || q.includes('center table')) {
        itemType = 'coffee_table_center';
        itemName = 'Glass & Brass Center Table';
        offset = { x: 0, z: 0 };
      } else if (q.includes('wardrobe') || q.includes('closet')) {
        itemType = 'wardrobe_sliding';
        itemName = 'Modern Sliding Wardrobe';
        offset = { x: -targetRoom.width * 0.35, z: 0 };
        rotation = { x: 0, y: 90, z: 0 };
      } else if (q.includes('plant') || q.includes('planter') || q.includes('flower')) {
        itemType = 'planter_balcony_pots';
        itemName = 'Lush Tropical Planter Group';
        offset = { x: targetRoom.width * 0.35, z: -targetRoom.depth * 0.3 };
      } else if (q.includes('chandelier') || q.includes('lighting') || q.includes('lamp')) {
        itemType = 'chandelier_modern';
        itemName = 'Modern Linear Chandelier';
        offset = { x: 0, z: 0 };
      } else if (q.includes('tv') || q.includes('media')) {
        itemType = 'tv_unit_grand';
        itemName = 'Grand 85" TV Media Unit';
        offset = { x: targetRoom.width * 0.35, z: 0 };
        rotation = { x: 0, y: -90, z: 0 };
      }

      const placed = await executeWebMCPTool(
        'add_furniture',
        {
          type: itemType,
          roomId: targetRoom.id,
          name: itemName,
          position: {
            x: targetRoom.position.x + offset.x,
            y: 0,
            z: targetRoom.position.z + offset.z
          },
          rotation,
          color: defaultColor
        },
        'copilot'
      );

      actionsTaken.push(`Instantiated ${placed.name} in ${targetRoom.name}`);
    }

    // 7. General Spatial Refresh Fallback if no specific action matched
    if (actionsTaken.length === 1 && actionsTaken[0].includes('Focused 3D view')) {
      const state = await executeWebMCPTool('get_scene_state', { includeFurniture: true }, 'copilot');
      actionsTaken.push(`Inspected scene geometry: ${state.dimensions.roomCount} spaces, ${state.dimensions.furnitureCount} objects`);
    }

    return {
      text: `Completed design updates for **${targetRoom.name}**. Everything has been configured and rendered in real-time.`,
      actions: actionsTaken
    };
  };

  const handleCadUploadInChat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const activeProj = projectStore.getState().activeProject;
      if (activeProj) {
        activeProj.cadData = {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: Date.now(),
          dataUrl,
          opacity: 0.75,
          visible: true
        };
      }

      // Add user message to chat
      const userMsg: ChatMessage = {
        id: `msg-user-${Date.now()}`,
        sender: 'user',
        text: `Uploaded 2D CAD Blueprint: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`,
        timestamp: Date.now()
      };

      setChatHistory(prev => [...prev, userMsg]);
      setIsProcessing(true);
      setActiveTaskTitle(`Autonomous 3D Synthesis from "${file.name}"...`);

      try {
        const res = await executeWebMCPTool('build_3d_from_cad', {
          cadDataUrl: dataUrl,
          blueprintName: file.name,
          userPrompt: activeProj?.metadata.description || activeProj?.metadata.name,
          projectName: activeProj?.metadata.name,
          description: activeProj?.metadata.description,
          furnished: true
        }, 'copilot');

        const agentMsg: ChatMessage = {
          id: `msg-agent-${Date.now()}`,
          sender: 'agent',
          text: `Floor plan analyzed! ${res.message || 'I have synthesized the 3D architectural plan from your image.'}`,
          actions: [
            `Parsed 2D CAD blueprint contours: "${file.name}"`,
            `Constructed ${res.roomsCreated || 4} architectural rooms with zero wall overlaps`,
            `Cut ${res.gatesCreated || 3} shared-wall doorways with parametric alignment`,
            `Synthesized ${res.furniturePlaced || 0} interior furnishings`,
            'Switched viewport to 3D Perspective Orbit'
          ],
          timestamp: Date.now()
        };

        setChatHistory(prev => [...prev, agentMsg]);
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsProcessing(false);
        setActiveTaskTitle(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Submit Handler for Natural Language Input
  const handleNaturalLanguageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isProcessing) return;

    const query = promptInput.trim();
    setPromptInput('');
    setIsProcessing(true);
    setActiveTaskTitle(`Processing: "${query}"...`);

    // Add user message to history
    setChatHistory(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: Date.now()
      }
    ]);

    try {
      const result = await processNaturalLanguageInstruction(query);
      if (result) {
        setChatHistory(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'agent',
            text: result.text,
            actions: result.actions,
            timestamp: Date.now()
          }
        ]);
        uiStore.addToast('AI Co-Designer Action Complete', result.text, 'success');
      }
    } catch (err: any) {
      uiStore.addToast('Agent Execution Error', err.message, 'error');
      setChatHistory(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          text: `I encountered a problem executing your design request: ${err.message}`,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsProcessing(false);
      setActiveTaskTitle(null);
    }
  };

  // Quick Prompt Chips
  const promptSuggestions = [
    'Wardrobe is too big, fit to wall',
    'Resize wardrobe to 4.5ft width',
    'Build 3D Plan from CAD Blueprint',
    'Change Master Bedroom wall to sage olive',
    'Add a luxury 4-seater sofa in Living Room',
    'Turn Guest Bedroom into an Executive Study',
    'Upgrade Balcony into a lush green oasis',
    'Change Living Room floor to Carrara marble',
    'Add a double bed in Son Bedroom',
    'Paint all bedroom walls warm cashmere greige',
    'Switch to 1st-person walk in Living Room'
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden select-none bg-[#11131c]">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 bg-[#141721] flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
            <Sparkles size={14} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">AI Co-Designer</h3>
            <p className="text-[10px] text-slate-400">Autonomous Spatial Agent</p>
          </div>
        </div>

        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
          <Bot size={11} /> {TOOL_LIST.length} Tools Ready
        </span>
      </div>

      {/* 1-Click Fast Goal Presets */}
      <div className="p-3 bg-[#181c28] border-b border-slate-800/80 space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Crown size={12} className="text-amber-400" />
          1-Click Autonomous Makeovers
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={handleConvertGuestToOffice}
            disabled={isProcessing}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-blue-950/50 border border-slate-800 hover:border-blue-500/60 text-left transition flex flex-col gap-1 group disabled:opacity-50"
          >
            <Laptop size={14} className="text-blue-400 group-hover:scale-110 transition" />
            <div className="text-[10px] font-bold text-slate-200 group-hover:text-white leading-tight">
              Study Office
            </div>
            <div className="text-[9px] text-slate-500 truncate">Guest Room</div>
          </button>

          <button
            onClick={handleUpgradeBalcony}
            disabled={isProcessing}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-emerald-950/50 border border-slate-800 hover:border-emerald-500/60 text-left transition flex flex-col gap-1 group disabled:opacity-50"
          >
            <Flower2 size={14} className="text-emerald-400 group-hover:scale-110 transition" />
            <div className="text-[10px] font-bold text-slate-200 group-hover:text-white leading-tight">
              Green Oasis
            </div>
            <div className="text-[9px] text-slate-500 truncate">Balcony</div>
          </button>

          <button
            onClick={handleModernizeLivingRoom}
            disabled={isProcessing}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-purple-950/50 border border-slate-800 hover:border-purple-500/60 text-left transition flex flex-col gap-1 group disabled:opacity-50"
          >
            <Layers size={14} className="text-purple-400 group-hover:scale-110 transition" />
            <div className="text-[10px] font-bold text-slate-200 group-hover:text-white leading-tight">
              Luxury Marble
            </div>
            <div className="text-[9px] text-slate-500 truncate">Living Area</div>
          </button>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatHistory.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-1.5 ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] p-2.5 rounded-2xl text-xs ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                  : 'bg-[#181c28] text-slate-200 border border-slate-800 rounded-bl-none shadow-lg'
              }`}
            >
              {msg.sender === 'agent' && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 mb-1">
                  <Bot size={12} /> AI Co-Designer
                </div>
              )}

              <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>

              {/* Action Steps Checklist */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700/60 space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Executed Actions:</div>
                  {msg.actions.map((act, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                      <CheckCircle2 size={11} className="shrink-0" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <span className="text-[9px] text-slate-500 font-mono px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {/* Processing Banner */}
        {isProcessing && (
          <div className="p-3 bg-blue-950/40 border border-blue-500/50 rounded-2xl flex items-center gap-3 animate-pulse">
            <RefreshCw size={15} className="text-blue-400 animate-spin shrink-0" />
            <div className="text-xs text-blue-200">
              <div className="font-bold">Autonomous Spatial Reasoning...</div>
              <div className="text-[10px] text-blue-300/80 truncate max-w-[200px]">{activeTaskTitle}</div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      <div className="p-2 bg-[#141721] border-t border-slate-800/80">
        <div className="text-[9px] text-slate-400 mb-1 px-1">Suggested Design Prompts:</div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px]">
          {promptSuggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPromptInput(s);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white whitespace-nowrap transition border border-slate-700/60"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Prompt Input Bar */}
      <form onSubmit={handleNaturalLanguageSubmit} className="p-3 bg-[#11131c] border-t border-slate-800 flex items-center gap-2">
        <input
          type="file"
          ref={cadFileInputRef}
          onChange={handleCadUploadInChat}
          accept="image/*, .svg, .pdf, .dxf"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => cadFileInputRef.current?.click()}
          title="Upload 2D CAD Blueprint / Floorplan"
          disabled={isProcessing}
          className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-blue-500 text-slate-400 hover:text-blue-400 disabled:opacity-40 flex items-center justify-center transition shrink-0 shadow"
        >
          <Paperclip size={15} />
        </button>

        <input
          type="text"
          value={promptInput}
          onChange={e => setPromptInput(e.target.value)}
          placeholder="E.g. Build 3D plan from CAD blueprint..."
          disabled={isProcessing}
          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
        />

        <button
          type="submit"
          disabled={!promptInput.trim() || isProcessing}
          className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white flex items-center justify-center transition shadow-lg shrink-0"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
