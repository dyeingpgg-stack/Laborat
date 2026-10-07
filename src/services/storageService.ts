/**
 * Storage Service: Mengelola penyimpanan resep di IndexedDB & LocalStorage
 * Mendukung persistensi ribuan resep dari file CSV yang diunggah pengguna.
 */

import { ResepDetail, MesinCelup, WorkOrderDyeing } from '../types/resep';

const DB_NAME = 'ResepDyeingDB';
const DB_VERSION = 2;
const STORE_RECIPES = 'resep_master';
const STORE_MC = 'mc_master';
const STORE_WOD = 'wod_master';
const CUSTOM_RECIPES_KEY = 'resep_dyeing_custom_saved_v1';
const MC_STORAGE_KEY = 'rph_mc_storage_v1';
const WOD_STORAGE_KEY = 'rph_wod_storage_v1';

// Daftar no_resep mockup generik sebelumnya yang wajib dibersihkan jika ada
const LEGACY_MOCK_RECIPES = new Set([
  'AH08AG05A002_MOCK',
  'OO07CG08A006_MOCK',
]);

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_RECIPES)) {
        db.createObjectStore(STORE_RECIPES, { keyPath: 'no_resep' });
      }
      if (!db.objectStoreNames.contains(STORE_MC)) {
        db.createObjectStore(STORE_MC, { keyPath: 'no_mc' });
      }
      if (!db.objectStoreNames.contains(STORE_WOD)) {
        db.createObjectStore(STORE_WOD, { keyPath: 'no_wod' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecipesToStorage(recipes: ResepDetail[]): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_RECIPES, 'readwrite');
    const store = tx.objectStore(STORE_RECIPES);
    
    // Clear and batch put
    store.clear();
    for (const r of recipes) {
      store.put(r);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        try {
          localStorage.setItem(CUSTOM_RECIPES_KEY, JSON.stringify({ count: recipes.length, updated_at: new Date().toISOString() }));
        } catch {}
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to localStorage if small:', err);
    try {
      localStorage.setItem('resep_fallback', JSON.stringify(recipes.slice(0, 100)));
    } catch {}
  }
}

export async function loadRecipesFromStorage(): Promise<ResepDetail[] | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_RECIPES, 'readonly');
    const store = tx.objectStore(STORE_RECIPES);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const res = request.result as ResepDetail[];
        if (res && res.length > 0) {
          // Filter out legacy mock data if any
          const clean = res.filter(r => !LEGACY_MOCK_RECIPES.has(r.no_resep));
          if (clean.length > 0) {
            resolve(clean);
          } else {
            clearCustomStorage();
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IndexedDB load failed:', err);
    return null;
  }
}

export async function saveMcToStorage(mcList: MesinCelup[]): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_MC, 'readwrite');
    const store = tx.objectStore(STORE_MC);
    store.clear();
    for (const mc of mcList) {
      store.put(mc);
    }
    localStorage.setItem(MC_STORAGE_KEY, JSON.stringify(mcList));
  } catch (e) {
    try {
      localStorage.setItem(MC_STORAGE_KEY, JSON.stringify(mcList));
    } catch {}
  }
}

export async function loadMcFromStorage(): Promise<MesinCelup[] | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_MC, 'readonly');
    const store = tx.objectStore(STORE_MC);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const res = request.result as MesinCelup[];
        if (res && res.length > 0) {
          resolve(res);
        } else {
          const raw = localStorage.getItem(MC_STORAGE_KEY);
          resolve(raw ? JSON.parse(raw) : null);
        }
      };
      request.onerror = () => {
        const raw = localStorage.getItem(MC_STORAGE_KEY);
        resolve(raw ? JSON.parse(raw) : null);
      };
    });
  } catch (e) {
    const raw = localStorage.getItem(MC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}

export async function saveWodToStorage(wodList: WorkOrderDyeing[]): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_WOD, 'readwrite');
    const store = tx.objectStore(STORE_WOD);
    store.clear();
    for (const w of wodList) {
      store.put(w);
    }
    localStorage.setItem(WOD_STORAGE_KEY, JSON.stringify(wodList));
  } catch (e) {
    try {
      localStorage.setItem(WOD_STORAGE_KEY, JSON.stringify(wodList));
    } catch {}
  }
}

export async function loadWodFromStorage(): Promise<WorkOrderDyeing[] | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_WOD, 'readonly');
    const store = tx.objectStore(STORE_WOD);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const res = request.result as WorkOrderDyeing[];
        if (res && res.length > 0) {
          resolve(res);
        } else {
          const raw = localStorage.getItem(WOD_STORAGE_KEY);
          resolve(raw ? JSON.parse(raw) : null);
        }
      };
      request.onerror = () => {
        const raw = localStorage.getItem(WOD_STORAGE_KEY);
        resolve(raw ? JSON.parse(raw) : null);
      };
    });
  } catch (e) {
    const raw = localStorage.getItem(WOD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}

export async function clearCustomStorage(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_RECIPES, STORE_MC, STORE_WOD], 'readwrite');
    tx.objectStore(STORE_RECIPES).clear();
    tx.objectStore(STORE_MC).clear();
    tx.objectStore(STORE_WOD).clear();
    localStorage.removeItem(CUSTOM_RECIPES_KEY);
    localStorage.removeItem(MC_STORAGE_KEY);
    localStorage.removeItem(WOD_STORAGE_KEY);
    localStorage.removeItem('resep_fallback');
  } catch (e) {
    console.warn(e);
  }
}
