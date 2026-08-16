// idb-storage.js — IndexedDB storage adapter implementing the SRS Storage interface.
// Browser-only (uses the global `indexedDB`). No dependencies. Drop-in replacement
// for MemoryStorage: `new SRS(new IdbStorage('gis-srs'), params)`.
//
// Object stores:
//   cards  (keyPath 'id')      — per-card scheduling state
//   kcs    (keyPath 'kc')      — per-knowledge-component BKT mastery
//   meta   (keyPath 'k')       — small key/value config
//   reviews(autoIncrement)     — append-only answer log; index 'ts'

const DB_VERSION = 1;

export class IdbStorage {
  constructor(dbName = 'italia-srs') { this.dbName = dbName; this.db = null; }

  init() {
    if (this.db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('cards')) db.createObjectStore('cards', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('kcs')) db.createObjectStore('kcs', { keyPath: 'kc' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' });
        if (!db.objectStoreNames.contains('reviews')) {
          const r = db.createObjectStore('reviews', { keyPath: 'seq', autoIncrement: true });
          r.createIndex('ts', 'ts');
        }
      };
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  _tx(store, mode) { return this.db.transaction(store, mode).objectStore(store); }
  _p(req) { return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); }
  _done(tx) { return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); }

  async getCard(id) { return (await this._p(this._tx('cards', 'readonly').get(id))) || null; }
  async putCard(c) { const tx = this.db.transaction('cards', 'readwrite'); tx.objectStore('cards').put(c); return this._done(tx); }
  async bulkPutCards(cs) { const tx = this.db.transaction('cards', 'readwrite'); const st = tx.objectStore('cards'); for (const c of cs) st.put(c); return this._done(tx); }
  async getAllCards() { return (await this._p(this._tx('cards', 'readonly').getAll())) || []; }
  async deleteCards(ids) { const tx = this.db.transaction('cards', 'readwrite'); const st = tx.objectStore('cards'); for (const id of ids) st.delete(id); return this._done(tx); }

  async getKc(id) { return (await this._p(this._tx('kcs', 'readonly').get(id))) || null; }
  async putKc(k) { const tx = this.db.transaction('kcs', 'readwrite'); tx.objectStore('kcs').put(k); return this._done(tx); }
  async bulkPutKcs(ks) { const tx = this.db.transaction('kcs', 'readwrite'); const st = tx.objectStore('kcs'); for (const k of ks) st.put(k); return this._done(tx); }
  async getAllKcs() { return (await this._p(this._tx('kcs', 'readonly').getAll())) || []; }

  async getMeta(k) { const r = await this._p(this._tx('meta', 'readonly').get(k)); return r ? r.v : null; }
  async setMeta(k, v) { const tx = this.db.transaction('meta', 'readwrite'); tx.objectStore('meta').put({ k, v }); return this._done(tx); }

  async logReview(e) { const tx = this.db.transaction('reviews', 'readwrite'); tx.objectStore('reviews').add(e); return this._done(tx); }

  // Utility: wipe all scheduling state (keeps DB schema).
  async reset() {
    const tx = this.db.transaction(['cards', 'kcs', 'meta', 'reviews'], 'readwrite');
    for (const s of ['cards', 'kcs', 'meta', 'reviews']) tx.objectStore(s).clear();
    return this._done(tx);
  }
}
