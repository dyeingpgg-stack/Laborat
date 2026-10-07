/**
 * Resep Pencelupan & Komposisi Kimia Types
 * Berdasarkan SPEC PRD Resep Pencelupan Warna & Spreadsheet MUTKIMYD
 */

export type JenisProses = 'PRETREATMENT' | 'PROCESSING' | 'AFTER TREATMENT';

export type KetProsesDesc = 
  | 'Scoring' 
  | 'Celup R' 
  | 'Celup T' 
  | 'Washing/Cuci' 
  | 'Cuci R/C' 
  | 'Cuci Netralisir' 
  | 'Softener/Pelicin' 
  | 'Oksidasi'
  | string;

export type UomCode = '%' | 'Gr/I' | 'Gr/l' | 'gram' | 'kg' | string;

export interface ResepStep {
  jns_proses: JenisProses;
  ket_proses_desc: KetProsesDesc;
  mat_code: string;
  mat_name: string;
  qty: number; // Parsed float from Indonesian string (e.g. 0,75 -> 0.75)
  uom_code: UomCode;
  catatan_proses: string; // dari drd.notes (mis. 60*C-60', PELARUTAN 50*C)
  prod_code_ref?: string;
  status_resep?: string;
  unit?: string;
}

export interface TahapProsesGroup {
  tahap: JenisProses;
  langkah: ResepStep[];
}

export interface ResepHeader {
  no_resep: string;
  no_bng: string; // Jenis benang/Benang (43 varian)
  warna: string; // Kode warna format X.X.NN.X (mis. C.C.10.P, C.C.13.A)
  tipe_resep: 'REGULER' | 'CORAK' | string;
}

export interface ResepDetail extends ResepHeader {
  tahap_proses: TahapProsesGroup[];
  total_bahan: number;
}

export interface ResepListItem extends ResepHeader {
  total_bahan?: number;
  tahap_count?: number;
}

// Perhitungan Komposisi Kimia (Batch Calculator)
export interface ChemicalCalculationItem {
  mat_code: string;
  mat_name: string;
  jns_proses: JenisProses;
  ket_proses_desc: string;
  dosis_qty: number;
  dosis_uom: UomCode;
  basis: 'owf' | 'liquor'; // 'owf' (% on weight of fabric) atau 'liquor' (Gr/l volume air)
  kebutuhan_gram: number;
  kebutuhan_kg: number;
  catatan_proses: string;
  // Warehouse check
  stok_tersedia_gkd_kg?: number;
  status_stok?: 'aman' | 'menipis' | 'kurang';
}

export interface BatchCalculationResult {
  no_resep: string;
  warna: string;
  no_bng: string;
  tipe_resep: string;
  berat_Benang_kg: number;
  volume_air_liter: number;
  liquor_ratio: string;
  items: ChemicalCalculationItem[];
  total_kimia_gram: number;
  total_kimia_kg: number;
  total_dyestuff_gram: number;
  total_auxiliary_gram: number;
  ringkasan_per_tahap: {
    tahap: JenisProses;
    total_gram: number;
    total_kg: number;
    item_count: number;
  }[];
}

// Master Mesin Celup dari sheet 'MC' (Spreadsheet RPH)
export interface MesinCelup {
  no_mc: string; // e.g. "MC-01", "MC 05", "THIES 1"
  nama_mesin?: string;
  tipe_mesin?: string; // e.g. "Jet Dyeing", "Atmospheric Winch", "High Temp", "Yarn Dyeing"
  kapasitas_min_kg: number; // e.g. 50, 250
  kapasitas_max_kg: number; // e.g. 300, 600
  liquor_ratio_min: number; // e.g. 6 (1:6)
  liquor_ratio_max: number; // e.g. 10 (1:10)
  volume_min_liter?: number;
  volume_max_liter?: number;
  status: 'SIAP' | 'JALAN' | 'MAINTENANCE' | string;
  keterangan?: string;
}

