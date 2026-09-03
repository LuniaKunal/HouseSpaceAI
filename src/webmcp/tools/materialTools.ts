import { sceneStore } from '../../state/sceneStore';
import { uiStore } from '../../state/uiStore';
import { ApplyMaterialInput, ChangeTextureInput } from '../../types/webmcp';

export const materialTools = {
  apply_material: {
    name: 'apply_material',
    title: 'Apply Material',
    category: 'Materials' as const,
    description: 'Applies an architectural finish or color swatch to a room floor, wall, or furniture object.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        targetId: { type: 'string', description: 'Room ID or Furniture Object ID' },
        targetType: {
          type: 'string',
          enum: ['room_floor', 'room_wall', 'object'],
          description: 'Type of target element'
        },
        materialId: {
          type: 'string',
          description: 'Material identifier (e.g. hardwood_walnut, marble_carrara, terrazzo, concrete_polished, ceramic_tile, fabric_velvet_navy, leather_cognac, etc.)'
        },
        color: { type: 'string', description: 'Optional hex color tint override' }
      },
      required: ['targetId', 'targetType', 'materialId']
    },
    execute: async (input: ApplyMaterialInput) => {
      const ok = sceneStore.applyMaterial(input.targetId, input.targetType, input.materialId, input.color);
      if (!ok) throw new Error(`Could not apply material to target "${input.targetId}".`);
      uiStore.recordAgentAction('apply_material', `Applied ${input.materialId} to ${input.targetType}`, input.targetId);
      return { success: true, targetId: input.targetId, materialId: input.materialId, color: input.color };
    }
  },

  change_texture: {
    name: 'change_texture',
    title: 'Change Texture',
    category: 'Materials' as const,
    description: 'Changes the surface texture mapping and PBR properties (scale, roughness, metalness) of a surface.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        targetId: { type: 'string', description: 'Room ID or Furniture Object ID' },
        textureType: { type: 'string', description: 'Texture mapping identifier' },
        scale: { type: 'number', description: 'UV tile repeat scale' },
        roughness: { type: 'number', description: 'Surface roughness (0-1)' },
        metalness: { type: 'number', description: 'Surface metalness (0-1)' }
      },
      required: ['targetId', 'textureType']
    },
    execute: async (input: ChangeTextureInput) => {
      const ok = sceneStore.changeTexture(input.targetId, input.textureType, input);
      if (!ok) throw new Error(`Could not change texture on "${input.targetId}".`);
      uiStore.recordAgentAction('change_texture', `Updated texture on ${input.targetId}`, input.targetId);
      return { success: true, targetId: input.targetId, textureType: input.textureType };
    }
  }
};
