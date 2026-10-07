import React from 'react';
import { 
  FlaskConical, 
  Search, 
  UploadCloud, 
  RefreshCw, 
  Sparkles, 
  FileSpreadsheet, 
  Calendar, 
  Layers, 
  Database,
  Cpu,
  ClipboardList,
  Package
} from 'lucide-react';

export type NavTabType = 'resep' | 'wod' | 'mc' | 'kalkulator' | 'rencana' | 'stok' | 'analisis';

interface NavbarProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  totalResep: number;
  totalMc?: number;
  totalWod?: number;
  isCustomData: boolean;
  isSyncing: boolean;
  onSyncSheets: () => void;
  onOpenRphModal: () => void;
  onOpenUpload: () => void;
  onOpenAiChat: () => void;
  onOpenAiSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalResep,
  totalMc = 0,
  totalWod = 0,
  isCustomData,
  isSyncing,
  onSyncSheets,
  onOpenRphModal,
  onOpenUpload,
  onOpenAiChat,
  onOpenAiSearch,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3 min-w-max">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                  Laborat
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Yarn Dyeing
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Formulasi Warna &amp; Komposisi Kimia Pencelupan
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              id="nav-tab-resep"
              onClick={() => setActiveTab('resep')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'resep'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Resep</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700 font-mono">
                {totalResep}
              </span>
            </button>

            <button
              id="nav-tab-wod"
              onClick={() => setActiveTab('wod')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'wod'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
              <span>WOD</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700 font-mono">
                {totalWod}
              </span>
            </button>

            <button
              id="nav-tab-mc"
              onClick={() => setActiveTab('mc')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'mc'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-purple-600" />
              <span>Mesin (MC)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700 font-mono">
                {totalMc}
              </span>
            </button>

            <button
              id="nav-tab-kalkulator"
              onClick={() => setActiveTab('kalkulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'kalkulator'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
              <span>Kalkulator</span>
            </button>

            <button
              id="nav-tab-stok"
              onClick={() => setActiveTab('stok')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'stok'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-blue-600" />
              <span>Stok Kimia</span>
            </button>

            <button
              id="nav-tab-analisis"
              onClick={() => setActiveTab('analisis')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'analisis'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs'
                  : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Analisis AI</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                activeTab === 'analisis' ? 'bg-white/20 text-white' : 'bg-indigo-200/70 text-indigo-900'
              }`}>
                Multi-Model
              </span>
            </button>
          </nav>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            
            {/* RPH Sheet Connection (3 sheets) */}
            <button
              id="btn-rph-sheet-nav"
              onClick={onOpenRphModal}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                totalResep > 0 || totalWod > 0 || totalMc > 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 animate-pulse'
              }`}
              title="Koneksi spreadsheet RPH (Sheet Resep, MC, WOD)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sinkron RPH</span>
            </button>

            {/* AI Cari Mirip */}
            <button
              id="btn-ai-search-nav"
              onClick={onOpenAiSearch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
              title="Cari resep dengan bahasa natural (AI)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden xl:inline">AI Cari Resep</span>
            </button>

            {/* Import Resep.csv */}
            <button
              id="btn-upload-csv"
              onClick={onOpenUpload}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isCustomData
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="Upload file Resep.csv manual"
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">
                {isCustomData ? 'CSV Terhubung' : 'Upload CSV'}
              </span>
            </button>

            {/* Chatbot AI */}
            <button
              id="btn-ai-chat"
              onClick={onOpenAiChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Lab</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation Row */}
        <div className="flex lg:hidden items-center gap-1 py-2 border-t border-slate-100 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('resep')}
            className={`px-3 py-1 rounded-md font-semibold whitespace-nowrap ${
              activeTab === 'resep' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
            }`}
          >
            Resep ({totalResep})
          </button>
          <button
            onClick={() => setActiveTab('wod')}
            className={`px-3 py-1 rounded-md font-semibold whitespace-nowrap ${
              activeTab === 'wod' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
            }`}
          >
            WOD ({totalWod})
          </button>
          <button
            onClick={() => setActiveTab('mc')}
            className={`px-3 py-1 rounded-md font-semibold whitespace-nowrap ${
              activeTab === 'mc' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
            }`}
          >
            Mesin MC ({totalMc})
          </button>
          <button
            onClick={() => setActiveTab('kalkulator')}
            className={`px-3 py-1 rounded-md font-semibold whitespace-nowrap ${
              activeTab === 'kalkulator' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
            }`}
          >
            Kalkulator
          </button>
          <button
            onClick={() => setActiveTab('stok')}
            className={`px-3 py-1 rounded-md font-semibold whitespace-nowrap ${
              activeTab === 'stok' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
            }`}
          >
            Stok Kimia
          </button>
          <button
            onClick={() => setActiveTab('analisis')}
            className={`px-3 py-1 rounded-md font-bold whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'analisis' ? 'bg-indigo-600 text-white' : 'text-indigo-700 bg-indigo-50'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            Analisis AI (Multi-Model)
          </button>
        </div>

      </div>
    </header>
  );
};
