/**
 * Sheets Service: Sinkronisasi data real-time dengan Spreadsheet RPH (Resep, MC, WOD)
 */

import { ProductionLot, OrderRequirement, ResepDetail, MesinCelup, WorkOrderDyeing, StokKimiaItem } from '../types/resep';
import { parseResepCsv } from '../data/masterResep';
import { parseMcCsv, parseWodCsv, parseStokCsv } from '../data/rphParsers';
import { 
  saveRecipesToStorage, 
  saveMcToStorage, 
  saveWodToStorage 
} from './storageService';
import sheetsData from '../data/sheetsData.json';
import defaultStokData from '../data/defaultStokData.json';

// ID spreadsheet lama MUTKIMYD untuk deteksi mismatch
export const LEGACY_MUTKIMYD_ID = '1aNoqY6Iu5-9xWIj3DpRfTEQ-ilWn5DrAE5ScV_hYPdc';
// ID spreadsheet Google Sheets RPH tertanam permanen sesuai permintaan user
export const DEFAULT_RPH_SPREADSHEET_ID = '1DdaVzmZVcBWiHr9HglPG3aY_MP_9FhNvktRdO9CdS2I';
export const DEFAULT_RPH_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1DdaVzmZVcBWiHr9HglPG3aY_MP_9FhNvktRdO9CdS2I/edit';

export interface RphConfig {
  spreadsheetIdOrUrl: string;
  spreadsheetId: string;
  sheetResep: string;
  sheetMc: string;
  sheetWod: string;
  lastSyncedAt?: string;
  resepCount?: number;
  mcCount?: number;
  wodCount?: number;
  lastError?: string;
}

const RPH_CONFIG_KEY = 'rph_sheet_config_v2';

/**
 * Ekstrak ID spreadsheet Google dari link lengkap atau string ID mentah
 */
export function extractSpreadsheetId(input?: string): string {
  if (!input || !input.trim()) return DEFAULT_RPH_SPREADSHEET_ID;
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_\-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  if (!trimmed.includes('/') && !trimmed.includes('?')) {
    return trimmed;
  }
  return trimmed || DEFAULT_RPH_SPREADSHEET_ID;
}

export function getRphConfig(): RphConfig {
  try {
    const raw = localStorage.getItem(RPH_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Jika konfigurasi lama kosong atau mengarah ke mutkimyd, gunakan ID RPH yang ditanam
      const hasValidCustomId = parsed.spreadsheetIdOrUrl && 
        parsed.spreadsheetIdOrUrl.trim().length > 0 && 
        !parsed.spreadsheetIdOrUrl.includes(LEGACY_MUTKIMYD_ID);

      const resolvedUrlOrId = hasValidCustomId 
        ? parsed.spreadsheetIdOrUrl.trim() 
        : DEFAULT_RPH_SPREADSHEET_ID;

      return {
        spreadsheetIdOrUrl: resolvedUrlOrId,
        spreadsheetId: extractSpreadsheetId(resolvedUrlOrId),
        sheetResep: parsed.sheetResep || 'Resep',
        sheetMc: parsed.sheetMc || 'MC',
        sheetWod: parsed.sheetWod || 'WOD',
        lastSyncedAt: parsed.lastSyncedAt,
        resepCount: parsed.resepCount,
        mcCount: parsed.mcCount,
        wodCount: parsed.wodCount,
        lastError: parsed.lastError,
      };
    }
  } catch (e) {
    console.warn('Error reading RPH config:', e);
  }

  return {
    spreadsheetIdOrUrl: DEFAULT_RPH_SPREADSHEET_ID,
    spreadsheetId: DEFAULT_RPH_SPREADSHEET_ID,
    sheetResep: 'Resep',
    sheetMc: 'MC',
    sheetWod: 'WOD',
  };
}

