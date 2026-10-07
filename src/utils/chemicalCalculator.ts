/**
 * Logika Perhitungan Komposisi Kimia Dyeing Tekstil
 * Mengintegrasikan dataset resep, parameter proses, dan stok inventaris gudang GKD
 */

import { ResepDetail, ResepStep, BatchCalculationResult, ChemicalCalculationItem, JenisProses } from '../types/resep';
import sheetsData from '../data/sheetsData.json';

export function calculateBatchChemicals(
  resep: ResepDetail,
  beratBenangKg: number,
  volumeAirLiter: number
): BatchCalculationResult {
  const safeBerat = Math.max(0.1, Number(beratBenangKg) || 1);
  const safeVolume = Math.max(1, Number(volumeAirLiter) || 10);
  const liquorRatio = `1:${(safeVolume / safeBerat).toFixed(1)}`;

  // Ambil data stok gudang GKD dari sheetsData jika tersedia
  const gkdMap = new Map<string, number>();
  if (sheetsData && sheetsData.gkdStock) {
    for (const item of sheetsData.gkdStock) {
      // Parse AFS 1 (angka Indonesia dengan titik ribuan dan koma desimal)
      const rawAfs = (item.afs1 || item.qoh1 || '0').replace(/\./g, '').replace(',', '.');
      const stockKg = parseFloat(rawAfs) || 0;
      if (item.nama) gkdMap.set(item.nama.toUpperCase().trim(), stockKg);
      if (item.item_desc) gkdMap.set(item.item_desc.toUpperCase().trim(), stockKg);
      if (item.item_code) gkdMap.set(item.item_code.toUpperCase().trim(), stockKg);
    }
  }

  // Flatten semua langkah dari resep
  const allSteps: ResepStep[] = [];
  for (const group of resep.tahap_proses) {
    for (const step of group.langkah) {
      allSteps.push(step);
    }
  }

  const items: ChemicalCalculationItem[] = [];
  let totalKimiaGram = 0;
  let totalDyestuffGram = 0;
  let totalAuxiliaryGram = 0;

  for (const step of allSteps) {
    const isOwf = step.uom_code === '%';
    let kebutuhanGram = 0;

    if (isOwf) {
      // Basis % On Weight of Fabric:
      // Kebutuhan (gram) = (Dosis % / 100) * (Berat Benang kg * 1000)
      //                  = Dosis % * Berat Benang kg * 10
      kebutuhanGram = step.qty * safeBerat * 10;
      totalDyestuffGram += kebutuhanGram;
    } else {
      // Basis Gr/l (Gram per Liter) atau Gr/I volume larutan:
      // Kebutuhan (gram) = Dosis (Gr/l) * Volume Air (Liter)
      kebutuhanGram = step.qty * safeVolume;
      totalAuxiliaryGram += kebutuhanGram;
    }

    totalKimiaGram += kebutuhanGram;
    const kebutuhanKg = kebutuhanGram / 1000;

    // Cari stok tersedia di GKD
    const lookupKey1 = step.mat_name.toUpperCase().trim();
    const lookupKey2 = step.mat_code.toUpperCase().trim();
    const stokTersediaKg = gkdMap.get(lookupKey1) ?? gkdMap.get(lookupKey2) ?? 100; // default safe fallback jika belum sinkron

    let statusStok: 'aman' | 'menipis' | 'kurang' = 'aman';
    if (stokTersediaKg <= 0 || kebutuhanKg > stokTersediaKg) {
      statusStok = 'kurang';
    } else if (kebutuhanKg > stokTersediaKg * 0.7) {
      statusStok = 'menipis';
    }

    items.push({
      mat_code: step.mat_code,
      mat_name: step.mat_name,
      jns_proses: step.jns_proses,
      ket_proses_desc: step.ket_proses_desc,
      dosis_qty: step.qty,
      dosis_uom: step.uom_code,
      basis: isOwf ? 'owf' : 'liquor',
      kebutuhan_gram: Math.round(kebutuhanGram * 100) / 100,
      kebutuhan_kg: Math.round(kebutuhanKg * 1000) / 1000,
      catatan_proses: step.catatan_proses,
      stok_tersedia_gkd_kg: Math.round(stokTersediaKg * 100) / 100,
      status_stok: statusStok,
    });
  }

  // Ringkasan per tahap proses
  const ringkasanPerTahap: BatchCalculationResult['ringkasan_per_tahap'] = (
    ['PRETREATMENT', 'PROCESSING', 'AFTER TREATMENT'] as JenisProses[]
  ).map(tahap => {
    const tahapItems = items.filter(i => i.jns_proses === tahap);
    const totalGram = tahapItems.reduce((acc, cur) => acc + cur.kebutuhan_gram, 0);
    return {
      tahap,
      total_gram: Math.round(totalGram * 100) / 100,
      total_kg: Math.round((totalGram / 1000) * 1000) / 1000,
      item_count: tahapItems.length,
    };
  });

  return {
    no_resep: resep.no_resep,
    warna: resep.warna,
    no_bng: resep.no_bng,
    tipe_resep: resep.tipe_resep,
    berat_Benang_kg: safeBerat,
    volume_air_liter: safeVolume,
    liquor_ratio: liquorRatio,
    items,
    total_kimia_gram: Math.round(totalKimiaGram * 100) / 100,
    total_kimia_kg: Math.round((totalKimiaGram / 1000) * 1000) / 1000,
    total_dyestuff_gram: Math.round(totalDyestuffGram * 100) / 100,
    total_auxiliary_gram: Math.round(totalAuxiliaryGram * 100) / 100,
    ringkasan_per_tahap: ringkasanPerTahap,
  };
}

/**
 * Format angka berat ke satuan yang mudah dibaca (g atau kg)
 */
export function formatWeight(gram: number): string {
  if (gram >= 1000) {
    const kg = gram / 1000;
    return `${kg.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} kg`;
  }
  return `${gram.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} g`;
}
