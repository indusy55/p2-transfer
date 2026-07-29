const DB_NAME = 'p2-transfer';
const DB_VERSION = 1;
const CHUNKS_STORE = 'chunks';
const META_STORE = 'meta';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        db.createObjectStore(CHUNKS_STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface TransferMeta {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  bytesReceived: number;
  chunkCount: number;
  complete: boolean;
}

export class ChunkStore {
  private db: IDBDatabase | null = null;
  private transferId = '';

  async init(transferId: string) {
    this.transferId = transferId;
    this.db = await openDb();
  }

  async saveMeta(meta: TransferMeta) {
    if (!this.db) return;
    const tx = this.db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put(meta, this.transferId);
    await this.txDone(tx);
  }

  async loadMeta(): Promise<TransferMeta | null> {
    if (!this.db) return null;
    const tx = this.db.transaction(META_STORE, 'readonly');
    const request = tx.objectStore(META_STORE).get(this.transferId);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  }

  async saveChunk(index: number, buffer: ArrayBuffer) {
    if (!this.db) return;
    const tx = this.db.transaction(CHUNKS_STORE, 'readwrite');
    tx.objectStore(CHUNKS_STORE).put(buffer, `${this.transferId}:${index}`);
    await this.txDone(tx);
  }

  async assembleBlob(meta: TransferMeta): Promise<Blob> {
    if (!this.db) throw new Error('DB not initialized');
    const chunks: ArrayBuffer[] = [];
    const tx = this.db.transaction(CHUNKS_STORE, 'readonly');
    const store = tx.objectStore(CHUNKS_STORE);

    for (let i = 0; i < meta.chunkCount; i++) {
      const chunk = await new Promise<ArrayBuffer>((resolve, reject) => {
        const req = store.get(`${this.transferId}:${i}`);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      chunks.push(chunk);
    }

    return new Blob(chunks, { type: meta.type || 'application/octet-stream' });
  }

  async clear() {
    if (!this.db) return;

    const metaTx = this.db.transaction(META_STORE, 'readwrite');
    metaTx.objectStore(META_STORE).delete(this.transferId);
    await this.txDone(metaTx);

    const meta = await this.loadMeta();
    const count = meta?.chunkCount ?? 0;

    const chunkTx = this.db.transaction(CHUNKS_STORE, 'readwrite');
    const store = chunkTx.objectStore(CHUNKS_STORE);
    for (let i = 0; i < count + 1000; i++) {
      store.delete(`${this.transferId}:${i}`);
    }
    await this.txDone(chunkTx);
  }

  async clearAll() {
    if (!this.db) return;
    const tx1 = this.db.transaction(CHUNKS_STORE, 'readwrite');
    tx1.objectStore(CHUNKS_STORE).clear();
    await this.txDone(tx1);
    const tx2 = this.db.transaction(META_STORE, 'readwrite');
    tx2.objectStore(META_STORE).clear();
    await this.txDone(tx2);
  }

  close() {
    this.db?.close();
    this.db = null;
  }

  private txDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}