export function saveRphConfig(config: Partial<RphConfig>): RphConfig {
  const current = getRphConfig();
  const newSpreadsheetId = config.spreadsheetIdOrUrl !== undefined 
    ? extractSpreadsheetId(config.spreadsheetIdOrUrl) 
    : current.spreadsheetId;
  
  const updated: RphConfig = {
    ...current,
    ...config,
    spreadsheetId: newSpreadsheetId,
  };

  try {
    localStorage.setItem(RPH_CONFIG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save RPH config to localStorage:', e);
  }

  return updated;
}

/**
 * Mengambil CSV dari Google Sheets via API backend proxy
 */
export async function fetchLiveSheetCsv(sheetName: string, customSpreadsheetId?: string): Promise<string> {
  const spId = customSpreadsheetId || getRphConfig().spreadsheetId || DEFAULT_RPH_SPREADSHEET_ID;
  if (!spId) {
    throw new Error('ID atau Link Spreadsheet RPH belum diisi. Masukkan URL spreadsheet Google Sheets RPH Anda.');
  }

  const url = `/api/sheets?id=${encodeURIComponent(spId)}&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Gagal mengambil sheet "${sheetName}"`);
  }

  const csv: string = data.csv || '';

  // Deteksi jika Google Sheets me-return sheet pertama MUTKIMYD (karena sheet yang diminta tidak ada)
  if (
    csv.includes('Laporan Stock Mutasi Kimia Dyeing') ||
    csv.includes('MUTKIMYD') ||
    csv.includes('KODE ENTRY')
  ) {
    if (['resep', 'mc', 'wod'].includes(sheetName.toLowerCase())) {
      throw new Error(
        `Sheet "${sheetName}" tidak ditemukan pada spreadsheet ini! Google Sheets mengembalikan lembar MUTKIMYD. Pastikan Anda memasukkan link spreadsheet "RPH" yang berisi sheet "Resep", "MC", dan "WOD", bukan spreadsheet MUTKIMYD.`
      );
    }
  }

  return csv;
}

export interface SyncRphResult {
  recipes: ResepDetail[];
  machines: MesinCelup[];
  workOrders: WorkOrderDyeing[];
  errors: { [key: string]: string };
}

/**
 * Mengambil data Resep dari Spreadsheet RPH sheet "Resep"
 */
export async function fetchLiveResepFromRph(
  customIdOrUrl?: string,
  customSheetName?: string
): Promise<ResepDetail[]> {
  const config = getRphConfig();
  const spId = customIdOrUrl ? extractSpreadsheetId(customIdOrUrl) : config.spreadsheetId;
  const sheet = customSheetName || config.sheetResep || 'Resep';

  const tryNames = Array.from(new Set([sheet, 'Resep', 'resep', 'RESEP', 'Recipe', 'sheet1']));
  let csv = '';
  let lastErr = '';

  for (const name of tryNames) {
    try {
      csv = await fetchLiveSheetCsv(name, spId);
      if (csv && csv.trim().length > 10) {
        const parsed = parseResepCsv(csv);
        if (parsed.resepList.length > 0) {
          await saveRecipesToStorage(parsed.resepList);
          saveRphConfig({ sheetResep: name, resepCount: parsed.resepList.length, lastSyncedAt: new Date().toISOString() });
          return parsed.resepList;
        }
      }
    } catch (e: any) {
      lastErr = e?.message || String(e);
    }
  }

  throw new Error(`Tidak ditemukan baris resep valid pada sheet "${sheet}". ${lastErr ? `(${lastErr})` : ''} Pastikan nama tab sesuai dan kolom memiliki: no_resep / kode_resep, warna, no_bng, mat_name, qty, uom_code.`);
}

/**
 * Mengambil data Mesin Celup dari Spreadsheet RPH sheet "MC"
 */
export async function fetchLiveMcFromRph(
  customIdOrUrl?: string,
  customSheetName?: string
): Promise<MesinCelup[]> {
  const config = getRphConfig();
  const spId = customIdOrUrl ? extractSpreadsheetId(customIdOrUrl) : config.spreadsheetId;
  const sheet = customSheetName || config.sheetMc || 'MC';

  const tryNames = Array.from(new Set([sheet, 'MC', 'mc', 'Mc', 'Mesin', 'MESIN', 'Machine']));
  let csv = '';
  let lastErr = '';

  for (const name of tryNames) {
    try {
      csv = await fetchLiveSheetCsv(name, spId);
      if (csv && csv.trim().length > 10) {
        const machines = parseMcCsv(csv);
        if (machines.length > 0) {
          await saveMcToStorage(machines);
          saveRphConfig({ sheetMc: name, mcCount: machines.length, lastSyncedAt: new Date().toISOString() });
          return machines;
        }
      }
    } catch (e: any) {
      lastErr = e?.message || String(e);
    }
  }

  throw new Error(`Tidak ditemukan data mesin pada sheet "${sheet}". ${lastErr ? `(${lastErr})` : ''} Pastikan kolom memiliki: no_mc / mesin, kapasitas_max_kg, liquor_ratio.`);
}

