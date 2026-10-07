import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileSpreadsheet, 
  RefreshCw, 
  X, 
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  Info
} from 'lucide-react';
import { StokKimiaItem } from '../types/resep';
import { 
  fetchLiveStokFromMutkimyd, 
  getMutkimydSpreadsheetId, 
  saveMutkimydSpreadsheetId,
  LEGACY_MUTKIMYD_ID 
} from '../services/sheetsService';
import defaultStokData from '../data/defaultStokData.json';

type FilterCategory = 'SEMUA' | 'AMAN' | 'ORDER_SEKARANG' | 'KOSONG' | 'WASPADA_BOOKING' | 'DEFISIT';

interface KamusStokViewProps {
  onNotify?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const KamusStokView: React.FC<KamusStokViewProps> = ({ onNotify }) => {
  const [stokItems, setStokItems] = useState<StokKimiaItem[]>((defaultStokData as unknown) as StokKimiaItem[]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('SEMUA');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [spreadsheetInput, setSpreadsheetInput] = useState(getMutkimydSpreadsheetId());

  // Load live stock on mount
  useEffect(() => {
    handleFetchStok(false);
  }, []);

  const handleFetchStok = async (isManual = true) => {
    setIsLoading(true);
    try {
      const data = await fetchLiveStokFromMutkimyd();
      if (data && data.length > 0) {
        setStokItems(data);
        const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSynced(nowStr);
        if (isManual && onNotify) {
          onNotify(`Berhasil menyinkronkan ${data.length} item stok dari spreadsheet MUTKIMYD sheet "STOK"!`, 'success');
        }
      }
    } catch (err: any) {
      console.warn('Sync STOK error:', err);
      if (isManual && onNotify) {
        onNotify(`Koneksi MUTKIMYD: Menggunakan data lokal (${err?.message || 'offline'}).`, 'info');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = () => {
    if (!spreadsheetInput.trim()) {
      saveMutkimydSpreadsheetId(LEGACY_MUTKIMYD_ID);
      setSpreadsheetInput(LEGACY_MUTKIMYD_ID);
    } else {
      saveMutkimydSpreadsheetId(spreadsheetInput.trim());
    }
    setIsConfigOpen(false);
    handleFetchStok(true);
  };

  // Metrics computation
  const totalItems = stokItems.length;
  const totalGkdKg = useMemo(() => {
    return stokItems.reduce((acc, item) => acc + (item.stok_gkd_kg || 0), 0);
  }, [stokItems]);

  const amanItems = useMemo(() => {
    return stokItems.filter(item => {
      if (item.status_stok === 'AMAN') return true;
      if (item.doh > 7) return true;
      return false;
    });
  }, [stokItems]);

  const orderSekarangItems = useMemo(() => {
    return stokItems.filter(item => {
      if (item.status_stok === 'ORDER_SEKARANG') return true;
      if (item.doh > 0 && item.doh <= 7) return true;
      return false;
    });
  }, [stokItems]);

  const kosongItems = useMemo(() => {
    return stokItems.filter(item => item.sisa_stok_kg <= 0);
  }, [stokItems]);

  const waspadaBookingItems = useMemo(() => {
    return stokItems.filter(item => {
      const ind = (item.booking_indikator || '').toLowerCase();
      return ind.includes('waspada') || ind.includes('meningkat') || (item.booking_kg > 0 && item.booking_kg >= item.stok_gkd_kg * 0.4);
    });
  }, [stokItems]);

  const defisitItems = useMemo(() => {
    return stokItems.filter(item => item.sisa_stok_kg < 0);
  }, [stokItems]);

  const amanPercentage = totalItems > 0 ? Math.round((amanItems.length / totalItems) * 100) : 0;

  // Filtered rows
  const filteredItems = useMemo(() => {
    let list = [...stokItems];

    // Category filter
    if (activeFilter === 'AMAN') {
      list = list.filter(item => item.status_stok === 'AMAN' || item.doh > 7);
    } else if (activeFilter === 'ORDER_SEKARANG') {
      list = list.filter(item => item.status_stok === 'ORDER_SEKARANG' || (item.doh > 0 && item.doh <= 7));
    } else if (activeFilter === 'KOSONG') {
      list = list.filter(item => item.sisa_stok_kg <= 0);
    } else if (activeFilter === 'WASPADA_BOOKING') {
      list = list.filter(item => {
        const ind = (item.booking_indikator || '').toLowerCase();
        return ind.includes('waspada') || ind.includes('meningkat') || (item.booking_kg > 0 && item.booking_kg >= item.stok_gkd_kg * 0.4);
      });
    } else if (activeFilter === 'DEFISIT') {
      list = list.filter(item => item.sisa_stok_kg < 0);
    }

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(item => 
        item.nama_item.toLowerCase().includes(q) ||
        (item.booking_indikator && item.booking_indikator.toLowerCase().includes(q))
      );
    }

    return list;
  }, [stokItems, activeFilter, searchQuery]);

  const formatNumber = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0,00';
    return val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-5">
      
      {/* Header Card matching Image 6 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Stok Kimia Dyeing</span>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    Sheet STOK MUTKIMYD
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Monitoring ketersediaan bahan kimia GKD &amp; GKI, booking ERP, dan estimasi ketahanan (DoH)
                </p>
              </div>
            </div>
          </div>

          {/* Sync & Config Actions */}
          <div className="flex items-center gap-2">
            {lastSynced && (
              <span className="text-[11px] text-slate-500 hidden md:inline">
                Sinkron: <span className="font-mono font-medium text-slate-700">{lastSynced}</span>
              </span>
            )}

            <button
              onClick={() => handleFetchStok(true)}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-2xs transition-colors disabled:opacity-60"
              title="Sinkronkan data dari sheet STOK spreadsheet MUTKIMYD"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Memuat...' : 'Sinkronkan Sheet STOK'}</span>
            </button>

            <button
              onClick={() => setIsConfigOpen(true)}
              className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              title="Tautan / Konfigurasi Spreadsheet MUTKIMYD"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tautan MUTKIMYD</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards matching Image 6 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          
          {/* Card 1: TOTAL ITEM KIMIA */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Item Kimia
              </span>
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <div className="my-1.5">
              <span className="text-2xl font-bold font-mono text-slate-900">{totalItems}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 text-slate-500">
              <span>Varian bahan</span>
              <span className="font-semibold text-emerald-700 font-mono">
                {formatNumber(totalGkdKg)} Kg GKD
              </span>
            </div>
          </div>

          {/* Card 2: STOK AMAN */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Stok Aman
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="my-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-700">{amanItems.length}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 text-slate-500">
              <span>DoH &gt; 7 hari</span>
              <span className="font-semibold text-emerald-700 font-mono">{amanPercentage}%</span>
            </div>
          </div>

          {/* Card 3: ORDER SEKARANG */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Order Sekarang
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="my-1.5">
              <span className="text-2xl font-bold font-mono text-amber-600">{orderSekarangItems.length}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 text-slate-500">
              <span>DoH menipis (&le; 7 hr)</span>
              <span className="font-semibold text-amber-700 font-mono">Perlu PO</span>
            </div>
          </div>

          {/* Card 4: STOK KOSONG / HABIS */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Stok Kosong / Habis
              </span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="my-1.5">
              <span className="text-2xl font-bold font-mono text-rose-600">{kosongItems.length}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 text-slate-500">
              <span>Sisa Stok = 0 / Negatif</span>
              <span className="font-semibold text-slate-500">Kritis</span>
            </div>
          </div>

        </div>

      </div>

      {/* Filter & Search Bar matching Image 6 */}
      <div className="space-y-3">
        
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="input-search-stok"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama kimia, kode (cth: SODIUM SULPHATE, PAL)..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips matching Image 6 */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          <button
            onClick={() => setActiveFilter('SEMUA')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
              activeFilter === 'SEMUA'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua ({totalItems})
          </button>

          <button
            onClick={() => setActiveFilter('AMAN')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all inline-flex items-center gap-1.5 ${
              activeFilter === 'AMAN'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/70'
            }`}
          >
            <span>✓ Aman</span>
            <span className="font-mono">{amanItems.length}</span>
          </button>

          <button
            onClick={() => setActiveFilter('ORDER_SEKARANG')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all inline-flex items-center gap-1.5 ${
              activeFilter === 'ORDER_SEKARANG'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100/70'
            }`}
          >
            <span>⚠ Order Sekarang</span>
            <span className="font-mono">{orderSekarangItems.length}</span>
          </button>

          <button
            onClick={() => setActiveFilter('KOSONG')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all inline-flex items-center gap-1.5 ${
              activeFilter === 'KOSONG'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100/70'
            }`}
          >
            <span>✕ Stok Kosong</span>
            <span className="font-mono">{kosongItems.length}</span>
          </button>

          <button
            onClick={() => setActiveFilter('WASPADA_BOOKING')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all inline-flex items-center gap-1.5 ${
              activeFilter === 'WASPADA_BOOKING'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            <span>ℹ Waspada Booking</span>
            <span className="font-mono">{waspadaBookingItems.length}</span>
          </button>

          {defisitItems.length > 0 && (
            <button
              onClick={() => setActiveFilter('DEFISIT')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all inline-flex items-center gap-1.5 ${
                activeFilter === 'DEFISIT'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-white text-rose-600 border border-rose-300 hover:bg-rose-50'
              }`}
            >
              <span>⚠ Defisit Negatif</span>
              <span className="font-mono">{defisitItems.length}</span>
            </button>
          )}

          <div className="ml-auto text-[11px] text-slate-400">
            Menampilkan <span className="font-bold text-slate-700">{filteredItems.length}</span> dari {totalItems} item
          </div>
        </div>

      </div>

      {/* Main Table matching Image 6 */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-3 text-center w-12">No</th>
                <th className="py-3.5 px-4 min-w-[220px]">Item Kimia (Kg)</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Stok Riil GKD</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Booking</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Sisa Stok (GKD-Booking)</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Stok GKI</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Total (GKD+GKI)</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">AVD+Buff</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">DoH (GKD+GKI)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada item bahan kimia yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isLowDoh = item.doh > 0 && item.doh <= 7;
                  const isSafeDoh = item.doh > 7;
                  const isZeroDoh = item.doh === 0;

                  return (
                    <tr 
                      key={item.nama_item + idx} 
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      {/* 1. NO */}
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* 2. ITEM KIMIA (KG) */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex flex-col">
                          <span className="font-bold">{item.nama_item}</span>
                          {item.booking_indikator && (
                            <span className={`text-[10px] font-medium mt-0.5 inline-block ${
                              item.booking_indikator.includes('MENINGKAT') || item.booking_indikator.includes('WASPADA')
                                ? 'text-amber-700'
                                : 'text-slate-500'
                            }`}>
                              {item.booking_indikator}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. STOK RIIL GKD */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 whitespace-nowrap">
                        {formatNumber(item.stok_gkd_kg)}
                      </td>

                      {/* 4. BOOKING */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-indigo-700 whitespace-nowrap">
                        {formatNumber(item.booking_kg)}
                      </td>

                      {/* 5. SISA STOK (GKD-BOOKING) */}
                      <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                        item.sisa_stok_kg <= 0 
                          ? 'text-rose-600' 
                          : 'text-slate-900'
                      }`}>
                        {formatNumber(item.sisa_stok_kg)}
                      </td>

                      {/* 6. STOK GKI */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {formatNumber(item.stok_gki_kg)}
                      </td>

                      {/* 7. TOTAL (GKD+GKI) */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatNumber(item.total_stok_kg)}
                      </td>

                      {/* 8. AVD+BUFF */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {formatNumber(item.avd_buff)}
                      </td>

                      {/* 9. DOH (GKD+GKI) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold font-mono ${
                          isSafeDoh
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : isLowDoh
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : isZeroDoh && item.sisa_stok_kg <= 0
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {item.doh} Hari
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spreadsheet MUTKIMYD Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Pengaturan Spreadsheet &ldquo;MUTKIMYD&rdquo; (Sheet STOK)
                </h3>
              </div>
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Tautkan link Google Sheets MUTKIMYD Anda untuk membaca data posisi stok gudang dyeing (GKD &amp; GKI), booking ERP, dan estimasi DoH secara live dari sheet <span className="font-semibold text-slate-700">&ldquo;STOK&rdquo;</span>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Link atau ID Google Spreadsheet MUTKIMYD:
              </label>
              <input
                type="text"
                value={spreadsheetInput}
                onChange={(e) => setSpreadsheetInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1aNoqY6Iu5-9xWIj3DpRfTEQ-ilWn5DrAE5ScV_hYPdc/edit"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400">
                Default ID: <span className="font-mono">{LEGACY_MUTKIMYD_ID}</span>
              </p>
            </div>

            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Format Lembar Kerja:</span>
              </div>
              <p className="text-[11px] text-blue-800">
                Pastikan spreadsheet memiliki tab bernama <span className="font-bold font-mono">STOK</span> dengan kolom: <em>STOK TERSEDIA DI GKD, KG, BOOKING KIMIA DI ERP, SISA STOK, STOK GKI, AVD+BUFF, DoH</em>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Simpan &amp; Muat Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
