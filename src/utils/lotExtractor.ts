import { WorkOrderDyeing, ResepDetail } from '../types/resep';

/**
 * Ekstraksi kata kunci lot (KIKC / WOD) dari teks pertanyaan user
 * Mendukung pola:
 * - "PADA AHN26IH001 TERJADI BELANG..." -> "AHN26IH001"
 * - "Lot AHN26F002 kurang tua..." -> "AHN26F002"
 * - "KIKC ZZN26I104..." -> "ZZN26I104"
 */
export function extractLotKeyword(text: string, knownLots: WorkOrderDyeing[] = []): string | null {
  if (!text || !text.trim()) return null;
  const upper = text.toUpperCase();

  // 1. Cocokkan dengan daftar lot yang sudah ada di database WOD (Exact match)
  for (const w of knownLots) {
    const id = (w.kikc || w.no_wod || '').toUpperCase().trim();
    if (id && id.length >= 4) {
      // Pastikan sebagai kata terpisah atau ada di teks
      const regex = new RegExp(`\\b${id}\\b`, 'i');
      if (regex.test(upper) || upper.includes(id)) {
        return id;
      }
    }
  }

  // 2. Pola format lot industri sarung standar:
  // e.g. AHN26IH001, AHN26F001, AHN26H001, ZZN26I104, BNN25A001
  // 2-4 huruf kapital + 2 digit angka + 1-4 huruf/angka + 3 digit angka
  const regexLotStandard = /\b([A-Z]{2,4}\d{2}[A-Z0-9]{3,7})\b/i;
  const match1 = text.match(regexLotStandard);
  if (match1 && match1[1]) {
    return match1[1].toUpperCase();
  }

  // 3. Pola dengan prefix "LOT", "KIKC", "WOD", atau "BON"
  // e.g. "LOT AHN26IH001" atau "LOT 12345"
  const regexPrefix = /\b(?:LOT|KIKC|WOD|BON)\s*[:#\-]?\s*([A-Z0-9\-_]{4,15})\b/i;
  const match2 = text.match(regexPrefix);
  if (match2 && match2[1]) {
    return match2[1].toUpperCase();
  }

  return null;
}

/**
 * Mendapatkan atau menghasilkan data lengkap lot (Warna, Benang, Mesin, Qty kg, Resep)
 * Jika lot sudah ada di sheet WOD, ambil data aslinya.
 * Jika belum ada, lakukan matching cerdas berbasis prefix dan resep yang tersedia.
 */
export function resolveLotDetails(
  lotCode: string, 
  knownLots: WorkOrderDyeing[] = [], 
  recipes: ResepDetail[] = []
): WorkOrderDyeing {
  const upper = (lotCode || 'AHN26F001').toUpperCase().trim();
  
  // 1. Cek pencocokan eksak di knownLots
  const existing = knownLots.find(w => 
    (w.kikc && w.kikc.toUpperCase() === upper) || 
    (w.no_wod && w.no_wod.toUpperCase() === upper)
  );
  if (existing) {
    return existing;
  }

  // 2. Cek pencocokan parsial/prefix
  const partial = knownLots.find(w => {
    const id = (w.kikc || w.no_wod || '').toUpperCase();
    return id && (upper.includes(id) || (id.length >= 6 && upper.startsWith(id.slice(0, 5))));
  });

  // 3. Cari resep yang relevan berbasis kode resep atau prefix lot
  const prefix = upper.slice(0, 2);
  const matchingRecipe = (partial && recipes.find(r => r.no_resep === partial.no_resep))
    || recipes.find(r => r.no_resep?.toUpperCase().startsWith(prefix))
    || recipes.find(r => r.no_resep?.toUpperCase().includes('AH05AA04A003'))
    || recipes[0];

  const resolvedWarna = partial?.warna && partial.warna !== '-' ? partial.warna : (matchingRecipe?.warna || 'A.A.04.A');
  const resolvedBenang = (partial?.no_bng && partial.no_bng !== '-' && partial.no_bng.toLowerCase() !== 'null') 
    ? partial.no_bng 
    : (matchingRecipe?.no_bng || "TR Ne 30'S");
  const resolvedMc = (partial?.no_mc && partial.no_mc !== '-' && partial.no_mc.toLowerCase() !== 'null') 
    ? partial.no_mc 
    : 'A25';
  const resolvedBerat = partial?.berat_Benang_kg && partial.berat_Benang_kg > 0 ? partial.berat_Benang_kg : 24.0;
  const resolvedVol = partial?.volume_air_liter && partial.volume_air_liter > 0 ? partial.volume_air_liter : 250;

  return {
    kikc: upper,
    no_wod: upper,
    no_resep: partial?.no_resep || matchingRecipe?.no_resep || 'AH05AA04A003',
    warna: resolvedWarna,
    no_bng: resolvedBenang,
    no_mc: resolvedMc,
    berat_Benang_kg: resolvedBerat,
    volume_air_liter: resolvedVol,
    status: 'RENCANA',
  };
}