/**
 * Mengambil data Work Order Dyeing dari Spreadsheet RPH sheet "WOD"
 */
export async function fetchLiveWodFromRph(
  customIdOrUrl?: string,
  customSheetName?: string
): Promise<WorkOrderDyeing[]> {
  const config = getRphConfig();
  const spId = customIdOrUrl ? extractSpreadsheetId(customIdOrUrl) : config.spreadsheetId;
  const sheet = customSheetName || config.sheetWod || 'WOD';

  const tryNames = Array.from(new Set([sheet, 'WOD', 'wod', 'Wod', 'Jadwal', 'KIKC', 'kikc', 'Rencana', 'Sheet3']));
  let csv = '';
  let lastErr = '';

  for (const name of tryNames) {
    try {
      csv = await fetchLiveSheetCsv(name, spId);
      if (csv && csv.trim().length > 10) {
        const orders = parseWodCsv(csv);
        if (orders.length > 0) {
          await saveWodToStorage(orders);
          saveRphConfig({ sheetWod: name, wodCount: orders.length, lastSyncedAt: new Date().toISOString() });
          return orders;
        }
      }
    } catch (e: any) {
      lastErr = e?.message || String(e);
    }
  }

  throw new Error(`Tidak ditemukan data Work Order Dyeing pada sheet "${sheet}". ${lastErr ? `(${lastErr})` : ''} Pastikan kolom memiliki: nomor_kikc / kikc / no_wod, kode_resep / no_resep, berat_Benang / berat_bahan, volume_air, no_mc.`);
}

/**
 * Sinkronisasi lengkap 3 Sheet RPH ("Resep", "MC", "WOD") sekaligus
 */
export async function fetchLiveRphAllSheets(customIdOrUrl?: string): Promise<SyncRphResult> {
  const config = getRphConfig();
  const spId = customIdOrUrl ? extractSpreadsheetId(customIdOrUrl) : config.spreadsheetId;
  
  if (!spId) {
    throw new Error('Masukkan Link atau ID Spreadsheet Google Sheets "RPH" terlebih dahulu.');
  }

  const errors: { [key: string]: string } = {};
  let recipes: ResepDetail[] = [];
  let machines: MesinCelup[] = [];
  let workOrders: WorkOrderDyeing[] = [];

  // 1. Resep
  try {
    recipes = await fetchLiveResepFromRph(spId, config.sheetResep);
  } catch (e: any) {
    errors['Resep'] = e?.message || 'Gagal memuat sheet Resep';
  }

  // 2. MC
  try {
    machines = await fetchLiveMcFromRph(spId, config.sheetMc);
  } catch (e: any) {
    errors['MC'] = e?.message || 'Gagal memuat sheet MC';
  }

  // 3. WOD
  try {
    workOrders = await fetchLiveWodFromRph(spId, config.sheetWod);
  } catch (e: any) {
    errors['WOD'] = e?.message || 'Gagal memuat sheet WOD';
  }

  saveRphConfig({
    spreadsheetIdOrUrl: customIdOrUrl || config.spreadsheetIdOrUrl,
    spreadsheetId: spId,
    lastSyncedAt: new Date().toISOString(),
    resepCount: recipes.length,
    mcCount: machines.length,
    wodCount: workOrders.length,
    lastError: Object.keys(errors).length > 0 ? Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join('; ') : undefined,
  });

  return {
    recipes,
    machines,
    workOrders,
    errors,
  };
}

/**
 * Check if initial data can be fetched from RPH
 */
export async function checkAndFetchLiveResepSheet(): Promise<ResepDetail[] | null> {
  const cfg = getRphConfig();
  if (!cfg.spreadsheetId) return null;
  try {
    const list = await fetchLiveResepFromRph();
    if (list && list.length > 0) return list;
  } catch (e) {
    console.log('Notice: auto-sync RPH Resep skipped:', e);
  }
  return null;
}

/**
 * Mengambil jadwal rencana celup aktif (legacy MUTKIMYD fallback)
 */
