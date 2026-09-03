import { Project } from '../types/project';

const DB_NAME = 'HouseSpaceDesignDB';
const LEGACY_DB_NAME = 'FormaDesignDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const ACTIVE_PROJECT_KEY = 'housespace_active_project_id';
const LEGACY_ACTIVE_PROJECT_KEY = 'forma_active_project_id';

// In-memory fallback for testing / SSR environments without indexedDB
const memoryStore = new Map<string, Project>();

class IndexedDBStorage {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private isSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (!this.isSupported()) return null;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'metadata.id' });
            store.createIndex('updatedAt', 'metadata.updatedAt', { unique: false });
            store.createIndex('name', 'metadata.name', { unique: false });
            store.createIndex('createdAt', 'metadata.createdAt', { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn('IndexedDB open error, falling back to memory store:', request.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB exception:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  public async getAllProjects(): Promise<Project[]> {
    const db = await this.getDB();
    if (!db) {
      return Array.from(memoryStore.values()).sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt);
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('updatedAt');
        const request = index.openCursor(null, 'prev'); // descending by updatedAt
        const results: Project[] = [];

        request.onsuccess = (event: Event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async getProject(id: string): Promise<Project | null> {
    const db = await this.getDB();
    if (!db) {
      return memoryStore.get(id) || null;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async saveProject(project: Project): Promise<void> {
    const updatedProject: Project = {
      ...project,
      metadata: {
        ...project.metadata,
        updatedAt: Date.now()
      }
    };

    const db = await this.getDB();
    if (!db) {
      memoryStore.set(updatedProject.metadata.id, updatedProject);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(updatedProject);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async deleteProject(id: string): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      memoryStore.delete(id);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async duplicateProject(id: string, newName?: string): Promise<Project> {
    const original = await this.getProject(id);
    if (!original) {
      throw new Error(`Project with ID "${id}" not found.`);
    }

    const newId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const cloned: Project = JSON.parse(JSON.stringify(original));
    cloned.metadata.id = newId;
    cloned.metadata.name = newName || `${original.metadata.name} (Copy)`;
    cloned.metadata.createdAt = Date.now();
    cloned.metadata.updatedAt = Date.now();

    await this.saveProject(cloned);
    return cloned;
  }

  public async seedDefaultProjectIfEmpty(defaultProjectFactory: () => Project): Promise<Project> {
    const existing = await this.getAllProjects();
    if (existing.length > 0) {
      const activeId = this.getActiveProjectId();
      const active = existing.find(p => p.metadata.id === activeId);
      return active || existing[0];
    }

    const defaultProj = defaultProjectFactory();
    await this.saveProject(defaultProj);
    this.setActiveProjectId(defaultProj.metadata.id);
    return defaultProj;
  }

  public getActiveProjectId(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(ACTIVE_PROJECT_KEY) || localStorage.getItem(LEGACY_ACTIVE_PROJECT_KEY);
    }
    return null;
  }

  public setActiveProjectId(id: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    }
  }

  public async exportProjectJSON(id: string): Promise<string> {
    const project = await this.getProject(id);
    if (!project) throw new Error('Project not found');
    return JSON.stringify(project, null, 2);
  }

  public async importProjectJSON(jsonString: string): Promise<Project> {
    const parsed = JSON.parse(jsonString) as Project;
    if (!parsed.metadata || !parsed.sceneData) {
      throw new Error('Invalid HouseSpace project file format');
    }

    const newId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    parsed.metadata.id = newId;
    parsed.metadata.name = `${parsed.metadata.name} (Imported)`;
    parsed.metadata.updatedAt = Date.now();
    parsed.metadata.createdAt = Date.now();

    await this.saveProject(parsed);
    return parsed;
  }
}

export const projectStorage = new IndexedDBStorage();
