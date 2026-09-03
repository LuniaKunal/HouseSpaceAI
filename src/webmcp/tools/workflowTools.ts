import { sceneStore } from '../../state/sceneStore';
import { uiStore } from '../../state/uiStore';
import { agentStore } from '../../state/agentStore';
import { projectStore } from '../../state/projectStore';
import {
  ExportModelInput,
  CreateProjectInput,
  OpenProjectInput,
  ListProjectsInput
} from '../../types/webmcp';
import { exportGLBScene } from '../../export/glbExporter';
import { exportOBJScene } from '../../export/objExporter';
import { exportIFC4Scene } from '../../export/ifcExporter';
import { cadTools } from './cadTools';

export const workflowTools = {
  undo: {
    name: 'undo',
    title: 'Undo Action',
    category: 'Workflow' as const,
    description: 'Reverts the most recent design action on the scene graph.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {}
    },
    execute: async () => {
      const ok = sceneStore.undo();
      if (!ok) throw new Error('Nothing to undo.');
      uiStore.recordAgentAction('undo', 'Reverted previous action');
      return { success: true, message: 'Undid last change' };
    }
  },

  redo: {
    name: 'redo',
    title: 'Redo Action',
    category: 'Workflow' as const,
    description: 'Re-applies the most recently reverted design action.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {}
    },
    execute: async () => {
      const ok = sceneStore.redo();
      if (!ok) throw new Error('Nothing to redo.');
      uiStore.recordAgentAction('redo', 'Reapplied next action');
      return { success: true, message: 'Redid change' };
    }
  },

  export_model: {
    name: 'export_model',
    title: 'Export 3D Model',
    category: 'Workflow' as const,
    description: 'Generates and downloads a 3D CAD/BIM model file in GLB, OBJ, IFC4, or JSON format. Requires confirmation.',
    requiresConfirmation: true,
    inputSchema: {
      type: 'object' as const,
      properties: {
        format: {
          type: 'string',
          enum: ['glb', 'obj', 'ifc4', 'json'],
          description: 'Model export file format'
        },
        includeMetadata: { type: 'boolean', description: 'Include BIM / room metadata (default true)' }
      },
      required: ['format']
    },
    execute: async (input: ExportModelInput) => {
      let blob: Blob;
      let filename = `HouseSpace_Apartment_Design_${Date.now()}`;

      if (input.format === 'glb') {
        blob = await exportGLBScene(input.includeMetadata !== false);
        filename += '.glb';
      } else if (input.format === 'obj') {
        blob = exportOBJScene();
        filename += '.obj';
      } else if (input.format === 'ifc4') {
        blob = exportIFC4Scene();
        filename += '.ifc';
      } else {
        const state = sceneStore.getSceneState();
        blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        filename += '.json';
      }

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      uiStore.recordAgentAction('export_model', `Exported 3D model as ${input.format.toUpperCase()}`);
      return {
        success: true,
        format: input.format,
        filename,
        byteSize: blob.size,
        timestamp: new Date().toISOString()
      };
    }
  },

  set_confirmation_policy: {
    name: 'set_confirmation_policy',
    title: 'Set Confirmation Policy',
    category: 'Workflow' as const,
    description: 'Configures the human-in-the-loop trust boundary and confirmation requirements for agent actions.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        requireConfirmation: { type: 'boolean', description: 'Whether irreversible actions require human approval' },
        allowedActions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Whitelist of auto-approved tool names'
        }
      },
      required: ['requireConfirmation']
    },
    execute: async (input: { requireConfirmation: boolean; allowedActions?: string[] }) => {
      agentStore.setRequireConfirmation(input.requireConfirmation, input.allowedActions);
      uiStore.recordAgentAction('set_confirmation_policy', `Updated confirmation policy (Active: ${input.requireConfirmation})`);
      return { success: true, requireConfirmation: input.requireConfirmation };
    }
  },

  create_project: {
    name: 'create_project',
    title: 'Create Project',
    category: 'Workflow' as const,
    description: 'Creates a new project workspace. Supports importing a 2D CAD blueprint image and user prompt instructions to automatically synthesize a 3D architectural plan.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Name of the project workspace' },
        description: { type: 'string', description: 'Optional project description or notes' },
        template: {
          type: 'string',
          enum: ['blank'],
          description: 'Initial starter workspace template (default "blank")'
        },
        cadDataUrl: { type: 'string', description: 'Optional base64/data URL of 2D CAD blueprint or floorplan image' },
        cadFileName: { type: 'string', description: 'Display name of the CAD drawing' },
        userPrompt: { type: 'string', description: 'Instructions for what to build (e.g. 2BHK with open kitchen)' },
        stylePreset: {
          type: 'string',
          enum: ['modern_luxury', 'minimalist', 'warm_contemporary', 'scandinavian', 'industrial'],
          description: 'Architectural theme preset'
        },
        autoBuild3D: { type: 'boolean', description: 'Whether to automatically synthesize 3D layout from image/prompt (default true)' }
      },
      required: ['name']
    },
    execute: async (input: CreateProjectInput) => {
      const template = input.template || 'blank';
      let cadData = undefined;
      if (input.cadDataUrl) {
        cadData = {
          fileName: input.cadFileName || 'Blueprint_Import.png',
          fileSize: Math.round(input.cadDataUrl.length * 0.75),
          uploadedAt: Date.now(),
          dataUrl: input.cadDataUrl,
          opacity: 0.75,
          visible: true
        };
      }

      const shouldAutoBuild = (input.cadDataUrl || input.userPrompt) && input.autoBuild3D !== false;

      const project = await projectStore.createProject({
        name: input.name,
        description: input.description,
        template: shouldAutoBuild ? 'blank' : template,
        cadData
      });

      uiStore.setActiveView('studio');
      uiStore.recordAgentAction('create_project', `Created project workspace "${project.metadata.name}"`, project.metadata.id);

      let synthesisResult = null;
      if (shouldAutoBuild) {
        synthesisResult = await cadTools.build_3d_from_cad.execute({
          cadDataUrl: input.cadDataUrl,
          blueprintName: input.cadFileName || 'Blueprint Drawing',
          userPrompt: input.userPrompt,
          projectName: input.name,
          description: input.description,
          stylePreset: input.stylePreset,
          furnished: true
        });
      }

      const currentRooms = sceneStore.getData().rooms;
      const totalAreaSqFt = currentRooms.reduce((acc, r) => acc + r.width * r.depth, 0);

      return {
        success: true,
        projectId: project.metadata.id,
        name: project.metadata.name,
        roomCount: currentRooms.length,
        totalAreaSqFt,
        template,
        synthesis: synthesisResult,
        message: `Successfully created project "${project.metadata.name}" with ${currentRooms.length} rooms.`
      };
    }
  },

  open_project: {
    name: 'open_project',
    title: 'Open Project',
    category: 'Workflow' as const,
    description: 'Loads and opens an existing project workspace by ID.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'ID of the project to open' }
      },
      required: ['projectId']
    },
    execute: async (input: OpenProjectInput) => {
      await projectStore.openProject(input.projectId);
      const activeProj = projectStore.getState().activeProject;
      if (!activeProj) throw new Error(`Failed to open project "${input.projectId}".`);

      uiStore.setActiveView('studio');
      uiStore.recordAgentAction('open_project', `Opened project "${activeProj.metadata.name}"`, activeProj.metadata.id);

      return {
        success: true,
        projectId: activeProj.metadata.id,
        name: activeProj.metadata.name,
        roomCount: activeProj.metadata.roomCount,
        totalAreaSqFt: activeProj.metadata.totalAreaSqFt
      };
    }
  },

  list_projects: {
    name: 'list_projects',
    title: 'List Projects',
    category: 'Workflow' as const,
    description: 'Lists all saved project workspaces with room count, area, and metadata.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        searchQuery: { type: 'string', description: 'Optional search keyword to filter projects' },
        sortBy: { type: 'string', enum: ['updated', 'name', 'created'], description: 'Sort criteria' }
      }
    },
    execute: async (input: ListProjectsInput = {}) => {
      let projects = [...projectStore.getState().projects];
      if (input.searchQuery?.trim()) {
        const q = input.searchQuery.toLowerCase();
        projects = projects.filter(
          p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
        );
      }
      if (input.sortBy === 'name') {
        projects.sort((a, b) => a.name.localeCompare(b.name));
      } else if (input.sortBy === 'created') {
        projects.sort((a, b) => b.createdAt - a.createdAt);
      } else {
        projects.sort((a, b) => b.updatedAt - a.updatedAt);
      }

      return {
        success: true,
        totalCount: projects.length,
        projects
      };
    }
  },

  delete_project: {
    name: 'delete_project',
    title: 'Delete Project',
    category: 'Workflow' as const,
    description: 'Permanently deletes a project workspace by ID or deletes the currently active project.',
    requiresConfirmation: true,
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'ID of the project to delete (defaults to active project)' }
      }
    },
    execute: async (input: { projectId?: string } = {}) => {
      const activeProj = projectStore.getState().activeProject;
      const targetId = input.projectId || activeProj?.metadata.id;
      if (!targetId) throw new Error('No project found to delete.');
      const projectName = activeProj?.metadata.name || targetId;
      await projectStore.deleteProject(targetId);
      uiStore.recordAgentAction('delete_project', `Permanently deleted project "${projectName}"`, targetId);
      return {
        success: true,
        deletedProjectId: targetId,
        message: `Successfully deleted project "${projectName}".`
      };
    }
  },

  duplicate_project: {
    name: 'duplicate_project',
    title: 'Duplicate Project',
    category: 'Workflow' as const,
    description: 'Creates a cloned duplicate copy of an existing project workspace.',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'ID of project to clone (defaults to active project)' }
      }
    },
    execute: async (input: { projectId?: string } = {}) => {
      const targetId = input.projectId || projectStore.getState().activeProject?.metadata.id;
      if (!targetId) throw new Error('No project found to duplicate.');
      const cloned = await projectStore.duplicateProject(targetId);
      uiStore.recordAgentAction('duplicate_project', `Duplicated project as "${cloned.metadata.name}"`, cloned.metadata.id);
      return {
        success: true,
        projectId: cloned.metadata.id,
        name: cloned.metadata.name,
        roomCount: cloned.metadata.roomCount,
        totalAreaSqFt: cloned.metadata.totalAreaSqFt
      };
    }
  },

  load_sample_project: {
    name: 'load_sample_project',
    title: 'Load Sample Project',
    category: 'Workflow' as const,
    description: 'Loads pre-built architectural blueprints: "3BHK_Sample" (Sample_2.png) or "4BHK_Sample" (Sample_1.png).',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object' as const,
      properties: {
        sampleName: {
          type: 'string',
          enum: ['3BHK_Sample', '4BHK_Sample'],
          description: 'Name of the sample architectural blueprint to load'
        }
      },
      required: ['sampleName']
    },
    execute: async (input: { sampleName: '3BHK_Sample' | '4BHK_Sample' | string }) => {
      let project;
      if (input.sampleName.includes('3BHK') || input.sampleName.includes('2')) {
        project = await projectStore.load3BHKSampleProject();
      } else {
        project = await projectStore.load4BHKSampleProject();
      }
      uiStore.setActiveView('studio');
      uiStore.recordAgentAction('load_sample_project', `Loaded sample project "${project.metadata.name}"`, project.metadata.id);
      return {
        success: true,
        projectId: project.metadata.id,
        name: project.metadata.name,
        roomCount: project.metadata.roomCount,
        totalAreaSqFt: project.metadata.totalAreaSqFt
      };
    }
  },

  clear_scene: {
    name: 'clear_scene',
    title: 'Clear Scene',
    category: 'Workflow' as const,
    description: 'Clears all rooms, furniture, and walls from the active workspace. Requires confirmation.',
    requiresConfirmation: true,
    inputSchema: {
      type: 'object' as const,
      properties: {}
    },
    execute: async () => {
      sceneStore.clearScene();
      uiStore.setSelected(null);
      uiStore.recordAgentAction('clear_scene', 'Cleared entire scene canvas');
      return { success: true, message: 'Cleared all rooms and furniture from workspace' };
    }
  }
};
