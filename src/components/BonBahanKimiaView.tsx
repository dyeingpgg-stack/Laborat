import React, { useRef } from 'react';
import { Printer, Download, ArrowLeft, CheckCircle2, ShieldCheck, Scale, Droplets } from 'lucide-react';
import { ResepDetail, MesinCelup, WorkOrderDyeing } from '../types/resep';

interface BonBahanKimiaViewProps {
  recipe: ResepDetail;
  beratBahanKg: number;
  volumeAirLiter: number;
  nomorMesin?: string;
  nomorKikc?: string;
  nomorBon?: string;
  tglBon?: string;
  customer?: string;
  jnsCone?: string;
  totalCone?: number;
  onBack?: () => void;
}

export const BonBahanKimiaView: React.FC<BonBahanKimiaViewProps> = ({
  recipe,
  beratBahanKg,
  volumeAirLiter,
  nomorMesin = 'THIES A13',
  nomorKikc = 'OON26I027',
  nomorBon = 'DBB/2609/00208',
  tglBon = '07-09-2026',
  customer = '',
  jnsCone = 'CHESE',
  totalCone = 165,
  onBack,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // Flatten all items with calculated real gram
  let itemCounter = 0;
  const sections = (recipe.tahap_proses || []).map((tahapGroup) => {
    const items = tahapGroup.langkah.map((l) => {
      itemCounter++;
      let realGram = 0;
      if (l.uom_code === '%') {
        // % OWF: (dosis / 100) * berat_bahan_kg * 1000
        realGram = (l.qty / 100) * beratBahanKg * 1000;
      } else {
        // Gr/l: dosis * volume_air_liter
        realGram = l.qty * volumeAirLiter;
      }

      return {
        no: itemCounter,
        kode: l.mat_code || '-',
        namaBahan: l.mat_name,
        qty: l.qty,
        uom: l.uom_code,
        realGram,
        keterangan: l.ket_proses_desc || l.catatan_proses || '',
      };
    });

    return {
      tahap: tahapGroup.tahap,
      title: tahapGroup.tahap === 'PRETREATMENT' 
        ? 'Pretreatment' 
        : tahapGroup.tahap === 'PROCESSING' 
        ? 'Processing' 
        : 'After Treatment',
      items,
    };
  });

  const totalGramAll = sections.reduce(
    (sum, sec) => sum + sec.items.reduce((s, it) => s + it.realGram, 0),
    0
  );

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="space-y-6">
      
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs print:hidden">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>
          )}
          <div className="text-xs text-slate-600 font-medium">
            Format Bon Standar Pabrik (Sesuai Dokumen Bon Bahan Kimia RPH / PDF)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Print Dokumen PDF</span>
          </button>
        </div>
      </div>

      {/* Official Bon Bahan Kimia Sheet Layout (Styled to match the official PDF document) */}
      <div 
        ref={printRef}
        className="bg-white text-slate-900 border border-slate-300 shadow-md rounded-xl p-8 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 font-sans"
      >
        {/* Document Title Header */}
        <div className="text-center pb-4 mb-4 border-b-2 border-slate-900">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-950 font-serif">
            BON BAHAN KIMIA
          </h1>
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
            Departemen Dyeing &amp; Finishing • Laboratorium Mutasi Kimia
          </div>
        </div>

        {/* Header Metadata Grid (2 Columns like in the PDF) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs pb-4 mb-4 border-b border-slate-300">
          
          {/* Left Column */}
          <div className="space-y-1.5 font-mono">
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Kode Resep</span>
              <span className="col-span-2 font-bold text-slate-950">: {recipe.no_resep}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Nomor KIKC</span>
              <span className="col-span-2 font-bold text-blue-900">: {nomorKikc}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Tgl Bon</span>
              <span className="col-span-2 text-slate-900">: {tglBon}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Jenis Resep</span>
              <span className="col-span-2 font-semibold text-slate-900">: {recipe.tipe_resep || 'REGULER'}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Berat Bahan</span>
              <span className="col-span-2 font-black text-slate-950">: {beratBahanKg.toLocaleString('id-ID')} kg</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Nomor Bon</span>
              <span className="col-span-2 font-semibold text-slate-900">: {nomorBon}</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-1.5 font-mono">
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Warna Benang</span>
              <span className="col-span-2 font-bold text-slate-950">: {recipe.warna}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Qty KG/Warna</span>
              <span className="col-span-2 text-slate-900">: {beratBahanKg} kg</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Customer</span>
              <span className="col-span-2 text-slate-900">: {customer || '-'}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Jns &amp; No Bng</span>
              <span className="col-span-2 font-semibold text-slate-900">: {recipe.no_bng}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Volume Air</span>
              <span className="col-span-2 font-black text-cyan-900">: {volumeAirLiter.toLocaleString('id-ID')} L</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Jns Cone</span>
              <span className="col-span-2 text-slate-900">: {jnsCone}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-slate-600 font-sans">Nomor Mesin</span>
              <span className="col-span-2 font-bold text-slate-950">: {nomorMesin}</span>
            </div>
          </div>

        </div>

        {/* Chemicals & Dyestuff Table (Exact PDF columns: No | Kode | Nama Bahan | Real Gram | Keterangan) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs border border-slate-900">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2 px-2.5 w-10 text-center border-r border-slate-400">No</th>
                <th className="py-2 px-2.5 w-32 border-r border-slate-400">Kode</th>
                <th className="py-2 px-3 border-r border-slate-400">Nama Bahan</th>
                <th className="py-2 px-3 w-32 text-right border-r border-slate-400">Real Gram</th>
                <th className="py-2 px-3 min-w-[180px]">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {sections.map((sec) => (
                <React.Fragment key={sec.tahap}>
                  {/* Section Separator Row */}
                  <tr className="bg-slate-200/90 font-bold text-[11px] text-slate-900 uppercase">
                    <td colSpan={5} className="py-1.5 px-3 border-y border-slate-400">
                      {sec.title}
                    </td>
                  </tr>

                  {/* Section Items */}
                  {sec.items.map((item) => (
                    <tr key={`${item.kode}-${item.no}`} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 text-center font-mono text-slate-700 border-r border-slate-300">
                        {item.no}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-slate-800 text-[11px] border-r border-slate-300">
                        {item.kode}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-300">
                        <div className="flex items-center justify-between">
                          <span>{item.namaBahan}</span>
                          <span className="text-[10px] font-mono text-slate-500 font-normal">
                            ({item.qty} {item.uom})
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-950 text-sm border-r border-slate-300">
                        {item.realGram.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">
                        {item.keterangan || '-'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              {/* Total Row */}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                <td colSpan={3} className="py-2.5 px-3 text-right text-slate-900 border-r border-slate-400">
                  TOTAL KEBUTUHAN KIMIA &amp; ZAT WARNA (GRAM):
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-base font-black text-blue-900 border-r border-slate-400">
                  {totalGramAll.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 text-xs font-mono text-slate-600">
                  {(totalGramAll / 1000).toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Notes & Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 text-[11px] font-mono text-slate-600 border-b border-slate-300">
          <div>
            <span className="font-sans text-slate-500">Aktif Manajer Tgl:</span> -
          </div>
          <div>
            <span className="font-sans text-slate-500">Cetak Resep Tgl:</span> {currentDateStr}
          </div>
          <div>
            <span className="font-sans text-slate-500">PKN AJL:</span> -
          </div>
          <div>
            <span className="font-sans text-slate-500">Total Cone:</span> {totalCone}
          </div>
        </div>

        {/* 4 Official Signatures (PPC, LAB, GD. Kimia Dyeing, Dyeing) */}
        <div className="pt-6 grid grid-cols-4 gap-4 text-center text-xs text-slate-800">
          <div>
            <div className="font-bold text-[11px] uppercase tracking-wider text-slate-600">Dikeluarkan</div>
            <div className="text-[10px] text-slate-500 font-semibold mb-12">( PPC )</div>
            <div className="border-t border-slate-900 w-24 mx-auto pt-1 font-mono text-[10px] text-slate-400">
              ( .................... )
            </div>
          </div>

          <div>
            <div className="font-bold text-[11px] uppercase tracking-wider text-slate-600">Diperiksa</div>
            <div className="text-[10px] text-slate-500 font-semibold mb-12">( LAB )</div>
            <div className="border-t border-slate-900 w-24 mx-auto pt-1 font-mono text-[10px] text-slate-400">
              ( .................... )
            </div>
          </div>

          <div>
            <div className="font-bold text-[11px] uppercase tracking-wider text-slate-600">Diterima</div>
            <div className="text-[10px] text-slate-500 font-semibold mb-12">( GD. Kimia Dyeing )</div>
            <div className="border-t border-slate-900 w-28 mx-auto pt-1 font-mono text-[10px] text-slate-400">
              ( .................... )
            </div>
          </div>

          <div>
            <div className="font-bold text-[11px] uppercase tracking-wider text-slate-600">Diproses</div>
            <div className="text-[10px] text-slate-500 font-semibold mb-12">( Dyeing )</div>
            <div className="border-t border-slate-900 w-24 mx-auto pt-1 font-mono text-[10px] text-slate-400">
              ( .................... )
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
