import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  FlaskConical, 
  Printer, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert, 
  Layers, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { ResepDetail, TahapProsesGroup, JenisProses } from '../types/resep';
import { getColorSwatch } from '../utils/colorHelper';
import { getRecipeInsight } from '../services/geminiService';

interface ResepDetailViewProps {
  resep: ResepDetail;
  onBack: () => void;
  onOpenCalculator: (resep: ResepDetail) => void;
}

export const ResepDetailView: React.FC<ResepDetailViewProps> = ({
  resep,
  onBack,
  onOpenCalculator,
}) => {
  const [openStages, setOpenStages] = useState<Record<string, boolean>>({
    PRETREATMENT: true,
    PROCESSING: true,
    'AFTER TREATMENT': true,
  });

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const swatch = getColorSwatch(resep.warna);

  const toggleStage = (stage: string) => {
    setOpenStages(prev => ({ ...prev, [stage]: !prev[stage] }));
  };

  const handleFetchAiInsight = async () => {
    setIsLoadingInsight(true);
    setInsightError(null);
    try {
      const insight = await getRecipeInsight(resep);
      setAiInsight(insight);
    } catch (err: any) {
      setInsightError(err?.message || 'Gagal memuat AI insight');
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStageBadgeColor = (stage: JenisProses) => {
    switch (stage) {
      case 'PRETREATMENT':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'AFTER TREATMENT':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-900 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <button
          id="btn-back-to-list"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-xl transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Resep</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Print Recipe */}
          <button
            id="btn-print-resep"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors"
            title="Cetak kartu formulir resep"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Cetak Resep</span>
          </button>

          {/* AI Resep Insight */}
          <button
            id="btn-ai-insight"
            onClick={handleFetchAiInsight}
            disabled={isLoadingInsight}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isLoadingInsight ? 'animate-spin' : 'text-amber-300'}`} />
            <span>{isLoadingInsight ? 'Menganalisis...' : 'AI Resep Insight'}</span>
          </button>

          {/* Calculate Batch */}
          <button
            id="btn-calc-batch"
            onClick={() => onOpenCalculator(resep)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
          >
            <FlaskConical className="w-4 h-4" />
            <span>Hitung Komposisi Batch</span>
          </button>
        </div>
      </div>

      {/* Header Info Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                Kode Resep Produksi
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                resep.tipe_resep === 'CORAK'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {resep.tipe_resep}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Unit: DYG - PGG
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {resep.no_resep}
            </h2>
          </div>

          {/* Right badges */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Color Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200">
              <span 
                className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs inline-block shrink-0" 
                style={{ backgroundColor: swatch.bg.startsWith('hsl') ? swatch.bg : undefined }}
              />
              <div>
                <div className="text-[10px] text-slate-500 font-medium">Warna</div>
                <div className="text-sm font-bold text-slate-900 font-mono">{resep.warna}</div>
              </div>
            </div>

            {/* Yarn Type Badge */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-medium">Jenis Benang / Substrat</div>
              <div className="text-sm font-bold text-slate-900">{resep.no_bng}</div>
            </div>

            {/* Total Chemicals */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-medium">Komposisi Bahan</div>
              <div className="text-sm font-bold text-slate-900">{resep.total_bahan} Bahan</div>
            </div>
          </div>
        </div>

        {/* AI Insight Box (if available) */}
        {(aiInsight || isLoadingInsight || insightError) && (
          <div className="mt-4 p-4 rounded-xl bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>AI Resep Insight (Analisis Teknis & Keselamatan)</span>
            </div>
            {isLoadingInsight && (
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Sedang menganalisis formulasi bahan kimia dan durasi proses...</span>
              </div>
            )}
            {insightError && (
              <p className="text-sm text-red-600">{insightError}</p>
            )}
            {aiInsight && (
              <p className="text-sm text-slate-800 leading-relaxed font-normal">
                {aiInsight}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Accordion Stages */}
      <div className="space-y-4">
        {resep.tahap_proses.map((stageGroup) => {
          const isOpen = openStages[stageGroup.tahap] ?? true;
          return (
            <div
              key={stageGroup.tahap}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs transition-shadow"
            >
              {/* Stage Header Accordion Toggle */}
              <button
                id={`stage-accordion-${stageGroup.tahap}`}
                onClick={() => toggleStage(stageGroup.tahap)}
                className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition-colors text-left border-b border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getStageBadgeColor(stageGroup.tahap)}`}>
                    {stageGroup.tahap}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {stageGroup.langkah.length} Langkah Bahan
                  </span>
                </div>
                <div className="text-slate-400 hover:text-slate-600">
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {/* Stage Content Table */}
              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="py-3 px-4 w-12 text-center">No</th>
                        <th className="py-3 px-4 min-w-[220px]">Bahan Kimia (mat_name)</th>
                        <th className="py-3 px-4 w-28">Kode (mat_code)</th>
                        <th className="py-3 px-4 w-28 text-right">Dosis Resep</th>
                        <th className="py-3 px-4 w-28">Basis Hitung</th>
                        <th className="py-3 px-4 min-w-[140px]">Sub-Proses</th>
                        <th className="py-3 px-4 min-w-[200px]">Parameter Proses (drd.notes)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stageGroup.langkah.map((step, idx) => {
                        const isOwf = step.uom_code === '%';
                        return (
                          <tr 
                            key={`${step.mat_code}-${idx}`} 
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="py-3 px-4 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900">
                                {step.mat_name}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500">
                              {step.mat_code || '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-extrabold text-blue-700 font-mono text-sm">
                                {step.qty}
                              </span>
                              <span className="ml-1 text-slate-600 font-semibold">
                                {step.uom_code}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                isOwf
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-cyan-100 text-cyan-800'
                              }`}>
                                {isOwf ? '% Berat Benang' : 'Gr/l Larutan'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                                {step.ket_proses_desc}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-800 font-mono text-[11px]">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {step.catatan_proses || '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
