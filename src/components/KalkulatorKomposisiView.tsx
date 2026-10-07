import React, { useState, useMemo, useEffect } from 'react';
import { 
  FlaskConical, 
  Scale, 
  Droplets, 
  Layers, 
  Printer, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Info, 
  Calendar, 
  Sparkles, 
  Cpu, 
  ClipboardList,
  FileText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRight
} from 'lucide-react';
import { ResepDetail, ProductionLot, MesinCelup, WorkOrderDyeing } from '../types/resep';
import { calculateBatchChemicals, formatWeight } from '../utils/chemicalCalculator';
import { getColorSwatch } from '../utils/colorHelper';
import { BonBahanKimiaView } from './BonBahanKimiaView';

interface KalkulatorKomposisiViewProps {
  recipes: ResepDetail[];
  selectedRecipe: ResepDetail | null;
  onSelectRecipe: (resep: ResepDetail) => void;
  activeLots?: ProductionLot[];
  workOrders?: WorkOrderDyeing[];
  machines?: MesinCelup[];
  initialParams?: {
    noResep?: string;
    beratKg?: number;
    volumeL?: number;
    noMc?: string;
  } | null;
}

export const KalkulatorKomposisiView: React.FC<KalkulatorKomposisiViewProps> = ({
  recipes,
  selectedRecipe,
  onSelectRecipe,
  activeLots = [],
  workOrders = [],
  machines = [],
  initialParams,
}) => {
  const currentRecipe = selectedRecipe || recipes[0];

  const [beratBenang, setBeratBenang] = useState<number>(() => {
    if (initialParams?.beratKg) return initialParams.beratKg;
    const matchWod = workOrders.find(w => w.no_resep === currentRecipe?.no_resep);
    if (matchWod && matchWod.berat_Benang_kg > 0) return matchWod.berat_Benang_kg;
    const matchLot = activeLots.find(l => l.no_resep === currentRecipe?.no_resep);
    return matchLot ? matchLot.berat_Benang_kg : 67.5;
  });

  const [volumeAir, setVolumeAir] = useState<number>(() => {
    if (initialParams?.volumeL) return initialParams.volumeL;
    const matchWod = workOrders.find(w => w.no_resep === currentRecipe?.no_resep);
    if (matchWod && matchWod.volume_air_liter > 0) return matchWod.volume_air_liter;
    const matchLot = activeLots.find(l => l.no_resep === currentRecipe?.no_resep);
    return matchLot ? matchLot.volume_air_liter : 500;
  });

  const [selectedMc, setSelectedMc] = useState<string>(() => {
    return initialParams?.noMc || '';
  });

  const [liquorRatioInput, setLiquorRatioInput] = useState<number>(() => {
    const b = initialParams?.beratKg || 67.5;
    const v = initialParams?.volumeL || 500;
    return Math.round((v / b) * 10) / 10;
  });

  const [volumeMode, setVolumeMode] = useState<'volume' | 'ratio'>('volume');
  const [viewMode, setViewMode] = useState<'calculator' | 'bon_resmi'>('calculator');

  // Preset WOD Table Search States (Request #1)
  const [presetSearchQuery, setPresetSearchQuery] = useState('');
  const [presetSearchField, setPresetSearchField] = useState<'ALL' | 'KIKC' | 'RESEP' | 'DBB' | 'KIMIA'>('ALL');
  const [isPresetTableOpen, setIsPresetTableOpen] = useState(true);
  const [presetPage, setPresetPage] = useState(1);
  const [activePresetKikc, setActivePresetKikc] = useState<string>('');
  const presetPageSize = 6;

  // Pre-index chemical items by recipe code
  const recipeChemicalMap = useMemo(() => {
    const map = new Map<string, { names: string[]; text: string }>();
    for (const r of recipes) {
      const names = (r.tahap_proses || []).flatMap(t => t.langkah || []).map(l => l.mat_name);
      map.set(r.no_resep, {
        names,
        text: names.join(' ').toLowerCase(),
      });
    }
    return map;
  }, [recipes]);

  // Filtered WOD presets based on selected search field
  const filteredWodPresets = useMemo(() => {
    const q = presetSearchQuery.toLowerCase().trim();
    if (!q) return workOrders;

    return workOrders.filter(w => {
      const lotKikc = (w.kikc || w.no_wod || '').toLowerCase();
      const noResep = (w.no_resep || '').toLowerCase();
      const noDbb = (w.nomor_bon || '').toLowerCase();
      const chemData = recipeChemicalMap.get(w.no_resep);
      const chemText = chemData ? chemData.text : '';

      if (presetSearchField === 'KIKC') {
        return lotKikc.includes(q);
      }
      if (presetSearchField === 'RESEP') {
        return noResep.includes(q);
      }
      if (presetSearchField === 'DBB') {
        return noDbb.includes(q);
      }
      if (presetSearchField === 'KIMIA') {
        return chemText.includes(q);
      }

      // Default: ALL
      return (
        lotKikc.includes(q) ||
        noResep.includes(q) ||
        noDbb.includes(q) ||
        chemText.includes(q)
      );
    });
  }, [workOrders, presetSearchQuery, presetSearchField, recipeChemicalMap]);

  // Reset preset page when query or field changes
  useEffect(() => {
    setPresetPage(1);
  }, [presetSearchQuery, presetSearchField]);

  const totalPresetPages = Math.max(1, Math.ceil(filteredWodPresets.length / presetPageSize));
  const paginatedPresets = useMemo(() => {
    const start = (presetPage - 1) * presetPageSize;
    return filteredWodPresets.slice(start, start + presetPageSize);
  }, [filteredWodPresets, presetPage, presetPageSize]);

  const matchingWod = useMemo(() => {
    return workOrders.find(w => w.no_resep === currentRecipe?.no_resep) || null;
  }, [workOrders, currentRecipe]);

  // React to initialParams updates
  useEffect(() => {
    if (initialParams) {
      if (initialParams.beratKg) setBeratBenang(initialParams.beratKg);
      if (initialParams.volumeL) setVolumeAir(initialParams.volumeL);
      if (initialParams.noMc) setSelectedMc(initialParams.noMc);
      if (initialParams.beratKg && initialParams.volumeL) {
        setLiquorRatioInput(Math.round((initialParams.volumeL / initialParams.beratKg) * 10) / 10);
      }
    }
  }, [initialParams]);

  // Sinkronisasi saat memilih resep baru
  const handleRecipeChange = (noResep: string) => {
    const found = recipes.find(r => r.no_resep === noResep);
    if (found) {
      onSelectRecipe(found);
      const matchWod = workOrders.find(w => w.no_resep === found.no_resep);
      if (matchWod && matchWod.berat_Benang_kg > 0) {
        setBeratBenang(matchWod.berat_Benang_kg);
        setVolumeAir(matchWod.volume_air_liter);
        setSelectedMc(matchWod.no_mc);
        setLiquorRatioInput(Math.round((matchWod.volume_air_liter / matchWod.berat_Benang_kg) * 10) / 10);
        return;
      }
      const matchLot = activeLots.find(l => l.no_resep === found.no_resep);
      if (matchLot) {
        setBeratBenang(matchLot.berat_Benang_kg);
        setVolumeAir(matchLot.volume_air_liter);
        setLiquorRatioInput(Math.round((matchLot.volume_air_liter / matchLot.berat_Benang_kg) * 10) / 10);
      }
    }
  };

  // Preset lot aktif dari sheet WOD (RPH)
  const handleApplyWodPreset = (wod: WorkOrderDyeing) => {
    setActivePresetKikc(wod.kikc || wod.no_wod);
    const found = recipes.find(r => r.no_resep === wod.no_resep);
    if (found) {
      onSelectRecipe(found);
    }
    setBeratBenang(wod.berat_Benang_kg);
    setVolumeAir(wod.volume_air_liter);
    setSelectedMc(wod.no_mc);
    if (wod.berat_Benang_kg > 0) {
      setLiquorRatioInput(Math.round((wod.volume_air_liter / wod.berat_Benang_kg) * 10) / 10);
    }
  };

  // Preset lot aktif dari sheet rencana (MUTKIMYD)
  const handleApplyLotPreset = (lot: ProductionLot) => {
    const found = recipes.find(r => r.no_resep === lot.no_resep);
    if (found) {
      onSelectRecipe(found);
    }
    setBeratBenang(lot.berat_Benang_kg);
    setVolumeAir(lot.volume_air_liter);
    setSelectedMc(lot.mesin);
    setLiquorRatioInput(Math.round((lot.volume_air_liter / lot.berat_Benang_kg) * 10) / 10);
  };

  // Preset Mesin Celup (MC)
  const handleApplyMc = (mcCode: string) => {
    setSelectedMc(mcCode);
    const mc = machines.find(m => m.no_mc === mcCode);
    if (mc && mc.liquor_ratio_min) {
      // Sesuaikan volume air berdasarkan rasio rekomendasi mesin
      const targetRatio = mc.liquor_ratio_min;
      setLiquorRatioInput(targetRatio);
      setVolumeAir(Math.round(beratBenang * targetRatio));
    }
  };

  // Update volume jika rasio diubah
  const handleRatioChange = (ratio: number) => {
    setLiquorRatioInput(ratio);
    setVolumeAir(Math.round(beratBenang * ratio));
  };

  // Update berat Benang
  const handleBeratBenangChange = (val: number) => {
    setBeratBenang(val);
    if (volumeMode === 'ratio') {
      setVolumeAir(Math.round(val * liquorRatioInput));
    } else {
      if (val > 0) {
        setLiquorRatioInput(Math.round((volumeAir / val) * 10) / 10);
      }
    }
  };

  // Hasil Perhitungan Matematika Kimia
  const calcResult = useMemo(() => {
    if (!currentRecipe) return null;
    return calculateBatchChemicals(currentRecipe, beratBenang, volumeAir);
  }, [currentRecipe, beratBenang, volumeAir]);

  const swatch = currentRecipe ? getColorSwatch(currentRecipe.warna) : null;

  // Export CSV Perhitungan Timbang
  const handleExportCsv = () => {
    if (!calcResult) return;
    const headers = ['No', 'Tahap', 'Nama Bahan', 'Kode', 'Dosis', 'Satuan', 'Basis', 'Kebutuhan (Gram)', 'Kebutuhan (Kg)', 'Parameter Proses', 'Status Stok'];
    const rows = calcResult.items.map((item, idx) => [
      idx + 1,
      item.jns_proses,
      `"${item.mat_name}"`,
      item.mat_code,
      item.dosis_qty,
      item.dosis_uom,
      item.basis,
      item.kebutuhan_gram,
      item.kebutuhan_kg,
      `"${item.catatan_proses}"`,
      item.status_stok,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      `Surat Timbang Kimia Batch Celup - Resep: ${calcResult.no_resep} - Warna: ${calcResult.warna} - Berat: ${calcResult.berat_Benang_kg} kg - Volume: ${calcResult.volume_air_liter} L`,
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Perhitungan_Kimia_${calcResult.no_resep}_${calcResult.berat_Benang_kg}kg.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!currentRecipe) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs space-y-4 max-w-lg mx-auto mt-6">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <FlaskConical className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          Belum Ada Resep Yang Dipilih
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {recipes.length === 0
            ? 'Database resep belum dimuat dari spreadsheet RPH sheet "Resep". Silakan sinkronkan resep terlebih dahulu melalui menu RPH Resep di atas.'
            : 'Pilih resep pada tab Daftar Resep untuk menghitung dosis dan kebutuhan bahan kimia batch pencelupan.'}
        </p>
      </div>
    );
  }

  // Tampilan Resmi Format Bon Bahan Kimia (Sesuai PDF Dokumen Pabrik)
  if (viewMode === 'bon_resmi') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('calculator')}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>← Kembali ke Mode Kalkulator</span>
            </button>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('calculator')}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Kalkulator Interaktif
              </button>
              <button
                className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-2xs"
              >
                Format Bon Bahan Kimia (PDF)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Ganti Resep:</span>
            <select
              value={currentRecipe.no_resep}
              onChange={(e) => handleRecipeChange(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-2.5 py-1.5 font-mono"
            >
              {recipes.map(r => (
                <option key={r.no_resep} value={r.no_resep}>
                  {r.no_resep} — {r.warna}
                </option>
              ))}
            </select>
          </div>
        </div>

        <BonBahanKimiaView
          recipe={currentRecipe}
          beratBahanKg={beratBenang}
          volumeAirLiter={volumeAir}
          nomorMesin={selectedMc || matchingWod?.no_mc || 'THIES A13'}
          nomorKikc={matchingWod?.kikc || matchingWod?.no_wod || 'OON26I027'}
          nomorBon={matchingWod?.nomor_bon || 'DBB/2609/00208'}
          tglBon={matchingWod?.tanggal || '07-09-2026'}
          customer=""
          jnsCone="CHESE"
          totalCone={165}
          onBack={() => setViewMode('calculator')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Control Panel Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5 print:hidden">
        
        {/* Header & Recipe Picker */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Kalkulator Komposisi Kimia & Dosis Batch
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Perhitungan otomatis gramatur zat pewarna (% OWF) dan zat pembantu (Gr/l) berdasarkan volume air dan bobot Benang.
            </p>
          </div>

          {/* View Mode Toggle and Recipe Select Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode('calculator')}
                className="px-3 py-1.5 rounded-lg font-bold bg-white text-blue-700 shadow-2xs"
              >
                Kalkulator
              </button>
              <button
                id="btn-switch-to-bon-pdf"
                onClick={() => setViewMode('bon_resmi')}
                className="px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Format Bon PDF</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Pilih Resep:</span>
              <select
                id="select-calculator-resep"
                value={currentRecipe.no_resep}
                onChange={(e) => handleRecipeChange(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {recipes.map(r => (
                  <option key={r.no_resep} value={r.no_resep}>
                    {r.no_resep} — {r.warna} ({r.no_bng})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Presets dari Sheet WOD (Spreadsheet RPH) dengan Pencarian Berdasarkan Field */}
        {workOrders.length > 0 && (
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl overflow-hidden">
            {/* Header Collapsible Bar */}
            <div className="p-3.5 bg-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  PILIH PRESET WOD DARI SPREADSHEET (KARTU LOT / KIKC AKTIF)
                </span>
                <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {filteredWodPresets.length} Lot Tersedia
                </span>
                {activePresetKikc && (
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Aktif: {activePresetKikc}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsPresetTableOpen(!isPresetTableOpen)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <span>{isPresetTableOpen ? 'Sembunyikan Tabel' : 'Tampilkan Tabel'}</span>
                {isPresetTableOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isPresetTableOpen && (
              <div className="p-3.5 space-y-3">
                {/* Search Bar & Field Filter Buttons (Request #1) */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 justify-between">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={presetSearchQuery}
                      onChange={(e) => setPresetSearchQuery(e.target.value)}
                      placeholder={
                        presetSearchField === 'KIKC'
                          ? 'Cari No Lot / KIKC (misal: OON26I027)...'
                          : presetSearchField === 'RESEP'
                          ? 'Cari No Resep / Kode Resep (misal: OO07CC13A003)...'
                          : presetSearchField === 'DBB'
                          ? 'Cari No DBB / Bon (misal: DBB/2609/00208)...'
                          : presetSearchField === 'KIMIA'
                          ? 'Cari Nama Bahan Kimia (misal: SODA ASH, GLAUBER, DYE)...'
                          : 'Cari berdasarkan Lot, Resep, DBB, atau Nama Item Kimia...'
                      }
                      className="w-full pl-8 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                    {presetSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setPresetSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Field Chips (LOT/KIKC, NO RESEP, NO DBB, NAMA ITEM KIMIA) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap mr-0.5 flex items-center gap-1">
                      <Filter className="w-3 h-3 text-slate-400" /> Field:
                    </span>

                    <button
                      type="button"
                      onClick={() => setPresetSearchField('ALL')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                        presetSearchField === 'ALL'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Semua Field
                    </button>

                    <button
                      type="button"
                      onClick={() => setPresetSearchField('KIKC')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                        presetSearchField === 'KIKC'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Lot / KIKC
                    </button>

                    <button
                      type="button"
                      onClick={() => setPresetSearchField('RESEP')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                        presetSearchField === 'RESEP'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      No Resep / Kode
                    </button>

                    <button
                      type="button"
                      onClick={() => setPresetSearchField('DBB')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                        presetSearchField === 'DBB'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      No DBB
                    </button>

                    <button
                      type="button"
                      onClick={() => setPresetSearchField('KIMIA')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                        presetSearchField === 'KIMIA'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Nama Item Kimia
                    </button>
                  </div>
                </div>

                {/* Table of Presets */}
                {paginatedPresets.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-xs text-slate-500">
                    Tidak ditemukan Lot WOD yang cocok dengan pencarian{' '}
                    {presetSearchField !== 'ALL' && `pada field ${presetSearchField}`}.
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-2.5 px-3 whitespace-nowrap">Lot / KIKC</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">No DBB</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">No Resep / Kode</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Warna &amp; No Benang</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Mesin</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">Berat Benang</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">Vol Air</th>
                            <th className="py-2.5 px-3 whitespace-nowrap min-w-[180px]">Bahan Kimia Resep</th>
                            <th className="py-2.5 px-3 text-right whitespace-nowrap">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedPresets.map((wod, idx) => {
                            const isCurrent =
                              activePresetKikc === (wod.kikc || wod.no_wod) ||
                              (currentRecipe.no_resep === wod.no_resep && beratBenang === wod.berat_Benang_kg);
                            const chemData = recipeChemicalMap.get(wod.no_resep);
                            const chemNames = chemData ? chemData.names : [];

                            return (
                              <tr
                                key={`${wod.kikc || wod.no_wod}-${idx}`}
                                className={`transition-colors ${
                                  isCurrent ? 'bg-blue-50/70 font-medium' : 'hover:bg-slate-50'
                                }`}
                              >
                                {/* LOT / KIKC */}
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                                  {wod.kikc || wod.no_wod}
                                </td>

                                {/* NO DBB */}
                                <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                                  {wod.nomor_bon || '-'}
                                </td>

                                {/* NO RESEP / KODE RESEP */}
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {wod.no_resep}
                                  </span>
                                </td>

                                {/* WARNA & BENANG */}
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-slate-900 truncate max-w-[130px]">{wod.warna}</div>
                                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">{wod.no_bng || '-'}</div>
                                </td>

                                {/* MESIN */}
                                <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                                  {wod.no_mc || '-'}
                                </td>

                                {/* BERAT BENANG */}
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                  {wod.berat_Benang_kg.toLocaleString('id-ID')} kg
                                </td>

                                {/* VOL AIR */}
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-800 whitespace-nowrap">
                                  {wod.volume_air_liter.toLocaleString('id-ID')} L
                                </td>

                                {/* BAHAN KIMIA RESEP (Menampilkan item kimia yang terhubung) */}
                                <td className="py-2.5 px-3">
                                  {chemNames.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 max-w-[240px]">
                                      {chemNames.slice(0, 3).map((cn, cIdx) => {
                                        const isMatch =
                                          presetSearchQuery &&
                                          cn.toLowerCase().includes(presetSearchQuery.toLowerCase());
                                        return (
                                          <span
                                            key={cIdx}
                                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                              isMatch
                                                ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                                                : 'bg-slate-100 text-slate-600'
                                            }`}
                                          >
                                            {cn}
                                          </span>
                                        );
                                      })}
                                      {chemNames.length > 3 && (
                                        <span className="text-[10px] text-slate-400">
                                          +{chemNames.length - 3} lagi
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">-</span>
                                  )}
                                </td>

                                {/* AKSI */}
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleApplyWodPreset(wod)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                      isCurrent
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white'
                                    }`}
                                  >
                                    {isCurrent ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Aktif</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>Pilih</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    {totalPresetPages > 1 && (
                      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          Menampilkan baris {(presetPage - 1) * presetPageSize + 1} s/d{' '}
                          {Math.min(presetPage * presetPageSize, filteredWodPresets.length)} dari total{' '}
                          {filteredWodPresets.length} lot
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPresetPage((p) => Math.max(1, p - 1))}
                            disabled={presetPage === 1}
                            className="p-1 rounded border border-slate-300 hover:bg-white disabled:opacity-40"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-slate-700">
                            {presetPage} / {totalPresetPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPresetPage((p) => Math.min(totalPresetPages, p + 1))}
                            disabled={presetPage === totalPresetPages}
                            className="p-1 rounded border border-slate-300 hover:bg-white disabled:opacity-40"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Presets dari Jadwal Lot Aktif Sheet 'rencana' */}
        {activeLots.length > 0 && workOrders.length === 0 && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Gunakan Data Mesin & Jadwal Lot Rencana (MUTKIMYD Live):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeLots.map(lot => (
                <button
                  key={lot.lot_no}
                  id={`btn-lot-preset-${lot.lot_no}`}
                  onClick={() => handleApplyLotPreset(lot)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    currentRecipe.no_resep === lot.no_resep && beratBenang === lot.berat_Benang_kg
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold">Lot {lot.lot_no}:</span> {lot.mesin} ({lot.berat_Benang_kg} kg / {lot.volume_air_liter} L)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mesin Celup (MC) Selector from Sheet MC */}
        {machines.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-purple-50/60 rounded-xl border border-purple-200 text-xs">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-600 shrink-0" />
              <span className="font-semibold text-purple-950">Mesin Celup (Sheet &ldquo;MC&rdquo;):</span>
              <select
                value={selectedMc}
                onChange={(e) => handleApplyMc(e.target.value)}
                className="px-2.5 py-1 bg-white border border-purple-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Bebas / Pilih Mesin --</option>
                {machines.map((m) => (
                  <option key={m.no_mc} value={m.no_mc}>
                    {m.no_mc} • Kap: {m.kapasitas_min_kg}-{m.kapasitas_max_kg} kg (1:{m.liquor_ratio_min}-1:{m.liquor_ratio_max})
                  </option>
                ))}
              </select>
            </div>
            {selectedMc && (() => {
              const mc = machines.find((m) => m.no_mc === selectedMc);
              if (!mc) return null;
              const isOver = mc.kapasitas_max_kg > 0 && beratBenang > mc.kapasitas_max_kg;
              const isUnder = mc.kapasitas_min_kg > 0 && beratBenang < mc.kapasitas_min_kg;
              return (
                <div className={`text-[11px] font-medium ${isOver || isUnder ? 'text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200' : 'text-purple-800'}`}>
                  {isOver && `⚠️ Berat Benang (${beratBenang} kg) melebihi kapasitas max mesin ${mc.no_mc} (${mc.kapasitas_max_kg} kg)`}
                  {isUnder && `⚠️ Berat Benang (${beratBenang} kg) di bawah kapasitas min mesin ${mc.no_mc} (${mc.kapasitas_min_kg} kg)`}
                  {!isOver && !isUnder && `Ideal MC: ${mc.kapasitas_min_kg}-${mc.kapasitas_max_kg} kg • LR 1:${mc.liquor_ratio_min}-1:${mc.liquor_ratio_max}`}
                </div>
              );
            })()}
          </div>
        )}

        {/* Batch Parameter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          
          {/* Berat Benang (kg) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="input-berat-Benang" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-slate-500" />
                Berat Benang / Lot (kg)
              </label>
              <span className="text-[10px] font-mono text-slate-400">Basis % OWF</span>
            </div>
            <div className="relative">
              <input
                id="input-berat-Benang"
                type="number"
                step="0.1"
                min="0.5"
                value={beratBenang}
                onChange={(e) => handleBeratBenangChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-500 font-semibold pointer-events-none">
                kg
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Digunakan untuk menghitung zat warna (1% = 10 gram per kg Benang).
            </p>
          </div>

          {/* Volume Air (Liter) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="input-volume-air" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-blue-500" />
                Volume Air Mesin (Liter)
              </label>
              <span className="text-[10px] font-mono text-slate-400">Basis Gr/l</span>
            </div>
            <div className="relative">
              <input
                id="input-volume-air"
                type="number"
                step="1"
                min="1"
                value={volumeAir}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setVolumeAir(val);
                  if (beratBenang > 0) {
                    setLiquorRatioInput(Math.round((val / beratBenang) * 10) / 10);
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-500 font-semibold pointer-events-none">
                Liter
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Digunakan untuk zat pembantu (Garam, Soda Ash, Asam, Softener).
            </p>
          </div>

          {/* Liquor Ratio (L:R) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="input-liquor-ratio" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                Liquor Ratio (L:R)
              </label>
              <span className="text-[10px] font-mono text-slate-400">Rasio Air:Benang</span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-500 font-bold pointer-events-none">
                1 :
              </span>
              <input
                id="input-liquor-ratio"
                type="number"
                step="0.1"
                min="1"
                max="25"
                value={liquorRatioInput}
                onChange={(e) => handleRatioChange(parseFloat(e.target.value) || 1)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Rasio standar mesin jet/overflow: 1:6 s/d 1:10.
            </p>
          </div>

        </div>

      </div>

      {/* Printable Sheet Header (Visible on print & web) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
        
        {/* Title bar with Print & Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                SURAT TIMBANG & FORMULASI KIMIA
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 font-mono">
              {calcResult?.no_resep}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              id="btn-switch-to-bon-pdf-action"
              onClick={() => setViewMode('bon_resmi')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Format Bon PDF Pabrik</span>
            </button>

            <button
              id="btn-export-calc-csv"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              id="btn-print-calc-sheet"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Formulir Timbang</span>
            </button>
          </div>
        </div>

        {/* Executive Metrics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500 font-medium">Bobot Benang</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">
              {calcResult?.berat_Benang_kg} kg
            </div>
            <div className="text-[10px] text-slate-400">{currentRecipe.no_bng}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500 font-medium">Volume Air (L:R)</div>
            <div className="text-base font-extrabold text-blue-700 font-mono">
              {calcResult?.volume_air_liter} L
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">{calcResult?.liquor_ratio}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500 font-medium">Total Zat Pewarna (Dyestuff)</div>
            <div className="text-base font-extrabold text-purple-700 font-mono">
              {formatWeight(calcResult?.total_dyestuff_gram || 0)}
            </div>
            <div className="text-[10px] text-slate-400">Basis % Berat Benang</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500 font-medium">Total Zat Pembantu (Auxiliary)</div>
            <div className="text-base font-extrabold text-emerald-700 font-mono">
              {formatWeight(calcResult?.total_auxiliary_gram || 0)}
            </div>
            <div className="text-[10px] text-slate-400">Basis Gr/l Larutan</div>
          </div>
        </div>

        {/* Detailed Stage-by-Stage Chemical Recipe Table */}
        <div className="space-y-6">
          {calcResult?.ringkasan_per_tahap.map((tahapSummary) => {
            const stageItems = calcResult.items.filter(i => i.jns_proses === tahapSummary.tahap);
            if (stageItems.length === 0) return null;

            return (
              <div key={tahapSummary.tahap} className="border border-slate-200 rounded-xl overflow-hidden">
                
                {/* Stage Section Header */}
                <div className="px-4 py-2.5 bg-slate-100 flex items-center justify-between border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800 tracking-wide">
                      TAHAP {tahapSummary.tahap}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({tahapSummary.item_count} Bahan Kimia)
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-700">
                    Subtotal: {formatWeight(tahapSummary.total_gram)}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Bahan Kimia</th>
                        <th className="py-2.5 px-3 w-24">Kode</th>
                        <th className="py-2.5 px-3 w-24 text-right">Dosis Resep</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Formula Perhitungan</th>
                        <th className="py-2.5 px-3 w-28 text-right bg-blue-50/50 text-blue-900 font-bold">
                          Kebutuhan (Gram)
                        </th>
                        <th className="py-2.5 px-3 w-28 text-right bg-blue-50/50 text-blue-900 font-bold">
                          Kebutuhan (Kg)
                        </th>
                        <th className="py-2.5 px-3 min-w-[150px]">Parameter Proses</th>
                        <th className="py-2.5 px-3 w-28 text-center print:hidden">Stok Gudang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stageItems.map((item, idx) => {
                        const formulaText = item.basis === 'owf'
                          ? `${item.dosis_qty}% × ${calcResult.berat_Benang_kg} kg × 10`
                          : `${item.dosis_qty} Gr/l × ${calcResult.volume_air_liter} L`;

                        return (
                          <tr key={`${item.mat_code}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{item.mat_name}</div>
                              <div className="text-[10px] text-slate-500">{item.ket_proses_desc}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {item.mat_code || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                              {item.dosis_qty} {item.dosis_uom}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                              {formulaText}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-700 bg-blue-50/30 text-sm">
                              {item.kebutuhan_gram.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} g
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 bg-blue-50/30">
                              {item.kebutuhan_kg.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} kg
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                {item.catatan_proses}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center print:hidden">
                              {item.status_stok === 'kurang' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                                  <AlertTriangle className="w-3 h-3" /> Kurang
                                </span>
                              ) : item.status_stok === 'menipis' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                  Menipis
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Aman
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })}
        </div>

        {/* Signatures for physical weighing room (Printable) */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-8 text-center text-xs text-slate-600">
          <div>
            <div className="font-semibold mb-12">Petugas Laboratorium:</div>
            <div className="border-t border-slate-300 w-32 mx-auto pt-1 font-mono">( .................... )</div>
          </div>
          <div>
            <div className="font-semibold mb-12">Petugas Timbang (Dosing):</div>
            <div className="border-t border-slate-300 w-32 mx-auto pt-1 font-mono">( .................... )</div>
          </div>
          <div>
            <div className="font-semibold mb-12">Operator Mesin Celup:</div>
            <div className="border-t border-slate-300 w-32 mx-auto pt-1 font-mono">( .................... )</div>
          </div>
        </div>

      </div>

    </div>
  );
};