export async function fetchLiveRencanaLots(): Promise<ProductionLot[]> {
  try {
    const csv = await fetchLiveSheetCsv('rencana', LEGACY_MUTKIMYD_ID);
    const lines = csv.split(/\r?\n/).map(r => r.split('","').map(c => c.replace(/^"|"$/g, '').trim()));
    const lots: ProductionLot[] = [];
    for (let i = 2; i <= 6; i++) {
      const r = lines[i];
      if (r && r[4]) {
        lots.push({
          lot_no: parseInt(r[3]) || (i - 1),
          warna: r[4],
          berat_Benang_kg: parseFloat(r[5]?.replace(',', '.')) || 0,
          mesin: r[6] || '-',
          no_resep: r[7] || '-',
          kikc: r[8] || '-',
          volume_air_liter: parseFloat(r[9]?.replace(/\./g, '').replace(',', '.')) || 0,
        });
      }
    }
    if (lots.length > 0) return lots;
  } catch (err) {
    console.warn('Gagal fetch live rencana:', err);
  }
  return sheetsData.activeLots as ProductionLot[];
}

/**
 * Mengambil order dan stok kebutuhan celup (legacy MUTKIMYD fallback)
 */
export async function fetchLiveOrders(): Promise<OrderRequirement[]> {
  try {
    const csv = await fetchLiveSheetCsv('order', LEGACY_MUTKIMYD_ID);
    const lines = csv.split(/\r?\n/).map(r => r.split('","').map(c => c.replace(/^"|"$/g, '').trim()));
    const orders: OrderRequirement[] = [];
    for (let i = 1; i < lines.length; i++) {
      const r = lines[i];
      if (r[0] && r[0] !== 'TOTAL') {
        orders.push({
          nama_bahan: r[0],
          rnc_celup_gram: parseFloat(r[1]?.replace(/\./g, '').replace(',', '.')) || 0,
          stock_gram: parseFloat(r[2]?.replace(/\./g, '').replace(',', '.')) || 0,
          rencana_celup_gram: parseFloat(r[3]?.replace(/\./g, '').replace(',', '.')) || 0,
          sisa_stock_gram: parseFloat(r[4]?.replace(/\./g, '').replace(',', '.')) || 0,
        });
      }
    }
    if (orders.length > 0) return orders;
  } catch (e) {
    console.warn('Gagal fetch live orders:', e);
  }
  return sheetsData.orders as OrderRequirement[];
}

const MUTKIMYD_ID_KEY = 'mutkimyd_spreadsheet_id';

export function getMutkimydSpreadsheetId(): string {
  try {
    return localStorage.getItem(MUTKIMYD_ID_KEY) || LEGACY_MUTKIMYD_ID;
  } catch (e) {
    return LEGACY_MUTKIMYD_ID;
  }
}

export function saveMutkimydSpreadsheetId(idOrUrl: string): string {
  const cleanId = extractSpreadsheetId(idOrUrl) || LEGACY_MUTKIMYD_ID;
  try {
    localStorage.setItem(MUTKIMYD_ID_KEY, cleanId);
  } catch (e) {
    console.warn('Failed to save MUTKIMYD spreadsheet id:', e);
  }
  return cleanId;
}

/**
 * Mengambil data Stok Kimia Dyeing dari sheet "STOK" spreadsheet MUTKIMYD
 */
export async function fetchLiveStokFromMutkimyd(customIdOrUrl?: string): Promise<StokKimiaItem[]> {
  const spId = customIdOrUrl ? extractSpreadsheetId(customIdOrUrl) : getMutkimydSpreadsheetId();
  const trySheets = ['STOK', 'stok', 'Stok', 'Stock', 'STOCK'];
  let lastErr = '';

  for (const sheetName of trySheets) {
    try {
      const csv = await fetchLiveSheetCsv(sheetName, spId);
      if (csv && csv.trim().length > 20) {
        const items = parseStokCsv(csv);
        if (items.length > 0) {
          try {
            localStorage.setItem('cached_stok_kimia_mutkimyd', JSON.stringify(items));
          } catch (e) {}
          return items;
        }
      }
    } catch (e: any) {
      lastErr = e?.message || String(e);
    }
  }

  // Fallback to cached or default authentic data
  try {
    const cached = localStorage.getItem('cached_stok_kimia_mutkimyd');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return (defaultStokData as unknown) as StokKimiaItem[];
}

