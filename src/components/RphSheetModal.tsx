import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Cpu,
  Calendar,
  Layers,
  HelpCircle,
  Link,
  Info
} from 'lucide-react';
import {
  getRphConfig,
  fetchLiveRphAllSheets,
  fetchLiveResepFromRph,
  fetchLiveMcFromRph,
  fetchLiveWodFromRph,
  saveRphConfig,
  SyncRphResult,
  DEFAULT_RPH_SPREADSHEET_ID,
  DEFAULT_RPH_SPREADSHEET_URL,
} from '../services/sheetsService';
import { ResepDetail, MesinCelup, WorkOrderDyeing } from '../types/resep';

interface RphSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipesUpdated: (recipes: ResepDetail[]) => void;
  onMcUpdated?: (machines: MesinCelup[]) => void;
  onWodUpdated?: (orders: WorkOrderDyeing[]) => void;
  currentRecipeCount: number;
  currentMcCount?: number;
  currentWodCount?: number;
}

export const RphSheetModal: React.FC<RphSheetModalProps> = ({
  isOpen,
  onClose,
  onRecipesUpdated,
  onMcUpdated,
  onWodUpdated,
  currentRecipeCount,
  currentMcCount = 0,
  currentWodCount = 0,
}) => {
  const [config, setConfig] = useState(getRphConfig());
  const [inputUrl, setInputUrl] = useState(config.spreadsheetIdOrUrl || DEFAULT_RPH_SPREADSHEET_ID);
  const [sheetResep, setSheetResep] = useState(config.sheetResep || 'Resep');
  const [sheetMc, setSheetMc] = useState(config.sheetMc || 'MC');
  const [sheetWod, setSheetWod] = useState(config.sheetWod || 'WOD');

  const [isLoading, setIsLoading] = useState(false);
  const [activeSyncTarget, setActiveSyncTarget] = useState<'ALL' | 'Resep' | 'MC' | 'WOD'>('ALL');
  const [syncResult, setSyncResult] = useState<SyncRphResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getRphConfig();
      setConfig(current);
      setInputUrl(current.spreadsheetIdOrUrl || DEFAULT_RPH_SPREADSHEET_ID);
      setSheetResep(current.sheetResep || 'Resep');
      setSheetMc(current.sheetMc || 'MC');
      setSheetWod(current.sheetWod || 'WOD');
      setErrorMsg(null);
      setSyncResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    const finalUrl = inputUrl.trim() || DEFAULT_RPH_SPREADSHEET_ID;
    return saveRphConfig({
      spreadsheetIdOrUrl: finalUrl,
      sheetResep: sheetResep.trim() || 'Resep',
      sheetMc: sheetMc.trim() || 'MC',
      sheetWod: sheetWod.trim() || 'WOD',
    });
  };

  // 1-Click Sync All 3 Sheets
  const handleSyncAll = async () => {
    const effectiveUrl = inputUrl.trim() || DEFAULT_RPH_SPREADSHEET_ID;

    setIsLoading(true);
    setActiveSyncTarget('ALL');
    setErrorMsg(null);
    setSyncResult(null);

    try {
      handleSaveConfig();
      const result = await fetchLiveRphAllSheets(effectiveUrl);
      setSyncResult(result);
      setConfig(getRphConfig());

      if (result.recipes.length > 0) {
        onRecipesUpdated(result.recipes);
      }
      if (result.machines.length > 0 && onMcUpdated) {
        onMcUpdated(result.machines);
      }
      if (result.workOrders.length > 0 && onWodUpdated) {
        onWodUpdated(result.workOrders);
      }

      if (Object.keys(result.errors).length > 0) {
        setErrorMsg(Object.entries(result.errors).map(([k, v]) => `[Sheet ${k}]: ${v}`).join('\n'));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyinkronkan data spreadsheet RPH');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync specific sheet
  const handleSyncSingle = async (target: 'Resep' | 'MC' | 'WOD') => {
    const effectiveUrl = inputUrl.trim() || DEFAULT_RPH_SPREADSHEET_ID;

    setIsLoading(true);
    setActiveSyncTarget(target);
    setErrorMsg(null);

    try {
      handleSaveConfig();
      if (target === 'Resep') {
        const recipes = await fetchLiveResepFromRph(effectiveUrl, sheetResep);
        onRecipesUpdated(recipes);
      } else if (target === 'MC') {
        const mc = await fetchLiveMcFromRph(effectiveUrl, sheetMc);
        if (onMcUpdated) onMcUpdated(mc);
      } else if (target === 'WOD') {
        const wod = await fetchLiveWodFromRph(effectiveUrl, sheetWod);
        if (onWodUpdated) onWodUpdated(wod);
      }
      setConfig(getRphConfig());
    } catch (err: any) {
      setErrorMsg(err?.message || `Gagal menyinkronkan sheet ${target}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formattedDate = config.lastSyncedAt
    ? new Date(config.lastSyncedAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Belum pernah disinkronkan';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Koneksi Spreadsheet &ldquo;RPH&rdquo;
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                  Resep • MC • WOD
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Sinkronkan 3 sheet utama: <strong>Resep</strong> (formulasi celup), <strong>MC</strong> (mesin celup), dan <strong>WOD</strong> (jadwal kerja lot)
              </p>
            </div>
          </div>
          <button
            id="close-rph-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">

          {/* Information regarding Embedded RPH Spreadsheet */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-950">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                <span>Spreadsheet RPH Ditanam Permanen</span>
                <span className="text-[10px] font-mono bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-semibold">
                  {DEFAULT_RPH_SPREADSHEET_ID}
                </span>
              </p>
              <p className="text-emerald-800 leading-relaxed text-[11px]">
                ID dan link dokumen Google Sheets RPH Anda telah ditanam ke dalam sistem. Anda tidak perlu lagi bolak-balik menyalin link atau ID. Cukup klik tombol <strong>&ldquo;Sinkronkan 3 Sheet&rdquo;</strong> di bawah untuk memperbarui data Resep, Mesin Celup (MC), dan Work Order (WOD).
              </p>
            </div>
          </div>

          {/* Current Live Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 mb-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Sheet &ldquo;{sheetResep}&rdquo;</span>
              </div>
              <div className="text-base font-bold text-slate-900 font-mono">
                {currentRecipeCount} <span className="text-xs font-normal text-slate-500">resep</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 mb-1">
                <Cpu className="w-3.5 h-3.5 text-purple-600" />
                <span>Sheet &ldquo;{sheetMc}&rdquo;</span>
              </div>
              <div className="text-base font-bold text-slate-900 font-mono">
                {currentMcCount} <span className="text-xs font-normal text-slate-500">mesin</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sheet &ldquo;{sheetWod}&rdquo;</span>
              </div>
              <div className="text-base font-bold text-slate-900 font-mono">
                {currentWodCount} <span className="text-xs font-normal text-slate-500">WOD/lot</span>
              </div>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-slate-800 text-xs">
                  Link Spreadsheet Google Sheets &ldquo;RPH&rdquo; atau Spreadsheet ID:
                </label>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Tertanam Default
                  </span>
                  {inputUrl.trim() !== DEFAULT_RPH_SPREADSHEET_ID && (
                    <button
                      type="button"
                      onClick={() => setInputUrl(DEFAULT_RPH_SPREADSHEET_ID)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold"
                    >
                      Reset ke ID Tertanam
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  id="rph-spreadsheet-url-input"
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder={DEFAULT_RPH_SPREADSHEET_ID}
                  className="w-full px-3 py-2.5 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                />
              </div>

              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                <span className="text-slate-500">
                  ID: <code className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">{DEFAULT_RPH_SPREADSHEET_ID}</code> (Otomatis dipakai)
                </span>
                <a
                  href={DEFAULT_RPH_SPREADSHEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold"
                >
                  <span>Buka Google Sheets Dokumen RPH</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Sheet Names Customizer */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="text-xs font-semibold text-slate-700">
                Nama Tab Sheet di Dokumen RPH:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    1. Tab Resep Celup
                  </label>
                  <input
                    type="text"
                    value={sheetResep}
                    onChange={(e) => setSheetResep(e.target.value)}
                    placeholder="Resep"
                    className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    2. Tab Mesin Celup
                  </label>
                  <input
                    type="text"
                    value={sheetMc}
                    onChange={(e) => setSheetMc(e.target.value)}
                    placeholder="MC"
                    className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    3. Tab Work Order
                  </label>
                  <input
                    type="text"
                    value={sheetWod}
                    onChange={(e) => setSheetWod(e.target.value)}
                    placeholder="WOD"
                    className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <div className="flex items-start gap-2.5 text-red-800 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>Gagal Mengambil Data dari Spreadsheet RPH</span>
              </div>
              <pre className="text-xs text-red-700 pl-6 whitespace-pre-wrap font-sans leading-relaxed">
                {errorMsg}
              </pre>
              <div className="mt-2 pl-6 pt-2 border-t border-red-100 text-[11px] text-red-600 space-y-1">
                <p className="font-semibold">Petunjuk:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Buka spreadsheet RPH Anda di Google Sheets browser.</li>
                  <li>Klik tombol <strong>&ldquo;Bagikan&rdquo; (Share)</strong> di pojok kanan atas.</li>
                  <li>Pilih Akses Umum: <strong>&ldquo;Siapa saja yang memiliki link&rdquo;</strong> sebagai Pelihat (Viewer).</li>
                  <li>Pastikan nama tab lembar kerja di bagian bawah sesuai dengan input di atas (Resep, MC, WOD).</li>
                </ul>
              </div>
            </div>
          )}

          {/* Success Message */}
          {syncResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Sinkronisasi 3 Sheet RPH Berhasil!</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 bg-white/80 rounded-lg border border-emerald-100">
                  <div className="text-base font-extrabold text-emerald-700">
                    {syncResult.recipes.length}
                  </div>
                  <div className="text-[10px] text-slate-500">Resep Dimuat</div>
                </div>
                <div className="p-2 bg-white/80 rounded-lg border border-emerald-100">
                  <div className="text-base font-extrabold text-purple-700">
                    {syncResult.machines.length}
                  </div>
                  <div className="text-[10px] text-slate-500">Mesin Celup</div>
                </div>
                <div className="p-2 bg-white/80 rounded-lg border border-emerald-100">
                  <div className="text-base font-extrabold text-blue-700">
                    {syncResult.workOrders.length}
                  </div>
                  <div className="text-[10px] text-slate-500">Work Orders (WOD)</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Terakhir sync: <span className="font-medium text-slate-700">{formattedDate}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Tutup
            </button>

            <button
              id="btn-sync-rph-all"
              onClick={handleSyncAll}
              disabled={isLoading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading && activeSyncTarget === 'ALL' ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Menyinkronkan...' : 'Sinkronkan 3 Sheet (Resep, MC, WOD)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
