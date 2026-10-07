import Papa from 'papaparse';
import { MesinCelup, WorkOrderDyeing, StokKimiaItem } from '../types/resep';
import { INITIAL_MASTER_RECIPES } from './masterResep';

/**
 * Normalisasi header CSV menjadi lowercase dan clean
 */
function normalizeHeader(h: string): string {
  return (h || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Parsing angka dari format Indonesia (1.250,50 atau 0,75) atau standar (1250.50)
 */
export function parseNum(val: any, defaultVal = 0): number {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null') return defaultVal;
  
  // Format 1.500,50 -> 1500.50
  if (str.includes(',') && str.includes('.')) {
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? defaultVal : n;
  }
  // Format 1500,50 -> 1500.50
  if (str.includes(',')) {
    const n = parseFloat(str.replace(',', '.'));
    return isNaN(n) ? defaultVal : n;
  }
  const n = parseFloat(str);
  return isNaN(n) ? defaultVal : n;
}

/**
 * Deteksi baris header terbaik dalam CSV 2D array
 */
function findHeaderRowIndex(rows: string[][], targetKeywords: string[]): number {
  let bestIdx = 0;
  let bestScore = 0;

  const maxScan = Math.min(rows.length, 15);
  for (let i = 0; i < maxScan; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const joined = row.map(c => normalizeHeader(String(c))).join(' ');
    
    let score = 0;
    for (const kw of targetKeywords) {
      if (joined.includes(kw)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestScore >= 1 ? bestIdx : 0;
}

/**
 * Ambil nilai dari row object berdasarkan kumpulan calon key
 */
function getRowValue(row: Record<string, any>, candidates: string[]): any {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
    // Cek versi normalized
    const normKey = normalizeHeader(key);
    if (row[normKey] !== undefined && row[normKey] !== null && String(row[normKey]).trim() !== '') {
      return row[normKey];
    }
  }
  return undefined;
}

/**
 * Ambil nilai dari row object dengan dukungan kandidat langsung dan pencocokan fuzzy (substring aman)
 */
function getFlexibleRowValue(
  row: Record<string, any>, 
  candidates: string[], 
  fuzzyIncludes?: string[], 
  fuzzyExcludes?: string[]
): any {
  // 1. Cek calon key eksak / normalisasi
  const val = getRowValue(row, candidates);
  if (val !== undefined && val !== null && String(val).trim() !== '') {
    return val;
  }

  // 2. Pencocokan fuzzy pada seluruh header kolom jika belum ditemukan
  if (fuzzyIncludes && fuzzyIncludes.length > 0) {
    const allKeys = Object.keys(row);
    for (const k of allKeys) {
      const kNorm = normalizeHeader(k);
      const cellVal = row[k];
      if (cellVal === undefined || cellVal === null || String(cellVal).trim() === '') continue;

      const matchesInc = fuzzyIncludes.some(inc => {
        const normInc = normalizeHeader(inc);
        return kNorm === normInc || kNorm.includes(normInc);
      });

      if (matchesInc) {
        if (fuzzyExcludes && fuzzyExcludes.some(exc => kNorm.includes(normalizeHeader(exc)))) {
          continue;
        }
        return cellVal;
      }
    }
  }

  return undefined;
}

/**
 * Parse Sheet "MC" (Mesin Celup)
 */
export function parseMcCsv(csvText: string): MesinCelup[] {
  if (!csvText || !csvText.trim()) return [];

  const rawParsed = Papa.parse<string[]>(csvText.trim(), {
    skipEmptyLines: 'greedy',
  });

  if (!rawParsed.data || rawParsed.data.length === 0) return [];

  const headerIdx = findHeaderRowIndex(rawParsed.data, [
    'mc', 'mesin', 'kapasitas', 'kap', 'rasio', 'ratio', 'volume', 'status', 'tipe', 'no_mc'
  ]);

  const rawHeaders = rawParsed.data[headerIdx].map(h => normalizeHeader(h));
  const dataRows = rawParsed.data.slice(headerIdx + 1);

  const results: MesinCelup[] = [];

  for (const rawRow of dataRows) {
    if (!rawRow || rawRow.length === 0) continue;

    const row: Record<string, any> = {};
    rawHeaders.forEach((h, idx) => {
      row[h] = rawRow[idx] !== undefined ? rawRow[idx] : '';
    });

    // Cari key untuk kode mesin
    const noMc = getRowValue(row, [
      'no_mc', 'nomor_mesin', 'no_mesin', 'kode_mc', 'mesin', 'mc', 'kode', 'nama_mesin', 'machine'
    ]);

    if (!noMc || String(noMc).trim().length === 0 || String(noMc).toLowerCase() === 'total') {
      continue;
    }

    // Kapasitas
    const kapMax = parseNum(
      getRowValue(row, [
        'kapasitas_max_kg', 'kapasitas_max', 'kap_max', 'kapasitas_kg', 'kapasitas', 'cap_kg', 'kap_kg', 'max_kg'
      ]),
      150
    );
    const kapMin = parseNum(
      getRowValue(row, [
        'kapasitas_min_kg', 'kapasitas_min', 'kap_min', 'min_kg'
      ]),
      Math.round(kapMax * 0.4)
    );

    // Liquor Ratio
    let ratioMin = parseNum(getRowValue(row, ['liquor_ratio_min', 'rasio_min', 'lr_min']), 8);
    let ratioMax = parseNum(getRowValue(row, ['liquor_ratio_max', 'rasio_max', 'lr_max', 'rasio', 'liquor_ratio', 'lr']), 12);
    
    // Jika format rasio adalah string seperti "1:8" atau "1:8-1:12"
    const rawRatio = String(getRowValue(row, ['rasio', 'liquor_ratio', 'lr', 'ratio']) || '');
    if (rawRatio.includes(':')) {
      const parts = rawRatio.split(/[-~]/);
      const firstNum = parseNum(parts[0]?.split(':')[1]);
      if (firstNum > 0) ratioMin = firstNum;
      if (parts[1]) {
        const secNum = parseNum(parts[1]?.split(':')[1]);
        if (secNum > 0) ratioMax = secNum;
      } else {
        ratioMax = ratioMin;
      }
    }

    // Volume tangki
    const volMax = parseNum(
      getRowValue(row, ['volume_max_liter', 'volume_max', 'volume_air_liter', 'vol_max', 'volume_l', 'volume', 'max_liter']),
      Math.round(kapMax * ratioMax)
    );
    const volMin = parseNum(
      getRowValue(row, ['volume_min_liter', 'volume_min', 'vol_min', 'min_liter']),
      Math.round(kapMin * ratioMin)
    );

    const tipe = getRowValue(row, ['tipe_mesin', 'tipe', 'jenis_mesin', 'type', 'kategori']) || 'High Temp Yarn Package Dyeing';
    const namaMesin = getRowValue(row, ['nama_mesin', 'nama', 'deskripsi', 'model']);
    const statusRaw = String(getRowValue(row, ['status', 'stat']) || 'SIAP').toUpperCase().trim();
    const status = statusRaw.includes('JALAN') || statusRaw.includes('PROSES')
      ? 'JALAN'
      : statusRaw.includes('RUSAK') || statusRaw.includes('MAINTENANCE') || statusRaw.includes('OFF')
      ? 'MAINTENANCE'
      : 'SIAP';

    results.push({
      no_mc: String(noMc).trim(),
      nama_mesin: namaMesin ? String(namaMesin).trim() : undefined,
      tipe_mesin: tipe,
      kapasitas_min_kg: kapMin,
      kapasitas_max_kg: kapMax,
      liquor_ratio_min: ratioMin,
      liquor_ratio_max: ratioMax,
      volume_min_liter: volMin,
      volume_max_liter: volMax,
      status,
      keterangan: getRowValue(row, ['keterangan', 'catatan', 'ket']),
    });
  }

  return results;
}

/**
 * Parse Sheet "WOD" (Work Order Dyeing / Kartu Kerja Celup / KIKC)
 * Mendukung pembacaan KIKC yang mereferensikan no_resep
 */
export function parseWodCsv(csvText: string): WorkOrderDyeing[] {
  if (!csvText || !csvText.trim()) return [];

  const rawParsed = Papa.parse<string[]>(csvText.trim(), {
    skipEmptyLines: 'greedy',
  });

  if (!rawParsed.data || rawParsed.data.length === 0) return [];

  // Cari index baris header dengan mencocokkan kata kunci khas WOD & KIKC
  const headerIdx = findHeaderRowIndex(rawParsed.data, [
    'kikc', 'nomor_kikc', 'no_kikc', 'kikc_no', 'wod', 'no_wod', 'resep', 'kode_resep', 'warna', 'benang', 'bng', 'mesin', 'mc', 'berat', 'volume', 'air', 'lot', 'bon'
  ]);

  const rawHeaders = rawParsed.data[headerIdx].map(h => normalizeHeader(h));
  const dataRows = rawParsed.data.slice(headerIdx + 1);

  const results: WorkOrderDyeing[] = [];

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const rawRow = dataRows[rowIndex];
    if (!rawRow || rawRow.length === 0) continue;

    const row: Record<string, any> = {};
    rawHeaders.forEach((h, idx) => {
      row[h] = rawRow[idx] !== undefined ? rawRow[idx] : '';
    });

    // 1. Nomor KIKC / WOD (Prioritas KIKC sesuai instruksi user)
    const kikcVal = getRowValue(row, [
      'kikc', 'nomor_kikc', 'no_kikc', 'kikc_no', 'kikc_nomor',
      'no_wod', 'wod', 'no_lot', 'lot_no', 'lot',
      'nomor_bon', 'no_bon', 'bon',
      'no_order', 'order_no'
    ]);

    // 2. Kode Resep (Mereferensi ke no_resep pada sheet "Resep")
    const noResepVal = getRowValue(row, [
      'kode_resep', 'no_resep', 'resep', 'nomor_resep', 'kd_resep', 'recipe_no', 'recipe'
    ]);

    // Jika baris kosong atau baris "Total", lewati
    const identifier = kikcVal || noResepVal;
    if (!identifier || String(identifier).trim().length === 0 || String(identifier).toLowerCase() === 'total') {
      continue;
    }

    const kikcClean = kikcVal ? String(kikcVal).trim() : `KIKC-${rowIndex + 1}`;
    const noResepClean = noResepVal ? String(noResepVal).trim() : '-';

    // 3. Warna & Benang
    const warna = String(
      getFlexibleRowValue(
        row, 
        ['warna_benang', 'warna', 'color', 'shade', 'kd_warna', 'kode_warna', 'nama_warna'],
        ['warna', 'shade', 'color'],
        ['kode_resep', 'no_resep']
      ) || '-'
    ).trim();

    let noBng = String(
      getFlexibleRowValue(
        row, 
        [
          'no_benang', 'nomor_benang', 'no_bng', 'nomor_bng', 'nobng', 'nobenang',
          'jns_no_bng', 'jns_bng', 'jenis_no_benang', 'jenis_benang', 'jns_benang',
          'jns_dan_no_bng', 'jenis_dan_no_benang', 'benang', 'bng', 'material', 'yarn',
          'yarn_no', 'yarn_count', 'count', 'ne_benang', 'item_benang', 'nama_benang', 'bahan'
        ],
        ['benang', 'bng', 'yarn', 'material'],
        ['berat', 'qty', 'kg', 'warna', 'color', 'shade', 'resep', 'recipe', 'kikc', 'bon']
      ) || '-'
    ).trim();

    // Fallback otomatis: jika benang kosong atau "-", cocokkan dari master resep jika ada
    if ((!noBng || noBng === '-' || noBng.toLowerCase() === 'null') && noResepClean !== '-') {
      const matchRecipe = INITIAL_MASTER_RECIPES.find(r => r.no_resep === noResepClean);
      if (matchRecipe && matchRecipe.no_bng) {
        noBng = matchRecipe.no_bng;
      }
    }

    // 4. Nomor Mesin (MC / Mesin Celup)
    const noMc = String(
      getFlexibleRowValue(
        row, 
        [
          'no_m_c', 'm_c', 'no_mc', 'mc', 'nomor_mc', 'mc_no', 'm_c_no',
          'no_mesin', 'nomor_mesin', 'mesin', 'mesin_celup', 'no_mesin_celup',
          'kode_mc', 'kd_mc', 'kode_mesin', 'kd_mesin',
          'machine', 'machine_no', 'no_machine',
          'bejana', 'no_bejana', 'vessel', 'no_vessel', 'pot', 'no_pot', 'id_mesin'
        ],
        ['mesin', 'mc', 'm_c', 'machine', 'bejana', 'vessel', 'pot'],
        ['kapasitas', 'volume', 'rasio', 'ratio', 'berat', 'kg', 'min', 'max', 'air', 'status']
      ) || '-'
    ).trim();

    // 5. Berat Bahan (kg)
    const berat = parseNum(
      getRowValue(row, [
        'berat_bahan', 'berat_Benang_kg', 'berat_Benang', 'berat_kg', 'berat', 'qty_kg', 'kg', 'qty'
      ]),
      0
    );

    // 6. Volume Air (L)
    let volAir = parseNum(
      getRowValue(row, [
        'volume_air', 'volume_air_liter', 'vol_air', 'vol_air_liter', 'volume_l', 'volume', 'liter', 'vol'
      ]),
      0
    );

    // Hitung volume jika rasio diberikan (misal 1:10.5 atau 1:8)
    const rawRatio = String(getRowValue(row, ['liquor_ratio', 'rasio', 'ratio', 'lr']) || '');
    if (volAir === 0 && berat > 0) {
      if (rawRatio.includes(':')) {
        const rVal = parseNum(rawRatio.split(':')[1], 10);
        volAir = Math.round(berat * rVal);
      } else {
        volAir = Math.round(berat * 10); // Default 1:10
      }
    }

    const calculatedRatio = berat > 0 && volAir > 0 
      ? `1:${(volAir / berat).toFixed(1)}` 
      : rawRatio || '1:10';

    // 7. Status & Metadata tambahan
    const statusRaw = String(getRowValue(row, ['status', 'stat']) || 'RENCANA').toUpperCase().trim();
    const status = statusRaw.includes('SELESAI') || statusRaw.includes('DONE')
      ? 'SELESAI'
      : statusRaw.includes('PROSES') || statusRaw.includes('CELUP') || statusRaw.includes('RUNNING')
      ? 'PROSES'
      : statusRaw.includes('BATAL')
      ? 'BATAL'
      : 'RENCANA';

    const tglBon = getRowValue(row, ['tgl_bon', 'tanggal', 'tgl', 'date']);
    const noBon = getRowValue(row, ['nomor_bon', 'no_bon', 'bon']);
    const customer = getRowValue(row, ['customer', 'pelanggan', 'cust']);
    const jnsCone = getRowValue(row, ['jns_cone', 'jenis_cone', 'cone']);
    const catatan = getRowValue(row, ['catatan', 'keterangan', 'ket', 'notes']);

    results.push({
      no_wod: kikcClean,
      kikc: kikcClean,
      nomor_bon: noBon ? String(noBon).trim() : undefined,
      tanggal: tglBon ? String(tglBon).trim() : undefined,
      no_resep: noResepClean,
      warna,
      no_bng: noBng,
      no_mc: noMc,
      berat_Benang_kg: berat,
      volume_air_liter: volAir,
      liquor_ratio: calculatedRatio,
      customer: customer ? String(customer).trim() : undefined,
      jns_cone: jnsCone ? String(jnsCone).trim() : undefined,
      status,
      catatan: catatan ? String(catatan).trim() : undefined,
    });
  }

  return results;
}

/**
 * Parsing data posisi Stok Kimia dari sheet 'STOK' (Spreadsheet MUTKIMYD)
 */
export function parseStokCsv(csvText: string): StokKimiaItem[] {
  if (!csvText || !csvText.trim()) return [];

  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  const rows = parsed.data;
  if (!rows || rows.length === 0) return [];

  const headerIdx = findHeaderRowIndex(rows, ['stok', 'gkd', 'booking', 'gki', 'doh', 'nama', 'tersedia']);
  const rawHeaders = rows[headerIdx] || [];
  const normalizedHeaders = rawHeaders.map(h => normalizeHeader(String(h)));

  const results: StokKimiaItem[] = [];
  let itemCounter = 1;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const rawRow = rows[i];
    if (!rawRow || rawRow.length === 0) continue;

    const row: Record<string, any> = {};
    rawRow.forEach((val, colIdx) => {
      const colName = normalizedHeaders[colIdx] || `col_${colIdx}`;
      row[colName] = val;
    });

    // Nama Kimia: col 0 or 'nama', 'stok_tersedia_di_gkd', 'item', 'nama_bahan'
    const nameVal = getRowValue(row, [
      'stok_tersedia_di_gkd',
      'nama',
      'nama_bahan',
      'item',
      'item_kimia',
      'kimia',
      'nama_item'
    ]) || rawRow[0];

    const namaClean = String(nameVal || '').trim();
    if (!namaClean || namaClean.toUpperCase() === 'TOTAL' || namaClean.startsWith('===') || namaClean.toLowerCase().includes('laporan stock')) {
      continue;
    }

    // Stok Riil GKD
    const gkdVal = getRowValue(row, ['kg', 'stok_gkd', 'stok_riil_gkd', 'qoh', 'gkd']) || rawRow[1];
    const stokGkd = parseNum(gkdVal);

    // Booking Kimia ERP
    const bookingVal = getRowValue(row, ['booking_kimia_di_erp_kg', 'booking', 'booking_kg', 'erp_booking']) || rawRow[2];
    const booking = parseNum(bookingVal);

    // Sisa Stok (GKD - Booking)
    const sisaVal = getRowValue(row, ['stok_gkd_dikurangi_booking_erp', 'sisa_stok', 'sisa_stok_gkd', 'afs']) || rawRow[3];
    const sisaStok = sisaVal !== undefined && sisaVal !== '' ? parseNum(sisaVal) : Math.max(0, stokGkd - booking);

    // Stok GKI
    const gkiVal = getRowValue(row, ['stok_gki_kg', 'stok_gki', 'gki']) || rawRow[4];
    const stokGki = parseNum(gkiVal);

    // Total (GKD + GKI)
    const totalVal = getRowValue(row, ['sisa_stok_gkd_gki', 'total', 'total_stok', 'total_gkd_gki']) || rawRow[5];
    const totalStok = totalVal !== undefined && totalVal !== '' ? parseNum(totalVal) : sisaStok + stokGki;

    // AVD + BUFF
    const avdVal = getRowValue(row, ['avd_buff_gram', 'avd_buff', 'avd', 'buff']) || rawRow[6];
    const avdBuff = parseNum(avdVal);

    // DoH (+GKI)
    const dohVal = getRowValue(row, ['doh_gki', 'doh', 'ketahanan_hari', 'doh_hari']) || rawRow[7];
    const doh = dohVal !== undefined && dohVal !== '' 
      ? parseNum(dohVal) 
      : (avdBuff > 0 ? Math.min(365, Math.round(totalStok / avdBuff)) : 0);

    // Status Stok & Indikator
    const statusVal = String(getRowValue(row, ['status_stok_gkd_gki', 'status_stok', 'status']) || rawRow[8] || '').trim();
    const indicatorVal = String(getRowValue(row, ['booking_indikator', 'indikator', 'booking_status']) || rawRow[9] || '').trim();
    const dohGkdVal = getRowValue(row, ['doh_gkd', 'dohgkd']) || rawRow[10];

    let finalStatus = 'AMAN';
    if (statusVal.includes('ORDER') || statusVal.includes('SEKARANG') || (doh > 0 && doh <= 7)) {
      finalStatus = 'ORDER_SEKARANG';
    } else if (sisaStok <= 0) {
      finalStatus = 'KOSONG';
    }

    results.push({
      no: itemCounter++,
      nama_item: namaClean,
      stok_gkd_kg: stokGkd,
      booking_kg: booking,
      sisa_stok_kg: sisaStok,
      stok_gki_kg: stokGki,
      total_stok_kg: totalStok,
      avd_buff: avdBuff,
      doh: doh,
      status_stok: finalStatus,
      booking_indikator: indicatorVal,
      doh_gkd: dohGkdVal !== undefined ? parseNum(dohGkdVal) : undefined,
    });
  }

  return results;
}
