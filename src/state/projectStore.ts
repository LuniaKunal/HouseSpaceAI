import { Project, ProjectMetadata, AutosaveStatus, CADReferenceData } from '../types/project';
import { projectStorage } from '../storage/indexedDBStorage';
import { sceneStore, SceneData } from './sceneStore';
import { uiStore } from './uiStore';
import { extractFloorPlanFromBlueprint } from '../geometry/geometryExtractor';
import { build4BHKSampleProject } from '../data/floorplan4bhkLayout';
import { build3BHKSampleProject } from '../data/floorplan3bhkSampleLayout';

export interface ProjectStoreState {
  projects: ProjectMetadata[];
  activeProject: Project | null;
  autosaveStatus: AutosaveStatus;
  lastSavedAt: number | null;
  isLoading: boolean;
}

type ProjectStoreListener = (state: ProjectStoreState) => void;

class ProjectStore {
  private state: ProjectStoreState = {
    projects: [],
    activeProject: null,
    autosaveStatus: 'idle',
    lastSavedAt: null,
    isLoading: true
  };

  private listeners: ProjectStoreListener[] = [];
  private saveTimeout: any = null;
  private isInternalLoading = false;

  constructor() {
    // Listen to scene changes and trigger autosave
    sceneStore.subscribe(() => {
      if (this.isInternalLoading) return;
      if (!this.state.activeProject) return;
      this.triggerAutosave();
    });
  }

  public getState(): ProjectStoreState {
    return this.state;
  }

