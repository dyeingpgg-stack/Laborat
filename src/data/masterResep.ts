/**
 * Master Dataset & CSV Engine Resep Pencelupan Warna Tekstil
 * Menggunakan data autentik dari Spreadsheet MUTKIMYD & spesifikasi PRD Resep.csv
 */

import { ResepDetail, ResepListItem, ResepStep, TahapProsesGroup, JenisProses } from '../types/resep';
import sheetsData from './sheetsData.json';
import { SAMPLE_RECIPES_RPH } from './sampleRphData';

const URUTAN_TAHAP: JenisProses[] = ['PRETREATMENT', 'PROCESSING', 'AFTER TREATMENT'];

/**
 * Parser CSV Resep.csv berkecepatan tinggi
 * Menerapkan spesifikasi PRD:
 * 1. Menangani header `drd.notes` -> catatan_proses
 * 2. Parsing format desimal koma Indonesia (0,75 -> 0.75)
 * 3. Filter status_resep == 'Aktif'
 * 4. Pengelompokan urutan baku: PRETREATMENT -> PROCESSING -> AFTER TREATMENT
 * 5. Deteksi baris header otomatis jika terdapat baris judul di baris awal
 */
export function parseResepCsv(csvText: string): {
  resepList: ResepDetail[];
  totalRows: number;
  totalResep: number;
  yarnTypes: string[];
  colorCodes: string[];
} {
  const rawLines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length <= 1) {
    return { resepList: [], totalRows: 0, totalResep: 0, yarnTypes: [], colorCodes: [] };
  }

  // Simple CSV split handling quotes and tabs
  const parseCsvRow = (line: string): string[] => {
    const res: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === ',' || c === ';' || c === '\t') && !inQuotes) {
        res.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    res.push(cur.trim());
    return res;
  };

  // Deteksi baris header terbaik
  let headerRowIdx = 0;
  let maxMatchedKeywords = 0;
  const targetKeywords = ['resep', 'no_resep', 'kode_resep', 'warna', 'benang', 'bng', 'mat_name', 'qty', 'dosis', 'uom', 'proses'];

  for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
    const parsedLine = parseCsvRow(rawLines[i]).map(c => c.toLowerCase().replace(/[^a-z0-9]/g, ''));
    let matched = 0;
    for (const kw of targetKeywords) {
      if (parsedLine.some(h => h.includes(kw))) matched++;
    }
    if (matched > maxMatchedKeywords) {
      maxMatchedKeywords = matched;
      headerRowIdx = i;
    }
  }

  const headerLine = rawLines[headerRowIdx];
  const headers = parseCsvRow(headerLine).map(h => h.toLowerCase().replace(/['"]+/g, '').trim());

  // Flexible column finder matching synonyms and normalized strings
  const findCol = (candidates: string[]): number => {
    for (const cand of candidates) {
      const normCand = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
      const exactIdx = headers.indexOf(cand.toLowerCase());
      if (exactIdx !== -1) return exactIdx;
      const normIdx = headers.findIndex(h => h.replace(/[^a-z0-9]/g, '') === normCand);
      if (normIdx !== -1) return normIdx;
    }
    return -1;
  };

  const colNoResep = findCol(['no_resep', 'noresep', 'no.resep', 'no resep', 'nomor resep', 'resep', 'recipe_no', 'no_rsp', 'kode_resep', 'kd_resep']);
  const colNoBng = findCol(['no_bng', 'nobng', 'no.bng', 'no bng', 'benang', 'jenis benang', 'jenis_benang', 'bng', 'Benang', 'material', 'yarn', 'jns_dan_no_bng']);
  const colWarna = findCol(['warna', 'color', 'kode warna', 'kd_warna', 'kode_warna', 'nama warna', 'shade', 'warna_benang']);
  const colTipeResep = findCol(['tipe_resep', 'tiperesep', 'tipe resep', 'tipe', 'type', 'kategori', 'jenis_resep']);
  const colJnsProses = findCol(['jns_proses', 'jnsproses', 'jns proses', 'jenis proses', 'jenis_proses', 'tahap', 'tahap proses', 'proses', 'process']);
  const colKetProsesDesc = findCol(['ket_proses_desc', 'ketprosesdesc', 'ket_proses', 'keterangan proses', 'keterangan', 'proses_desc', 'desc', 'kegiatan', 'deskripsi_proses']);
  const colMatCode = findCol(['mat_code', 'matcode', 'kode kimia', 'kode_kimia', 'kode bahan', 'kode_bahan', 'item code', 'kd_kimia', 'kd_bahan', 'kode', 'item_code']);
  const colMatName = findCol(['mat_name', 'matname', 'nama kimia', 'nama_kimia', 'nama bahan', 'nama_bahan', 'nama', 'chemical', 'item_name', 'deskripsi_bahan', 'bahan']);
  const colQty = findCol(['qty', 'dosis', 'konsentrasi', 'jumlah', 'quantity', 'takaran', 'kebutuhan']);
  const colUomCode = findCol(['uom_code', 'uomcode', 'satuan', 'uom', 'unit']);
  const colNotes = findCol(['catatan_proses', 'catatan proses', 'drd.notes', 'drd notes', 'notes', 'catatan', 'parameter', 'suhu_waktu', 'keterangan']);
  const colStatus = findCol(['status_resep', 'statusresep', 'status resep', 'status', 'stat']);

  const resepMap = new Map<string, {
    header: {
      no_resep: string;
      no_bng: string;
      warna: string;
      tipe_resep: string;
    };
    steps: ResepStep[];
  }>();

  let validRowCount = 0;
  const yarnSet = new Set<string>();
  const colorSet = new Set<string>();

  for (let i = headerRowIdx + 1; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    const row = parseCsvRow(line);
    const noResep = row[colNoResep]?.replace(/['"]+/g, '').trim();
    if (!noResep || noResep.toLowerCase() === 'total') continue;

    const status = colStatus !== -1 ? row[colStatus]?.replace(/['"]+/g, '').trim() : 'Aktif';
    if (status && status.toLowerCase() !== 'aktif') continue;

    validRowCount++;

    const noBng = (colNoBng !== -1 ? row[colNoBng] : '')?.replace(/['"]+/g, '').trim() || 'COTTON';
    const warna = (colWarna !== -1 ? row[colWarna] : '')?.replace(/['"]+/g, '').trim() || '-';
    const tipeResep = (colTipeResep !== -1 ? row[colTipeResep] : '')?.replace(/['"]+/g, '').trim() || 'REGULER';
    const jnsProsesRaw = (colJnsProses !== -1 ? row[colJnsProses] : '')?.replace(/['"]+/g, '').trim().toUpperCase();

    // Normalisasi jns_proses
    let jnsProses: JenisProses = 'PROCESSING';
    if (jnsProsesRaw.includes('PRE') || jnsProsesRaw.includes('SCORING') || jnsProsesRaw.includes('BLEACH') || jnsProsesRaw.includes('NETRAL')) {
      jnsProses = 'PRETREATMENT';
    } else if (jnsProsesRaw.includes('AFTER') || jnsProsesRaw.includes('FINISH') || jnsProsesRaw.includes('SOFT') || jnsProsesRaw.includes('WASH')) {
      jnsProses = 'AFTER TREATMENT';
    } else {
      jnsProses = 'PROCESSING';
    }

    const ketProsesDesc = (colKetProsesDesc !== -1 ? row[colKetProsesDesc] : '')?.replace(/['"]+/g, '').trim() || '-';
    const matCode = (colMatCode !== -1 ? row[colMatCode] : '')?.replace(/['"]+/g, '').trim() || '';
    const matName = (colMatName !== -1 ? row[colMatName] : '')?.replace(/['"]+/g, '').trim() || '-';
    
    // Parse format desimal koma Indonesia (mis. "0,75" -> 0.75)
    const rawQtyStr = (colQty !== -1 ? row[colQty] : '')?.replace(/['"]+/g, '').trim();
    const qty = parseFloat((rawQtyStr || '0').replace(',', '.')) || 0;
    const uomCode = (colUomCode !== -1 ? row[colUomCode] : '')?.replace(/['"]+/g, '').trim() || 'Gr/l';
    const notes = (colNotes !== -1 ? row[colNotes] : '')?.replace(/['"]+/g, '').trim() || '-';

    yarnSet.add(noBng);
    colorSet.add(warna);

    if (!resepMap.has(noResep)) {
      resepMap.set(noResep, {
        header: {
          no_resep: noResep,
          no_bng: noBng,
          warna: warna,
          tipe_resep: tipeResep,
        },
        steps: [],
      });
    }

    resepMap.get(noResep)!.steps.push({
      jns_proses: jnsProses,
      ket_proses_desc: ketProsesDesc,
      mat_code: matCode,
      mat_name: matName,
      qty: qty,
      uom_code: uomCode,
      catatan_proses: notes,
    });
  }

  // Format ke ResepDetail dengan grouping urutan baku
  const resepList: ResepDetail[] = [];
  for (const [, item] of resepMap.entries()) {
    const grouped: TahapProsesGroup[] = URUTAN_TAHAP.map(tahap => ({
      tahap: tahap,
      langkah: item.steps.filter(s => s.jns_proses === tahap),
    })).filter(g => g.langkah.length > 0);

    resepList.push({
      ...item.header,
      tahap_proses: grouped,
      total_bahan: item.steps.length,
    });
  }

  return {
    resepList,
    totalRows: validRowCount,
    totalResep: resepList.length,
    yarnTypes: Array.from(yarnSet).sort(),
    colorCodes: Array.from(colorSet).sort(),
  };
}

/**
 * Data Master Resep Awal:
 * Menggunakan dataset autentik dari Bon Bahan Kimia RPH (OO07CC13A003)
 * Siap ditambah/disinkronkan dengan live spreadsheet RPH (Sheet Resep).
 */
export const INITIAL_MASTER_RECIPES: ResepDetail[] = SAMPLE_RECIPES_RPH;

// Re-export real Google Sheets data
export { sheetsData };