// Work Order Dyeing (Kartu Kerja / Rencana Lot Celup) dari sheet 'WOD' (Spreadsheet RPH)
export interface WorkOrderDyeing {
  no_wod: string; // e.g. "OON26I027", "WOD-2026-001"
  kikc: string; // Nomor KIKC (e.g. "OON26I027")
  nomor_bon?: string; // Nomor Bon (e.g. "DBB/2609/00208")
  tanggal?: string; // Tanggal Bon (e.g. "07-09-2026")
  no_resep: string; // Referensi no_resep di sheet "Resep" (e.g. "OO07CC13A003")
  warna: string; // Warna Benang (e.g. "C.C.13.A")
  no_bng: string; // Jns & No Bng (e.g. "TM Ne 80/2")
  no_mc: string; // Nomor Mesin celup (e.g. "THIES A13", "A13")
  berat_Benang_kg: number; // Berat Bahan (kg)
  volume_air_liter: number; // Volume Air (L)
  liquor_ratio?: string; // Rasio Air : Bahan (e.g. "1:10.5")
  customer?: string;
  jns_cone?: string; // e.g. "CHESE"
  status: 'RENCANA' | 'PROSES' | 'SELESAI' | 'BATAL' | string;
  catatan?: string;
}

// Master Kamus Kimia dari sheet 'kamus'
export interface KamusKimiaItem {
  kode_entry: string;
  kode_kimia: string;
  nama: string;
  jenis: string;
  suplier: string;
}

// Rencana Lot Aktif dari sheet 'rencana'
export interface ProductionLot {
  lot_no: number;
  warna: string;
  berat_Benang_kg: number;
  mesin: string;
  no_resep: string;
  kikc: string;
  volume_air_liter: number;
}

// Order requirement dari sheet 'order'
export interface OrderRequirement {
  nama_bahan: string;
  rnc_celup_gram: number;
  stock_gram: number;
  rencana_celup_gram: number;
  sisa_stock_gram: number;
}

// Warehouse Inventory dari sheet 'GKD'
export interface GkdInventoryItem {
  item_code: string;
  item_desc: string;
  qoh1: string;
  qoh2: string;
  booking: string;
  afs1: string;
  afs2: string;
  nama: string;
}

// Master Posisi Stok Kimia dari sheet 'STOK' (Spreadsheet MUTKIMYD)
export interface StokKimiaItem {
  no: number;
  nama_item: string;
  stok_gkd_kg: number;
  booking_kg: number;
  sisa_stok_kg: number; // GKD - BOOKING
  stok_gki_kg: number;
  total_stok_kg: number; // SISA STOK + GKI
  avd_buff: number;
  doh: number; // days
  status_stok: 'AMAN' | 'ORDER_SEKARANG' | 'KOSONG' | string;
  booking_indikator: string;
  doh_gkd?: number;
}

// Multi-Model AI Analysis Types (Request: Fitur "Analisis Cerdas AI (Multi-Model)")
// Sumber AI: Gemini, OpenAI (ChatGPT), dan Claude sebagai asisten profesional pakar tekstil pabrik sarung
export type AiProviderId = 'gemini' | 'openai' | 'claude' | 'all_three';

export type AiModelId = 'gemini-3.8-flash' | 'gpt-4o' | 'claude-3-5-sonnet' | 'trio-all';

export type AnalysisTarget = 'cross_file' | 'resep' | 'wod' | 'mc' | 'stok' | 'winding' | 'custom';

export type AnalysisType = 'audit_dosis' | 'mesin_kapasitas' | 'stok_defisit' | 'winding_density' | 'cacat_belang_sarung' | 'k3_optimasi' | 'custom';

export interface MultiModelAnalysisRequest {
  provider: AiProviderId;
  target: AnalysisTarget;
  analysisType: AnalysisType;
  selectedWodLot?: string; // KIKC atau no_wod spesifik yang dipilih untuk pipeline alur WOD -> Resep -> AI
  customPrompt?: string;
  customFileText?: string;
  customFileName?: string;
}

export interface MultiModelAnalysisResult {
  markdown: string;
  summary: string;
  providerUsed: AiProviderId;
  modelUsed: string;
  timestamp: string;
  trioResults?: {
    gemini?: string;
    openai?: string;
    claude?: string;
  };
}