  public subscribe(listener: ProjectStoreListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.state));
  }

  public async init() {
    this.state = { ...this.state, isLoading: true };
    this.notify();

    try {
      let allProjects = await projectStorage.getAllProjects();
      let activeProject: Project | null = null;

      // Ensure 4BHK_Sample project is seeded and available
      let sample4BHK = allProjects.find(
        p => p.metadata.name === '4BHK_Sample' || p.metadata.id === 'proj-4bhk-sample-residence'
      );
      if (!sample4BHK) {
        sample4BHK = build4BHKSampleProject();
        await projectStorage.saveProject(sample4BHK);
        allProjects = await projectStorage.getAllProjects();
      }

      // Ensure 3BHK_Sample project is seeded and available
      let sample3BHK = allProjects.find(
        p => p.metadata.name === '3BHK_Sample' || p.metadata.id === 'proj-3bhk-sample-residence'
      );
      if (!sample3BHK) {
        sample3BHK = build3BHKSampleProject();
        await projectStorage.saveProject(sample3BHK);
        allProjects = await projectStorage.getAllProjects();
      }

      if (allProjects.length > 0) {
        const activeId = projectStorage.getActiveProjectId();
        activeProject = activeId ? allProjects.find(p => p.metadata.id === activeId) || null : null;
        if (!activeProject || activeProject.metadata.name === 'Untitled Project') {
          activeProject = sample3BHK || sample4BHK || allProjects[0];
        }
      } else {
        activeProject = sample3BHK || sample4BHK;
        allProjects = await projectStorage.getAllProjects();
      }

      projectStorage.setActiveProjectId(activeProject.metadata.id);
      const metadataList = allProjects.map(p => p.metadata);

      // Load active project into scene store
      this.isInternalLoading = true;
      sceneStore.loadSceneData(activeProject.sceneData);
      this.isInternalLoading = false;

      this.state = {
        projects: metadataList,
        activeProject,
        autosaveStatus: 'saved',
        lastSavedAt: activeProject.metadata.updatedAt,
        isLoading: false
      };
      this.notify();

      // Open Studio View directly so user sees workspace
      uiStore.setActiveView('studio');
      uiStore.setCameraMode('3d', 'perspective');
    } catch (err) {
      console.error('Failed to initialize project store:', err);
      this.state = { ...this.state, isLoading: false, autosaveStatus: 'error' };
      this.notify();
    }
  }

  public async load4BHKSampleProject(): Promise<Project> {
    const allProjects = await projectStorage.getAllProjects();
    let sample4BHK = allProjects.find(
      p => p.metadata.name === '4BHK_Sample' || p.metadata.id === 'proj-4bhk-sample-residence'
    );
    if (!sample4BHK) {
      sample4BHK = build4BHKSampleProject();
      await projectStorage.saveProject(sample4BHK);
    }

    await this.openProject(sample4BHK.metadata.id);
    return sample4BHK;
  }

  public async load3BHKSampleProject(): Promise<Project> {
    const allProjects = await projectStorage.getAllProjects();
    let sample3BHK = allProjects.find(
      p => p.metadata.name === '3BHK_Sample' || p.metadata.id === 'proj-3bhk-sample-residence'
    );
    if (!sample3BHK) {
      sample3BHK = build3BHKSampleProject();
      await projectStorage.saveProject(sample3BHK);
    }

    await this.openProject(sample3BHK.metadata.id);
    return sample3BHK;
  }

  public async createProject(options: {
    name: string;
    template?: 'blank';
    description?: string;
    cadData?: CADReferenceData;
    initialSceneData?: SceneData;
  }): Promise<Project> {
    const id = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const template = options.template || 'blank';
    let sceneData: SceneData;
    let cadData = options.cadData;

    if (options.initialSceneData) {
      sceneData = JSON.parse(JSON.stringify(options.initialSceneData));
    } else if (cadData?.dataUrl) {
      const extraction = await extractFloorPlanFromBlueprint({
        dataUrl: cadData.dataUrl,
        blueprintName: cadData.fileName
      });
      sceneData = {
        rooms: [],
        furniture: [],
        gates: [],
        doors: [],
        windows: [],
        customWalls: [],
        globalCeilingHeight: 9.5,
        floorPlan: extraction.floorPlan,
        validation: extraction.validation
      };
    } else {
      // Clean Blank Canvas (Zero hardcoded geometry)
      sceneData = {
        rooms: [],
        furniture: [],
        gates: [],
        doors: [],
        windows: [],
        customWalls: [],
        globalCeilingHeight: 9.5
      };
    }

    const totalAreaSqFt = sceneData.rooms.reduce((acc, r) => acc + r.width * r.depth, 0);

    const newProject: Project = {
      metadata: {
        id,
        name: options.name.trim() || 'Untitled Project',
        description: options.description || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        thumbnail: this.renderThumbnailFromSceneData(sceneData),
        roomCount: sceneData.rooms.length,
        furnitureCount: sceneData.furniture.length,
        totalAreaSqFt,
        tags: [template],
        unit: 'feet',
        version: '1.0.0'
      },
      sceneData,
      cadData,
      aiChatHistory: []
    };

    await projectStorage.saveProject(newProject);
    projectStorage.setActiveProjectId(id);

    // Refresh projects list
    const allProjects = await projectStorage.getAllProjects();

    this.isInternalLoading = true;
    sceneStore.loadSceneData(newProject.sceneData);
    this.isInternalLoading = false;

    this.state = {
      ...this.state,
      projects: allProjects.map(p => p.metadata),
      activeProject: newProject,
      autosaveStatus: 'saved',
      lastSavedAt: Date.now()
    };
    this.notify();

    // Switch to studio workspace
    uiStore.setActiveView('studio');
    uiStore.showToast(
      'Project Created',
      `Opened "${newProject.metadata.name}" in workspace.`,
      'success'
    );

    return newProject;
  }

  public async openProject(id: string): Promise<boolean> {
    // Flush pending autosave for current project before switching
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
      await this.saveActiveProjectImmediately();
    }

    const project = await projectStorage.getProject(id);
    if (!project) {
      uiStore.showToast('Error', 'Could not find project to open.', 'error');
      return false;
    }

    projectStorage.setActiveProjectId(id);

    this.isInternalLoading = true;
    sceneStore.loadSceneData(project.sceneData);
    this.isInternalLoading = false;

    this.state = {
      ...this.state,
      activeProject: project,
      autosaveStatus: 'saved',
      lastSavedAt: project.metadata.updatedAt
    };
    this.notify();

    uiStore.setActiveView('studio');
    uiStore.showToast(
      'Project Opened',
      `Active workspace: ${project.metadata.name}`,
      'info'
    );
    return true;
  }

  public async renameProject(id: string, newName: string): Promise<boolean> {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    const project = await projectStorage.getProject(id);
    if (!project) return false;

    project.metadata.name = trimmed;
    project.metadata.updatedAt = Date.now();
    await projectStorage.saveProject(project);

    const allProjects = await projectStorage.getAllProjects();

    this.state = {
      ...this.state,
      projects: allProjects.map(p => p.metadata),
      activeProject:
        this.state.activeProject?.metadata.id === id
          ? { ...this.state.activeProject, metadata: { ...this.state.activeProject.metadata, name: trimmed } }
          : this.state.activeProject
    };
    this.notify();

    uiStore.showToast('Project Renamed', `Project name set to "${trimmed}"`, 'success');
    return true;
  }

  public async duplicateProject(id: string): Promise<Project> {
    const cloned = await projectStorage.duplicateProject(id);
    const allProjects = await projectStorage.getAllProjects();

    this.state = {
      ...this.state,
      projects: allProjects.map(p => p.metadata)
    };
    this.notify();

    uiStore.showToast(
      'Project Duplicated',
      `Created duplicate copy "${cloned.metadata.name}"`,
      'success'
    );
    return cloned;
  }

  public async deleteProject(id: string): Promise<boolean> {
    await projectStorage.deleteProject(id);
    const allProjects = await projectStorage.getAllProjects();

    let newActive = this.state.activeProject;
    if (this.state.activeProject?.metadata.id === id) {
      if (allProjects.length > 0) {
        newActive = allProjects[0];
        projectStorage.setActiveProjectId(newActive.metadata.id);
        this.isInternalLoading = true;
        sceneStore.loadSceneData(newActive.sceneData);
        this.isInternalLoading = false;
      } else {
        // If all projects deleted, create a fresh blank one
        newActive = await this.createProject({ name: 'Untitled Project', template: 'blank' });
      }
    }

    this.state = {
      ...this.state,
      projects: allProjects.map(p => p.metadata),
      activeProject: newActive,
      autosaveStatus: 'saved'
    };
    this.notify();

    uiStore.showToast('Project Deleted', 'Project has been permanently removed.', 'info');
    return true;
  }

  public async exportProject(id: string) {
    try {
      const json = await projectStorage.exportProjectJSON(id);
      const project = await projectStorage.getProject(id);
      const name = (project?.metadata.name || 'Project').replace(/[^a-z0-9]/gi, '_');

      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HouseSpace_${name}_${new Date().toISOString().split('T')[0]}.housespace.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      uiStore.showToast('Export Complete', 'Project downloaded as JSON backup file.', 'success');
    } catch (err: any) {
      console.error(err);
      uiStore.showToast('Export Failed', err.message, 'error');
    }
  }

  public async importProject(jsonString: string): Promise<Project | null> {
    try {
      const imported = await projectStorage.importProjectJSON(jsonString);
      const allProjects = await projectStorage.getAllProjects();

      this.state = {
        ...this.state,
        projects: allProjects.map(p => p.metadata)
      };
      this.notify();

      await this.openProject(imported.metadata.id);
      uiStore.showToast('Project Imported', `Imported "${imported.metadata.name}" successfully.`, 'success');
      return imported;
    } catch (err: any) {
      console.error(err);
      uiStore.showToast('Import Failed', 'Invalid project file format.', 'error');
      return null;
    }
  }

  // --- Autosave Implementation with Debounce ---

  private triggerAutosave() {
    this.state = { ...this.state, autosaveStatus: 'saving' };
    this.notify();

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      await this.saveActiveProjectImmediately();
    }, 850);
  }

  private async saveActiveProjectImmediately() {
    if (!this.state.activeProject) return;

    try {
      const sceneData = sceneStore.getData();
      const totalAreaSqFt = sceneData.rooms.reduce((acc, r) => acc + r.width * r.depth, 0);
      const thumbnail = sceneStore.getThumbnailSVG();

      const updatedProject: Project = {
        ...this.state.activeProject,
        metadata: {
          ...this.state.activeProject.metadata,
          roomCount: sceneData.rooms.length,
          furnitureCount: sceneData.furniture.length,
          totalAreaSqFt,
          thumbnail,
          updatedAt: Date.now()
        },
        sceneData
      };

      await projectStorage.saveProject(updatedProject);

      const allProjects = await projectStorage.getAllProjects();

      this.state = {
        ...this.state,
        projects: allProjects.map(p => p.metadata),
        activeProject: updatedProject,
        autosaveStatus: 'saved',
        lastSavedAt: Date.now()
      };
      this.notify();
    } catch (err) {
      console.error('Autosave error:', err);
      this.state = { ...this.state, autosaveStatus: 'error' };
      this.notify();
    }
  }



  private renderThumbnailFromSceneData(data: SceneData): string {
    const rooms = data.rooms;
    if (rooms.length === 0) {
      const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
        <rect width="320" height="200" fill="#0f172a"/>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="320" height="200" fill="url(#grid)"/>
        <text x="160" y="105" fill="#475569" font-family="sans-serif" font-size="13" text-anchor="middle" font-weight="500">Blank Workspace</text>
      </svg>`;
      return `data:image/svg+xml;utf8,${encodeURIComponent(emptySvg)}`;
    }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const r of rooms) {
      minX = Math.min(minX, r.position.x - r.width / 2);
      maxX = Math.max(maxX, r.position.x + r.width / 2);
      minZ = Math.min(minZ, r.position.z - r.depth / 2);
      maxZ = Math.max(maxZ, r.position.z + r.depth / 2);
    }

    const pad = 3;
    minX -= pad;
    maxX += pad;
    minZ -= pad;
    maxZ += pad;
    const w = Math.max(10, maxX - minX);
    const h = Math.max(10, maxZ - minZ);

    const roomElements = rooms.map(r => {
      const rx = r.position.x - r.width / 2;
      const rz = r.position.z - r.depth / 2;
      return `<rect x="${rx}" y="${rz}" width="${r.width}" height="${r.depth}" fill="#1e293b" stroke="#3b82f6" stroke-width="0.3" rx="0.3" opacity="0.9"/>
      <text x="${r.position.x}" y="${r.position.z + 0.3}" fill="#93c5fd" font-family="sans-serif" font-size="${Math.min(1.2, r.width * 0.18)}" text-anchor="middle" font-weight="600" opacity="0.8">${r.name.length > 12 ? r.name.substring(0, 11) + '..' : r.name}</text>`;
    }).join('\n');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minZ} ${w} ${h}" width="320" height="200">
      <rect x="${minX}" y="${minZ}" width="${w}" height="${h}" fill="#0b0f19"/>
      <g>${roomElements}</g>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}

export const projectStore = new ProjectStore();
