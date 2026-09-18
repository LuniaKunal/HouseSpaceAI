import { PhotoDesign } from './model';

export interface PhotoRepository {
  list(): Promise<PhotoDesign[]>;
  get(id: string): Promise<PhotoDesign | undefined>;
  put(design: PhotoDesign): Promise<void>;
  remove(id: string): Promise<void>;
}

// Separate database: no migration or changes to existing architectural projects.
export class BrowserPhotoRepository implements PhotoRepository {
  private db?: Promise<IDBDatabase>;
  private open() {
    if (!this.db) {
      this.db = new Promise<IDBDatabase>((resolve, reject) => {
        if (typeof indexedDB === 'undefined') { reject(new Error('Local photo storage is unavailable in this browser.')); return; }
        const request = indexedDB.open('HouseSpacePhotoDesigns', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('designs', { keyPath: 'id' });
        request.onerror = () => reject(new Error('Unable to open local photo storage. Check browser storage permissions.'));
        request.onblocked = () => reject(new Error('Close other HouseSpace tabs and retry.'));
        request.onsuccess = () => {
          request.result.onversionchange = () => { request.result.close(); this.db = undefined; };
          resolve(request.result);
        };
      }).catch(error => { this.db = undefined; throw error; });
    }
    return this.db;
  }
  private async run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('designs', mode);
      const request = action(tx.objectStore('designs'));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(new Error(tx.error?.name === 'QuotaExceededError' ? 'Browser storage is full. Download and remove older photo designs, then retry.' : 'The photo could not be saved. Check browser storage permissions.'));
      tx.onerror = () => { /* onabort reports the transaction failure */ };
    });
  }
  list() { return this.run<PhotoDesign[]>('readonly', store => store.getAll()); }
  get(id: string) { return this.run<PhotoDesign | undefined>('readonly', store => store.get(id)); }
  async put(design: PhotoDesign) { await this.run('readwrite', store => store.put(design)); }
  async remove(id: string) { await this.run('readwrite', store => store.delete(id)); }
}
