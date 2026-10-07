import React, { useState } from 'react';
import { 
  Sparkles, 
  Cpu, 
  FileSpreadsheet, 
  Layers, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Copy, 
  Check, 
  UploadCloud, 
  FileText, 
  FlaskConical, 
  Scale, 
  ShieldAlert, 
  MessageSquare,
  ArrowRight,
  Info,
  RefreshCw,
  GitCompare,
  Activity,
  Award,
  ChevronDown,
  ChevronUp,
  Send,
  CornerDownLeft
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ResepDetail, 
  MesinCelup, 
  WorkOrderDyeing, 
  StokKimiaItem, 
  AiProviderId, 
  AnalysisTarget, 
  AnalysisType, 
  MultiModelAnalysisResult 
} from '../types/resep';
import { runMultiModelAnalysis } from '../services/geminiService';
import { extractLotKeyword, resolveLotDetails } from '../utils/lotExtractor';

interface AnalisisCerdasAiViewProps {
  recipes: ResepDetail[];
  machines: MesinCelup[];
  workOrders: WorkOrderDyeing[];
  stokItems: StokKimiaItem[];
  onOpenRphModal: () => void;
  onOpenUploadCsv: () => void;
}

export const AnalisisCerdasAiView: React.FC<AnalisisCerdasAiViewProps> = ({
  recipes,
  machines,
  workOrders,
  stokItems,
  onOpenRphModal,
  onOpenUploadCsv,
}) => {
  // State: Default provider is Trio Konsensus (Gemini + ChatGPT + Claude)
  const [selectedProvider, setSelectedProvider] = useState<AiProviderId>('all_three');
  const [selectedTarget, setSelectedTarget] = useState<AnalysisTarget>('cross_file');
  const [selectedType, setSelectedType] = useState<AnalysisType>('audit_dosis');
  
  // Interactive Chat / Problem Input
  const [problemInput, setProblemInput] = useState<string>('');
  const [customFileText, setCustomFileText] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  
  // Default selected lot from workOrders
  const [selectedWodLot, setSelectedWodLot] = useState<string>(
    workOrders.length > 0 ? (workOrders[0].kikc || workOrders[0].no_wod) : 'AHN26F001'
  );
  
  // Advanced Settings Collapsible: hidden at the bottom by default as requested
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MultiModelAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File upload handler for custom file
  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCustomFileText(content || '');
    };
    reader.readAsText(file);
  };

  // Find active WOD lot details using robust lotExtractor
  const resolvedWod = resolveLotDetails(selectedWodLot, workOrders, recipes);
  const activeWod = workOrders.find(w => (w.kikc === selectedWodLot || w.no_wod === selectedWodLot)) || resolvedWod;
  const activeRecipe = recipes.find(r => r.no_resep === resolvedWod.no_resep);
  const resolvedBng = (resolvedWod.no_bng && resolvedWod.no_bng !== '-' && resolvedWod.no_bng.toLowerCase() !== 'null') 
    ? resolvedWod.no_bng 
    : (activeRecipe?.no_bng || 'TM Ne 80/2 Katun Sarung');
  const resolvedMc = (resolvedWod.no_mc && resolvedWod.no_mc !== '-' && resolvedWod.no_mc.toLowerCase() !== 'null') 
    ? resolvedWod.no_mc 
    : 'THIES A13';
  const beratKg = resolvedWod.berat_Benang_kg || 125.0;
  const volAir = resolvedWod.volume_air_liter || Math.round(beratKg * 10);
  const liquorRatio = (volAir / beratKg).toFixed(1);

  // Auto-detect lot when user types in Problem Input - NEVER default to only one lot
  const handleProblemInputChange = (text: string) => {
    setProblemInput(text);
    const detectedKey = extractLotKeyword(text, workOrders);
    if (detectedKey) {
      setSelectedWodLot(detectedKey);
    }
  };

  // Quick Problem Chips to fill and run
  const quickProblemExamples = [
    {
      label: '🎨 Celupan Kurang Tua',
      prompt: `AHN26F001 celupan tersebut kurang tua, temukan masalahnya dan berikan solusi up dosisnya.`,
      lot: 'AHN26F001'
    },
    {
      label: '💧 Luntur Bagian Dalam Bobbin',
      prompt: `Lot AHN26F002 terjadi luntur bagian dalam, temukan masalahnya dan berikan solusinya.`,
      lot: 'AHN26F002'
    },
    {
      label: '🧵 Garis Pakan (Weft Bar)',
      prompt: `Lot AHN26F001 timbul garis pakan (weft bar) di tenun sarung, periksa korelasi densitas winding dan lot pakan.`,
      lot: 'AHN26F001'
    },
    {
      label: '⚖️ Audit Dosis Resep & Glauber',
      prompt: `Audit formulasi dosis zat warna, garam Glauber dan fiksasi soda ash untuk warna ${activeWod?.warna || 'A.M.04.A'}.`,
      lot: activeWod?.kikc || activeWod?.no_wod || 'AHN26F001'
    },
    {
      label: '⚙️ Cek Beban vs Mesin Celup',
      prompt: `Audit kesesuaian kapasitas mesin ${resolvedMc} (${activeWod?.berat_Benang_kg} kg) terhadap volume air dan sirkulasi pompa.`,
      lot: activeWod?.kikc || activeWod?.no_wod || 'AHN26F001'
    }
  ];

  // Execute Analysis
  const handleExecuteAnalysis = async (
    overrideProvider?: AiProviderId,
    overridePrompt?: string, 
    overrideType?: AnalysisType, 
    overrideTarget?: AnalysisTarget,
    overrideLot?: string
  ) => {
    setIsLoading(true);
    setErrorMsg(null);

    const providerToUse = overrideProvider || selectedProvider;
    const typeToUse = overrideType || selectedType;
    const targetToUse = overrideTarget || selectedTarget;
    const promptToUse = overridePrompt !== undefined ? overridePrompt : problemInput;
    const lotToUse = overrideLot !== undefined ? overrideLot : selectedWodLot;

    try {
      const result = await runMultiModelAnalysis({
        provider: providerToUse,
        target: targetToUse,
        analysisType: typeToUse,
        customPrompt: promptToUse,
        selectedWodLot: lotToUse,
        customFileText: targetToUse === 'custom' ? customFileText : undefined,
        customFileName: targetToUse === 'custom' ? customFileName : undefined,
        recipes,
        machines,
        workOrders,
        stokItems,
      });

      setAnalysisResult(result);
    } catch (err: any) {
      console.error('Execution error:', err);
      setErrorMsg(err?.message || 'Terjadi gangguan saat memproses analisis.');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy result markdown
  const handleCopyResult = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Presets Khusus Pabrik Sarung (untuk ditaruh di bagian bawah yang disembunyikan)
  const quickQuestions = [
    {
      title: '🎨 Solusi Celup: Warna Kurang Tua (Up Dosis)',
      prompt: 'Ketika analisa ai diminta untuk memberikan solusi misalkan celup warnanya kurang tua maka analisa ai akan mengecek lot (KIKC) tsb menggunakan kode resep apa, kemudian akan mengecek item-item apa saja yang ada di kode resep tersebut lalu akan mengecek komposisi penggunaan item tersebut lalu melakukan analisa dari resep maupun ketiga sumber AI (Gemini, ChatGPT, Claude) item mana yang ada di kode resep yang perlu di up prosentasenya atau jumlahnya.',
      type: 'audit_dosis' as AnalysisType,
      target: 'cross_file' as AnalysisTarget,
      provider: 'all_three' as AiProviderId,
      badge: 'Up Dosis Resep'
    },
    {
      title: '💧 Investigasi Cacat Luntur Bagian Dalam Bobbin Cone',
      prompt: 'Lot AHN26F002 terjadi luntur bagian dalam cone, temukan masalahnya dan berikan solusinya (audit kinetika pencucian soaping, densitas winding, dan siklus sirkulasi pompa).',
      type: 'cacat_belang_sarung' as AnalysisType,
      target: 'cross_file' as AnalysisTarget,
      provider: 'all_three' as AiProviderId,
      badge: 'Solusi Luntur'
    },
    {
      title: 'Audit Densitas Winding Cone vs Penetrasi Celup',
      prompt: 'Analisis densitas bobbin soft winding (target 0.34-0.38 g/cm³) dan sudut gulung 26° pada benang katun sarung Ne 60/2 untuk mencegah belang inner-outer shade.',
      type: 'winding_density' as AnalysisType,
      target: 'winding' as AnalysisTarget,
      provider: 'openai' as AiProviderId,
      badge: 'OpenAI ChatGPT'
    },
    {
      title: 'Troubleshooting Garis Pakan (Weft Bar) Sarung',
      prompt: 'Lakukan investigasi forensik penyebab timbulnya garis pakan (weft bar) pada motif sarung tenun, korelasi perbedaan lot celup cone pakan dan variasi tegangan winding.',
      type: 'cacat_belang_sarung' as AnalysisType,
      target: 'cross_file' as AnalysisTarget,
      provider: 'claude' as AiProviderId,
      badge: 'Claude QA'
    },
    {
      title: 'Formulasi Celup Reaktif & Indanthren Sarung',
      prompt: 'Audit resep celup benang katun sarung palekat: periksa kinetika garam Glauber, penambahan bertahap Soda Ash, dan uji ketahanan luntur cuci ISO 105-C06.',
      type: 'audit_dosis' as AnalysisType,
      target: 'resep' as AnalysisTarget,
      provider: 'gemini' as AiProviderId,
      badge: 'Gemini Chemist'
    },
    {
      title: 'Konsensus 3 Pakar AI (Dyeing, Winding & Mutu)',
      prompt: 'Lakukan audit menyeluruh terpadu: evaluasi kompatibilitas beban lot WOD vs kapasitas mesin celup MC, kesiapan winding, dan ketersediaan stok kimia kritis.',
      type: 'mesin_kapasitas' as AnalysisType,
      target: 'cross_file' as AnalysisTarget,
      provider: 'all_three' as AiProviderId,
      badge: 'Trio Konsensus'
    }
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Section */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Analisis Cerdas AI (Multi-Model Pabrik Sarung)
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Gemini • OpenAI • Claude
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Konsensus 3 pakar tekstil: <b>Google Gemini</b> (Dyeing & Kimia), <b>OpenAI ChatGPT</b> (Winding & Tenun), dan <b>Anthropic Claude</b> (Audit Mutu, Cacat & K3).
                </p>
              </div>
            </div>
          </div>

          {/* Dataset Status Summary Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={onOpenRphModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Sheet Resep"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold">{recipes.length}</span> Resep
            </button>

            <button
              onClick={onOpenRphModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Sheet WOD"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-semibold">{workOrders.length}</span> Lot WOD
            </button>

            <button
              onClick={onOpenRphModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Sheet MC"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold">{machines.length}</span> Mesin Celup
            </button>

            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
              title="Sheet STOK (MUTKIMYD)"
            >
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-semibold">{stokItems.length}</span> Stok Kimia
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SECTION UTAMA: "TABEL / CHAT PROBLEM"                                 */}
      {/* Alur Wajib 3 Fase: Lot WOD + Chat Problem Interaktif                      */}
      {/* ========================================================================= */}
      <div id="section-chat-problem" className="bg-white rounded-2xl border border-indigo-200/90 shadow-sm overflow-hidden">
        
        {/* Header Alur Wajib & Chat Problem */}
        <div className="bg-gradient-to-r from-indigo-50/90 via-blue-50/50 to-white px-5 py-4 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                TABEL / CHAT PROBLEM (Konsensus 3 Pakar AI)
              </h2>
              <p className="text-[11px] text-slate-500">
                Ketik masalah celup atau pilih lot WOD di bawah untuk memulai investigasi 3 Fase terstruktur.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
              3 FASE: WOD ➔ RESEP ➔ SOLUSI 3 AI
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Alur Wajib: Selector Lot WOD & Live Lot Status Pill */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-slate-50/80 rounded-xl p-3.5 border border-slate-200">
            
            {/* Selector Dropdown */}
            <div className="lg:col-span-5 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Alur Wajib: Pilih Lot KIKC (Sheet WOD):
              </label>
              <select
                value={selectedWodLot}
                onChange={(e) => setSelectedWodLot(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden cursor-pointer"
              >
                {/* Dynamically insert detected custom lot if not in standard list */}
                {selectedWodLot && !workOrders.some(w => (w.kikc === selectedWodLot || w.no_wod === selectedWodLot)) && (
                  <option value={selectedWodLot}>
                    Lot {selectedWodLot} | Warna: {resolvedWod.warna} | Resep: {resolvedWod.no_resep} | MC: {resolvedWod.no_mc} ({resolvedWod.berat_Benang_kg} kg) [Terdeteksi dari Chat]
                  </option>
                )}
                {workOrders.map((w) => {
                  const id = w.kikc || w.no_wod;
                  const assoc = recipes.find(r => r.no_resep === w.no_resep);
                  return (
                    <option key={id} value={id}>
                      Lot {id} | Warna: {w.warna || assoc?.warna || '-'} | Resep: {w.no_resep} | MC: {w.no_mc} ({w.berat_Benang_kg} kg)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Live Active Lot Details Card */}
            <div className="lg:col-span-7 bg-white rounded-lg p-2.5 border border-indigo-100 text-xs shadow-2xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Lot Aktif:</span>
                  <span className="font-bold text-indigo-950 block truncate">
                    Lot {activeWod?.kikc || activeWod?.no_wod || selectedWodLot}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Kode Resep:</span>
                  <span className="font-semibold text-slate-900 block truncate" title={activeWod?.no_resep}>
                    {activeWod?.no_resep} ({activeWod?.warna || activeRecipe?.warna})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Benang:</span>
                  <span className="font-semibold text-slate-800 block truncate" title={resolvedBng}>
                    {resolvedBng}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Mesin / Rasio Air:</span>
                  <span className="font-semibold text-emerald-700 block truncate">
                    {resolvedMc} ({beratKg} kg • L:R 1:{liquorRatio})
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Chat Problem Input Box (Interaktif) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                Ketik Pertanyaan / Problem Celup Tekstil Anda:
              </label>
              
              {/* Active lot indicator badge */}
              <span className="text-[10px] font-medium text-slate-500">
                Target Lot: <b className="text-indigo-700">Lot {activeWod?.kikc || activeWod?.no_wod || selectedWodLot}</b>
              </span>
            </div>

            <div className="relative rounded-xl border border-slate-300 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 bg-white transition-all shadow-2xs">
              <textarea
                id="input-chat-problem"
                rows={3}
                value={problemInput}
                onChange={(e) => handleProblemInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (problemInput.trim()) {
                      handleExecuteAnalysis();
                    }
                  }
                }}
                placeholder='Ketik masalah lot di sini... Misalnya: "AHN26F001 celupan tersebut kurang tua" atau "Lot AHN26F002 terjadi luntur bagian dalam, temukan masalahnya dan berikan solusinya"...'
                className="w-full text-xs sm:text-sm p-3.5 text-slate-900 placeholder-slate-400 bg-transparent outline-hidden resize-none"
              />

              {/* Toolbar inside input box */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-t border-slate-100 bg-slate-50/60 rounded-b-xl">
                
                {/* Compact AI Source Selector */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500 mr-1 uppercase">Model:</span>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('all_three')}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      selectedProvider === 'all_three'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                    }`}
                  >
                    🌟 Trio Konsensus (3 AI)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedProvider('gemini')}
                    className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-all cursor-pointer ${
                      selectedProvider === 'gemini'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                    }`}
                  >
                    🔵 Gemini (Dyeing)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedProvider('openai')}
                    className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-all cursor-pointer ${
                      selectedProvider === 'openai'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                    }`}
                  >
                    🟢 ChatGPT (Winding)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedProvider('claude')}
                    className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-all cursor-pointer ${
                      selectedProvider === 'claude'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                    }`}
                  >
                    🟣 Claude (Mutu)
                  </button>
                </div>

                {/* Primary Action Button */}
                <button
                  id="btn-kirim-chat-problem"
                  type="button"
                  onClick={() => handleExecuteAnalysis()}
                  disabled={isLoading}
                  className="py-2 px-4 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 hover:via-indigo-700 hover:to-emerald-700 shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menganalisis...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Kirim & Analisis Masalah (3 Fase)</span>
                      <CornerDownLeft className="w-3 h-3 ml-0.5 opacity-70 hidden sm:inline" />
                    </>
                  )}
                </button>

              </div>
            </div>

            {/* Quick Interactive Problem Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Contoh Cepat (1-Klik):</span>
              {quickProblemExamples.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setProblemInput(qp.prompt);
                    if (qp.lot) setSelectedWodLot(qp.lot);
                    handleExecuteAnalysis(selectedProvider, qp.prompt, 'audit_dosis', 'cross_file', qp.lot);
                  }}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {qp.label}
                </button>
              ))}
            </div>

          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECTION KEDUA: "Hasil Laporan Analisis Teknis Pabrik Sarung"           */}
      {/* Tampil langsung setelah TABEL / CHAT PROBLEM                               */}
      {/* ========================================================================= */}
      <div id="section-hasil-laporan" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden min-h-[520px] flex flex-col">
        
        {/* Header of Result */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Hasil Laporan Analisis Teknis Pabrik Sarung
            </h3>
            {analysisResult && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                analysisResult.providerUsed === 'openai'
                  ? 'bg-emerald-100 text-emerald-800'
                  : analysisResult.providerUsed === 'claude'
                  ? 'bg-purple-100 text-purple-800'
                  : analysisResult.providerUsed === 'gemini'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-indigo-100 text-indigo-800'
              }`}>
                Penyedia: {analysisResult.providerUsed?.toUpperCase() || 'AI'} ({analysisResult.modelUsed})
              </span>
            )}
          </div>

          {analysisResult && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                {analysisResult.timestamp}
              </span>
              <button
                onClick={handleCopyResult}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-300 hover:bg-white text-slate-700 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin Laporan</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Menjalankan Alur 3 Fase Analisis Pabrik Sarung...
                </h4>
                <p className="text-xs text-slate-500 max-w-md">
                  Fase 1: Verifikasi Sheet WOD ➔ Fase 2: Penelusuran Sheet Resep ➔ Fase 3: Investigasi Akar Masalah & Rekomendasi 3 AI Pakar Tekstil.
                </p>
              </div>
            </div>
          ) : analysisResult ? (
            <div className="prose prose-sm max-w-none text-slate-800 prose-headings:text-slate-900 prose-headings:font-bold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-table:text-xs prose-th:bg-slate-100 prose-th:p-2.5 prose-td:p-2.5 prose-td:border-b prose-td:border-slate-200">
              <Markdown remarkPlugins={[remarkGfm]}>
                {analysisResult.markdown}
              </Markdown>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-3 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700">
                  Siap Menjalankan Analisis Cerdas Interaktif
                </h4>
                <p className="text-xs text-slate-500 max-w-md">
                  Ketik masalah lot celup pada kolom di atas (misalnya: <i>"AHN26F001 celupan tersebut kurang tua"</i> atau <i>"Lot AHN26F002 terjadi luntur bagian dalam, temukan masalahnya dan berikan solusinya"</i>) lalu klik <b>Kirim & Analisis Masalah</b>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const samplePrompt = 'AHN26F001 celupan tersebut kurang tua, temukan masalahnya dan berikan solusi up dosisnya.';
                  setProblemInput(samplePrompt);
                  setSelectedWodLot('AHN26F001');
                  handleExecuteAnalysis('all_three', samplePrompt, 'audit_dosis', 'cross_file', 'AHN26F001');
                }}
                className="mt-2 py-2 px-3.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
              >
                Coba Contoh: Lot AHN26F001 Celupan Kurang Tua
              </button>
            </div>
          )}
        </div>

        {/* Footer Summary / Disclaimer */}
        <div className="p-3 px-6 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            Standar Teknis: Kinetika Reaktif, Densitas Winding 0.35 g/cm³, dan ISO 105 Mutu Sarung Tenun.
          </span>
          <span className="font-semibold text-slate-600">
            Sistem MUTKIMYD & RPH Pabrik Sarung
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. SECTION KETIGA: PENGATURAN LANJUTAN, PRESET & DATASET                  */}
      {/* Ditaruh & Disembunyikan pada bagian bawah setelah Hasil Laporan            */}
      {/* ========================================================================= */}
      <div id="section-advanced-presets-hidden" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Toggle Button: Tampilkan / Sembunyikan */}
        <button
          type="button"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className="w-full px-5 py-4 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
              {showAdvancedSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>Pengaturan Lanjutan, Preset Analisis & Dataset Pabrik</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {showAdvancedSettings ? 'Terbuka' : 'Disembunyikan'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Preset Analisis Khusus Pabrik Sarung (1-Klik), Pilihan Sumber AI Pakar Tekstil, dan Target File / Dataset.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <span>{showAdvancedSettings ? 'Tutup Pengaturan' : 'Buka Pengaturan'}</span>
            {showAdvancedSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Collapsible Content */}
        {showAdvancedSettings && (
          <div className="p-5 sm:p-6 border-t border-slate-200 space-y-6 bg-slate-50/30">
            
            {/* Bagian A: Preset Analisis Khusus Pabrik Sarung (1-Klik) */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  Preset Analisis Khusus Pabrik Sarung (1-Klik):
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Multi-Model: Gemini • OpenAI • Claude
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedProvider(q.provider);
                      setSelectedType(q.type);
                      setSelectedTarget(q.target);
                      setProblemInput(q.prompt);
                      handleExecuteAnalysis(q.provider, q.prompt, q.type, q.target, selectedWodLot);
                      // Scroll up to report
                      const reportEl = document.getElementById('section-hasil-laporan');
                      if (reportEl) reportEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group cursor-pointer bg-white"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-700 line-clamp-1">
                        {q.title}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        q.provider === 'openai' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : q.provider === 'claude' 
                          ? 'bg-purple-100 text-purple-800' 
                          : q.provider === 'gemini' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {q.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {q.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Grid 2 Kolom: 1. Pilih Sumber AI & 2. Target File / Dataset */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* 1. Pilih Sumber AI Pakar Tekstil */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  1. Pilih Sumber AI Pakar Tekstil
                </label>
                <div className="space-y-2.5">
                  
                  {/* Trio */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('all_three')}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedProvider === 'all_three'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                        Konsensus 3 Pakar AI (Trio)
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        Direkomendasikan
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Memadukan analisis Google Gemini (Dyeing), OpenAI ChatGPT (Winding), dan Anthropic Claude (Mutu & Cacat) ke dalam 1 kesimpulan terpadu.
                    </p>
                  </button>

                  {/* Gemini */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('gemini')}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedProvider === 'gemini'
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        Google Gemini
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Pakar Dyeing & Kimia
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Spesialis zat warna reaktif/indanthren, migrasi garam Glauber, kinetika fiksasi alkali soda ash, dan rasio air L:R 1:8-10.
                    </p>
                  </button>

                  {/* OpenAI */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('openai')}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedProvider === 'openai'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        OpenAI ChatGPT
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Pakar Winding & Tenun
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Spesialis densitas soft winding (0.35 g/cm³), angle of wind, pelilinan waxing roller, dan kelancaran pakan tenun sarung.
                    </p>
                  </button>

                  {/* Claude */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('claude')}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedProvider === 'claude'
                        ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                        Anthropic Claude
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        Pakar Mutu, Cacat & K3
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Spesialis forensik cacat sarung (garis pakan/weft bar, belang celup), audit beban mesin MC, serta keselamatan kerja bahan B3.
                    </p>
                  </button>

                </div>
              </div>

              {/* 2. Target File / Dataset */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  2. Target File / Dataset
                </label>
                <div className="space-y-1.5">
                  {[
                    {
                      id: 'cross_file' as AnalysisTarget,
                      label: 'Analisis Terintegrasi (Lintas File Pabrik)',
                      desc: 'Resep Celup + WOD + MC + STOK + Winding',
                      badge: 'Full Lintas File',
                    },
                    {
                      id: 'winding' as AnalysisTarget,
                      label: 'Modul Winding Benang Sarung',
                      desc: 'Densitas Cone, Bobbin, Waxing & Tegangan',
                      badge: 'Winding',
                    },
                    {
                      id: 'resep' as AnalysisTarget,
                      label: 'File Resep Celup',
                      desc: `${recipes.length} resep (Sheet Resep / Resep.csv)`,
                      badge: 'Resep',
                    },
                    {
                      id: 'wod' as AnalysisTarget,
                      label: 'File Work Order Dyeing (WOD)',
                      desc: `${workOrders.length} lot aktif dengan nomor KIKC`,
                      badge: 'WOD',
                    },
                    {
                      id: 'mc' as AnalysisTarget,
                      label: 'File Mesin Celup (MC)',
                      desc: `${machines.length} mesin celup & kapasitas kg`,
                      badge: 'MC',
                    },
                    {
                      id: 'stok' as AnalysisTarget,
                      label: 'File Stok Kimia (MUTKIMYD)',
                      desc: `${stokItems.length} item stok & status DoH`,
                      badge: 'STOK',
                    },
                    {
                      id: 'custom' as AnalysisTarget,
                      label: 'Unggah / Masukkan File Kustom',
                      desc: 'Upload file CSV, log teks, atau paste data',
                      badge: 'Kustom',
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedTarget(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between border transition-all ${
                        selectedTarget === item.id
                          ? 'border-indigo-500 bg-indigo-50/70 font-semibold text-indigo-950'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{item.label}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{item.desc}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {item.badge}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Custom file upload box */}
                {selectedTarget === 'custom' && (
                  <div className="mt-3 p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-2">
                    <div className="flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-700">Upload File Kustom:</span>
                    </div>
                    <input
                      type="file"
                      accept=".csv,.txt,.json"
                      onChange={handleCustomFileUpload}
                      className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {customFileName && (
                      <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        File siap: {customFileName} ({customFileText.length} karakter)
                      </div>
                    )}
                    <textarea
                      rows={3}
                      value={customFileText}
                      onChange={(e) => setCustomFileText(e.target.value)}
                      placeholder="Atau tempel (paste) isi tabel teks / CSV disini..."
                      className="w-full text-xs font-mono p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
