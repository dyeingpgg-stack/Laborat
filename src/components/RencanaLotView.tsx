import React, { useState } from 'react';
import { 
  Calendar, 
  Layers, 
  Scale, 
  Droplets, 
  FlaskConical, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { ProductionLot, OrderRequirement, ResepDetail } from '../types/resep';
import { formatWeight } from '../utils/chemicalCalculator';

interface RencanaLotViewProps {
  lots: ProductionLot[];
  orders: OrderRequirement[];
  onSelectLotToCalculate: (noResep: string, beratKg: number, volumeL: number) => void;
}

export const RencanaLotView: React.FC<RencanaLotViewProps> = ({
  lots,
  orders,
  onSelectLotToCalculate,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'lots' | 'orders'>('lots');

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Rencana Produksi Celup & Kebutuhan Bahan Kimia
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Data terintegrasi langsung dengan TAB <span className="font-mono font-semibold text-slate-700">rencana</span> dan <span className="font-mono font-semibold text-slate-700">order</span> dari Google Spreadsheet MUTKIMYD.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveSubTab('lots')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeSubTab === 'lots'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Jadwal Lot ({lots.length} Mesin)
            </button>
            <button
              onClick={() => setActiveSubTab('orders')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeSubTab === 'orders'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Total Order Kimia ({orders.length} Item)
            </button>
          </div>
        </div>
      </div>

      {/* SubTab 1: Jadwal Lot Mesin */}
      {activeSubTab === 'lots' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lots.map((lot) => {
              const liquorRatio = lot.berat_Benang_kg > 0
                ? (lot.volume_air_liter / lot.berat_Benang_kg).toFixed(1)
                : '0';

              return (
                <div
                  key={lot.lot_no}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Lot #{lot.lot_no}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-500">
                        {lot.mesin}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">No. Resep Celup</div>
                        <div className="text-base font-extrabold text-slate-900 font-mono">
                          {lot.no_resep}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs py-1 border-y border-slate-100">
                        <span className="text-slate-500">Kode Warna:</span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {lot.warna}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">KIKC:</span>
                        <span className="font-mono text-slate-700 font-medium">
                          {lot.kikc}
                        </span>
                      </div>
                    </div>

                    {/* Operational parameters */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs mb-4">
                      <div>
                        <div className="text-[10px] text-slate-500">Berat Benang</div>
                        <div className="font-bold text-slate-900 font-mono">
                          {lot.berat_Benang_kg} kg
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Volume Air (L:R)</div>
                        <div className="font-bold text-blue-700 font-mono">
                          {lot.volume_air_liter} L (1:{liquorRatio})
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => onSelectLotToCalculate(lot.no_resep, lot.berat_Benang_kg, lot.volume_air_liter)}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs transition-colors"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>Hitung Komposisi Lot Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SubTab 2: Total Order Kimia dari Sheet 'order' */}
      {activeSubTab === 'orders' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700">
              Kebutuhan Kimia Total vs Sisa Stok Gudang
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Sheet: order
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 min-w-[220px]">Nama Bahan Kimia</th>
                  <th className="py-3 px-4 text-right">Rencana Celup (g)</th>
                  <th className="py-3 px-4 text-right">Stock Gudang (g)</th>
                  <th className="py-3 px-4 text-right">Kebutuhan Order (g)</th>
                  <th className="py-3 px-4 text-right">Sisa Stock (g)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord, idx) => {
                  const isLow = ord.sisa_stock_gram <= 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {ord.nama_bahan}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                        {ord.rnc_celup_gram.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                        {ord.stock_gram.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">
                        {ord.rencana_celup_gram.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {ord.sisa_stock_gram.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                            Stok Kurang
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Aman
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
      )}

    </div>
  );
};
