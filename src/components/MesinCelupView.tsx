import React, { useState, useMemo } from 'react';
import { 
  Cpu, 
  Search, 
  FileSpreadsheet, 
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  Wrench,
  FlaskConical
} from 'lucide-react';
import { MesinCelup, WorkOrderDyeing } from '../types/resep';

interface MesinCelupViewProps {
  machines: MesinCelup[];
  workOrders: WorkOrderDyeing[];
  onOpenRphModal: () => void;
  onSelectWod?: (noResep: string, beratBenangKg: number, volumeAirLiter: number, noMc?: string) => void;
}

export const MesinCelupView: React.FC<MesinCelupViewProps> = ({
  machines,
  workOrders,
  onOpenRphModal,
  onSelectWod,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('SEMUA');

  // Filter machines
  const filteredMachines = useMemo(() => {
    return machines.filter((mc) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        mc.no_mc.toLowerCase().includes(q) ||
        (mc.tipe_mesin && mc.tipe_mesin.toLowerCase().includes(q)) ||
        (mc.keterangan && mc.keterangan.toLowerCase().includes(q));

      const matchStatus = 
        statusFilter === 'SEMUA' || 
        mc.status.toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [machines, searchQuery, statusFilter]);

  return (
    <div className="space-y-5">
      
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Master Mesin Celup (MC)</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    Sheet &ldquo;MC&rdquo; RPH
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Spesifikasi kapasitas beban Benang (kg), batas rasio air (liquor ratio), dan volume tangki mesin dyeing.
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
              <span>Sinkronkan Sheet MC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Kode Mesin, Tipe..."
            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <option value="SEMUA">Semua Status Mesin</option>
              <option value="SIAP">Siap Operasi</option>
              <option value="JALAN">Sedang Celup</option>
              <option value="MAINTENANCE">Maintenance / Perbaikan</option>
            </select>
          </div>

          <span className="text-xs text-slate-500">
            Total: <span className="font-bold text-slate-800">{filteredMachines.length}</span> mesin
          </span>
        </div>
      </div>

      {/* Mesin Table View matching Resep & WOD */}
      {machines.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Cpu className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Data Mesin Celup Belum Dimuat
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hubungkan spreadsheet RPH Anda untuk membaca spesifikasi mesin celup, kapasitas Benang, batas liquor ratio, dan volume tangki secara otomatis.
            </p>
          </div>
          <button
            onClick={onOpenRphModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Koneksikan Spreadsheet RPH (Sheet MC)</span>
          </button>
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-xs text-slate-500">Tidak ada mesin celup yang cocok dengan filter pencarian.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-3 text-center w-12">No</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Kode Mesin (MC)</th>
                  <th className="py-3.5 px-4">Tipe Mesin</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Kapasitas Benang (Kg)</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Batas Liquor Ratio</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Vol Tangki (L)</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4">Antrian Lot (WOD)</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredMachines.map((mc, idx) => {
                  const activeWod = workOrders.filter(
                    w => (w.no_mc || '').toLowerCase() === mc.no_mc.toLowerCase()
                  );
                  const totalKgLot = activeWod.reduce((s, w) => s + w.berat_Benang_kg, 0);

                  const isSiap = mc.status === 'SIAP';
                  const isJalan = mc.status === 'JALAN';
                  const isMaint = mc.status === 'MAINTENANCE';

                  return (
                    <tr key={mc.no_mc} className="hover:bg-purple-50/30 transition-colors">
                      {/* 1. No */}
                      <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* 2. Kode Mesin */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            MC
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {mc.no_mc}
                          </span>
                        </div>
                      </td>

                      {/* 3. Tipe Mesin */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {mc.tipe_mesin || 'Jet Dyeing'}
                        {mc.keterangan && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                            {mc.keterangan}
                          </span>
                        )}
                      </td>

                      {/* 4. Kapasitas Benang (Kg) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                          {mc.kapasitas_min_kg} - {mc.kapasitas_max_kg} kg
                        </span>
                      </td>

                      {/* 5. Batas Liquor Ratio */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          1:{mc.liquor_ratio_min} - 1:{mc.liquor_ratio_max}
                        </span>
                      </td>

                      {/* 6. Volume Tangki */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-700 whitespace-nowrap">
                        {mc.volume_max_liter 
                          ? `${mc.volume_max_liter.toLocaleString('id-ID')} L` 
                          : '-'}
                      </td>

                      {/* 7. Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isSiap
                            ? 'bg-emerald-100 text-emerald-800'
                            : isJalan
                            ? 'bg-blue-100 text-blue-800'
                            : isMaint
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isSiap && <CheckCircle2 className="w-3 h-3" />}
                          {isJalan && <Clock className="w-3 h-3" />}
                          {isMaint && <Wrench className="w-3 h-3" />}
                          <span>{mc.status}</span>
                        </span>
                      </td>

                      {/* 8. Antrian Lot */}
                      <td className="py-3.5 px-4">
                        {activeWod.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">Kosong (0 lot)</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 font-mono">
                              {activeWod.length} Lot
                            </span>
                            <span className="text-[11px] text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded">
                              {totalKgLot.toLocaleString('id-ID')} kg
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 9. Aksi */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {activeWod.length > 0 && onSelectWod ? (
                          <button
                            onClick={() => onSelectWod(activeWod[0].no_resep, activeWod[0].berat_Benang_kg, activeWod[0].volume_air_liter, mc.no_mc)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-xs font-semibold transition-all shadow-2xs"
                            title="Hitung komposisi resep untuk lot di mesin ini"
                          >
                            <FlaskConical className="w-3 h-3" />
                            <span>Hitung Resep</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
