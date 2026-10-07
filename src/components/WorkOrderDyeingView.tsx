import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  FlaskConical, 
  ArrowRight, 
  FileSpreadsheet,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter
} from 'lucide-react';
import { WorkOrderDyeing, MesinCelup, ResepDetail } from '../types/resep';

interface WorkOrderDyeingViewProps {
  workOrders: WorkOrderDyeing[];
  machines: MesinCelup[];
  recipes: ResepDetail[];
  onSelectWodToCalculate: (noResep: string, beratKg: number, volumeL: number, noMc?: string, kikc?: string) => void;
  onOpenRphModal: () => void;
  onSelectRecipeDirectly?: (resep: ResepDetail) => void;
}

export const WorkOrderDyeingView: React.FC<WorkOrderDyeingViewProps> = ({
  workOrders,
  machines,
  recipes,
  onSelectWodToCalculate,
  onOpenRphModal,
  onSelectRecipeDirectly,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<string>('SEMUA');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  // Filter without disrupting original spreadsheet sequence
  const filteredOrders = useMemo(() => {
    return workOrders.filter((w) => {
      const q = searchQuery.toLowerCase().trim();
      const assocBng = recipes.find(r => r.no_resep === w.no_resep)?.no_bng || '';
      const matchesSearch = 
        !q ||
        (w.kikc || '').toLowerCase().includes(q) ||
        (w.no_wod || '').toLowerCase().includes(q) ||
        (w.no_resep || '').toLowerCase().includes(q) ||
        (w.warna || '').toLowerCase().includes(q) ||
        (w.no_bng || '').toLowerCase().includes(q) ||
        assocBng.toLowerCase().includes(q) ||
        (w.no_mc || '').toLowerCase().includes(q) ||
        (w.nomor_bon || '').toLowerCase().includes(q);

      const matchesMachine = selectedMachine === 'SEMUA' || w.no_mc === selectedMachine;

      return matchesSearch && matchesMachine;
    });
  }, [workOrders, searchQuery, selectedMachine, recipes]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMachine]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Available machines for filter
  const availableMachines = useMemo(() => {
    return Array.from(new Set(workOrders.map((w) => w.no_mc).filter(Boolean))).sort();
  }, [workOrders]);

  return (
    <div className="space-y-5">
      
      {/* Header Info - KPI Cards and KIKC Aktif Terpilih REMOVED as requested */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Work Order Dyeing (WOD)</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    Sheet &ldquo;WOD&rdquo; RPH
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Urutan baris sesuai spreadsheet RPH sheet &ldquo;WOD&rdquo; dengan referensi kode resep, nomor benang, dan volume air.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenRphModal}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-2xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Sinkronkan Sheet WOD</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari KIKC, Kode Resep, Warna, No Benang..."
            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <option value="SEMUA">Semua Mesin (MC)</option>
              {availableMachines.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-500">
            Total: <span className="font-bold text-slate-800">{filteredOrders.length}</span> lot
          </span>
        </div>
      </div>

      {/* Main Table: Exact Columns Requested (Status Removed, Sequence Preserved) */}
      {workOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Data Sheet &ldquo;WOD&rdquo; Belum Dimuat
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Work Order Dyeing berisi antrian lot pencelupan pada spreadsheet RPH. Hubungkan spreadsheet RPH Anda untuk memuat jadwal lot secara otomatis.
            </p>
          </div>
          <button
            onClick={onOpenRphModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Koneksikan Spreadsheet RPH (Sheet WOD)</span>
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-xs text-slate-500">Tidak ada Work Order yang cocok dengan filter pencarian.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  {/* Exact Columns Requested: KIKC, KODE RESEP / NO RESEP, NO BENANG, WARNA, MESIN, BERAT (QTY/KG) BENANG, VOL AIR */}
                  <th className="py-3.5 px-4 whitespace-nowrap">KIKC</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Kode Resep / No Resep</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">No Benang</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[120px]">Warna</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Mesin</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Berat (Qty/Kg) Benang</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Vol Air</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedOrders.map((wod, idx) => {
                  const associatedRecipe = recipes.find(r => r.no_resep === wod.no_resep);
                  const rowKey = `${wod.kikc || wod.no_wod}-${idx}`;

                  return (
                    <tr
                      key={rowKey}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      {/* 1. KOLOM KIKC */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-900 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span>{wod.kikc || wod.no_wod}</span>
                          {wod.nomor_bon && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({wod.nomor_bon})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. KOLOM KODE RESEP / NO RESEP */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                            {wod.no_resep}
                          </span>
                          {associatedRecipe && onSelectRecipeDirectly && (
                            <button
                              onClick={() => onSelectRecipeDirectly(associatedRecipe)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-100 transition-colors"
                              title="Buka rincian resep ini"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 3. KOLOM NO BENANG */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <span className="font-mono">
                          {wod.no_bng && wod.no_bng !== '-' && wod.no_bng.toLowerCase() !== 'null'
                            ? wod.no_bng
                            : associatedRecipe?.no_bng || '-'}
                        </span>
                      </td>

                      {/* 4. KOLOM WARNA */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {wod.warna || '-'}
                      </td>

                      {/* 5. KOLOM MESIN */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {wod.no_mc || '-'}
                        </span>
                      </td>

                      {/* 6. KOLOM BERAT (QTY/KG) BENANG */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                        {wod.berat_Benang_kg.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                      </td>

                      {/* 7. KOLOM VOL AIR */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-cyan-800">
                        {wod.volume_air_liter.toLocaleString('id-ID')} L
                      </td>

                      {/* 8. AKSI */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectWodToCalculate(
                            wod.no_resep, 
                            wod.berat_Benang_kg, 
                            wod.volume_air_liter, 
                            wod.no_mc, 
                            wod.kikc || wod.no_wod
                          )}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-xs font-semibold transition-all shadow-2xs"
                          title="Hitung kebutuhan bahan kimia resep"
                        >
                          <FlaskConical className="w-3 h-3" />
                          <span>Hitung Resep</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
              <div>
                Menampilkan baris <span className="font-bold font-mono text-slate-800">{(currentPage - 1) * pageSize + 1}</span> sampai <span className="font-bold font-mono text-slate-800">{Math.min(currentPage * pageSize, filteredOrders.length)}</span> dari total <span className="font-bold font-mono text-slate-800">{filteredOrders.length}</span> baris
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-medium font-mono text-slate-700">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
