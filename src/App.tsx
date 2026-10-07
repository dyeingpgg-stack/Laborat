/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, NavTabType } from './components/Navbar';
import { ResepListView } from './components/ResepListView';
import { ResepDetailView } from './components/ResepDetailView';
import { KalkulatorKomposisiView } from './components/KalkulatorKomposisiView';
import { WorkOrderDyeingView } from './components/WorkOrderDyeingView';
import { MesinCelupView } from './components/MesinCelupView';
import { RencanaLotView } from './components/RencanaLotView';
import { KamusStokView } from './components/KamusStokView';
import { AnalisisCerdasAiView } from './components/AnalisisCerdasAiView';
import { CsvUploadModal } from './components/CsvUploadModal';
import { RphSheetModal } from './components/RphSheetModal';
import { AiSimilarModal } from './components/AiSimilarModal';
import { AiChatDrawer } from './components/AiChatDrawer';

import { ResepDetail, ProductionLot, OrderRequirement, MesinCelup, WorkOrderDyeing, StokKimiaItem } from './types/resep';
import { INITIAL_MASTER_RECIPES } from './data/masterResep';
import defaultStokData from './data/defaultStokData.json';
import { 
  loadRecipesFromStorage, 
  loadMcFromStorage, 
  loadWodFromStorage, 
  saveMcToStorage, 
  saveWodToStorage 
} from './services/storageService';
import { 
  fetchLiveRencanaLots, 
  fetchLiveOrders, 
  checkAndFetchLiveResepSheet,
  fetchLiveStokFromMutkimyd,
  fetchLiveMcFromRph,
  fetchLiveWodFromRph,
} from './services/sheetsService';
import sheetsData from './data/sheetsData.json';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabType>('resep');
  const [recipes, setRecipes] = useState<ResepDetail[]>(INITIAL_MASTER_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState<ResepDetail | null>(null);
  const [isCustomData, setIsCustomData] = useState(false);

  // RPH Sheet MC (Mesin Celup) & Sheet WOD (Work Order Dyeing)
  const [machines, setMachines] = useState<MesinCelup[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderDyeing[]>([]);
  const [stokItems, setStokItems] = useState<StokKimiaItem[]>((defaultStokData as unknown) as StokKimiaItem[]);
  const [calculatorParams, setCalculatorParams] = useState<{
    noResep?: string;
    beratKg?: number;
    volumeL?: number;
    noMc?: string;
  } | null>(null);

  // Sheets data (legacy MUTKIMYD)
  const [activeLots, setActiveLots] = useState<ProductionLot[]>(sheetsData.activeLots as ProductionLot[]);
  const [orders, setOrders] = useState<OrderRequirement[]>(sheetsData.orders as OrderRequirement[]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Modals
  const [isRphOpen, setIsRphOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAiSearchOpen, setIsAiSearchOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // Auto-load recipes, MC, and WOD from storage on startup
  useEffect(() => {
    async function initStorage() {
      try {
        const storedRecipes = await loadRecipesFromStorage();
        if (storedRecipes && storedRecipes.length > 0) {
          setRecipes(storedRecipes);
          setIsCustomData(true);
        } else {
          // If no stored recipes, attempt live sync from spreadsheet RPH sheet "Resep" if configured
          const live = await checkAndFetchLiveResepSheet();
          if (live && live.length > 0) {
            setRecipes(live);
            setIsCustomData(true);
            showToast(`Berhasil memuat ${live.length} resep dari spreadsheet RPH sheet "Resep"!`, 'success');
          }
        }

        const storedMc = await loadMcFromStorage();
        if (storedMc && storedMc.length > 0) {
          setMachines(storedMc);
        } else {
          try {
            const liveMc = await fetchLiveMcFromRph();
            if (liveMc && liveMc.length > 0) {
              setMachines(liveMc);
            }
          } catch {
            // ignore
          }
        }

        const storedWod = await loadWodFromStorage();
        if (storedWod && storedWod.length > 0) {
          const effectiveRecipes = (storedRecipes && storedRecipes.length > 0) ? storedRecipes : INITIAL_MASTER_RECIPES;
          const enrichedWod = storedWod.map(w => {
            if ((!w.no_bng || w.no_bng === '-' || w.no_bng.toLowerCase() === 'null') && w.no_resep) {
              const r = effectiveRecipes.find(rec => rec.no_resep === w.no_resep);
              if (r && r.no_bng && r.no_bng !== '-') {
                return { ...w, no_bng: r.no_bng };
              }
            }
            return w;
          });
          setWorkOrders(enrichedWod);
        } else {
          try {
            const liveWod = await fetchLiveWodFromRph();
            if (liveWod && liveWod.length > 0) {
              const effectiveRecipes = (storedRecipes && storedRecipes.length > 0) ? storedRecipes : INITIAL_MASTER_RECIPES;
              const enrichedWod = liveWod.map(w => {
                if ((!w.no_bng || w.no_bng === '-' || w.no_bng.toLowerCase() === 'null') && w.no_resep) {
                  const r = effectiveRecipes.find(rec => rec.no_resep === w.no_resep);
                  if (r && r.no_bng && r.no_bng !== '-') {
                    return { ...w, no_bng: r.no_bng };
                  }
                }
                return w;
              });
              setWorkOrders(enrichedWod);
            }
          } catch {
            // ignore
          }
        }

        try {
          const liveStok = await fetchLiveStokFromMutkimyd();
          if (liveStok && liveStok.length > 0) {
            setStokItems(liveStok);
          }
        } catch {
          // ignore offline fallback
        }
      } catch (e) {
        console.warn('Init storage error:', e);
      }
    }
    initStorage();
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Sync with live Google Sheets
  const handleSyncSheets = async () => {
    setIsSyncing(true);
    try {
      const freshLots = await fetchLiveRencanaLots();
      if (freshLots && freshLots.length > 0) {
        setActiveLots(freshLots);
      }

      const freshOrders = await fetchLiveOrders();
      if (freshOrders && freshOrders.length > 0) {
        setOrders(freshOrders);
      }

      const freshRecipes = await checkAndFetchLiveResepSheet();
      if (freshRecipes && freshRecipes.length > 0) {
        setRecipes(freshRecipes);
        setIsCustomData(true);
        showToast(`Sinkronisasi berhasil! ${freshRecipes.length} resep diperbarui dari Google Sheets.`);
      } else {
        showToast('Sinkronisasi jadwal lot & kebutuhan kimia berhasil.');
      }
    } catch (err: any) {
      showToast('Koneksi Google Sheets diperbarui dengan data lokal cache.', 'info');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRecipesLoadedFromCsv = (newRecipes: ResepDetail[]) => {
    setRecipes(newRecipes);
    setIsCustomData(true);
    if (newRecipes.length > 0) {
      setSelectedRecipe(null);
    }
    showToast(`Berhasil memuat ${newRecipes.length} resep dari file CSV!`);
  };

  const handleSelectRecipeFromList = (resep: ResepDetail) => {
    setSelectedRecipe(resep);
  };

  const handleBackToList = () => {
    setSelectedRecipe(null);
  };

  const handleOpenCalculatorWithRecipe = (resep: ResepDetail) => {
    setSelectedRecipe(resep);
    setCalculatorParams({ noResep: resep.no_resep });
    setActiveTab('kalkulator');
  };

  const handleSelectLotToCalculate = (noResep: string, beratKg: number, volumeL: number, noMc?: string) => {
    const targetRecipe = recipes.find(r => r.no_resep === noResep) || recipes[0];
    setSelectedRecipe(targetRecipe);
    setCalculatorParams({ noResep, beratKg, volumeL, noMc });
    setActiveTab('kalkulator');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-xs font-semibold ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-50 border-emerald-800'
              : toastMessage.type === 'error'
              ? 'bg-rose-900 text-rose-50 border-rose-800'
              : 'bg-blue-900 text-blue-50 border-blue-800'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
        }}
        totalResep={recipes.length}
        totalMc={machines.length}
        totalWod={workOrders.length}
        isCustomData={isCustomData}
        isSyncing={isSyncing}
        onSyncSheets={handleSyncSheets}
        onOpenRphModal={() => setIsRphOpen(true)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAiChat={() => setIsAiChatOpen(true)}
        onOpenAiSearch={() => setIsAiSearchOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Tab 1: Resep (Daftar & Detail) — Sheet "Resep" */}
        {activeTab === 'resep' && (
          <div>
            {selectedRecipe ? (
              <ResepDetailView
                resep={selectedRecipe}
                onBack={handleBackToList}
                onOpenCalculator={handleOpenCalculatorWithRecipe}
              />
            ) : (
              <ResepListView
                recipes={recipes}
                onSelectRecipe={handleSelectRecipeFromList}
                onOpenAiSearch={() => setIsAiSearchOpen(true)}
                onOpenRphModal={() => setIsRphOpen(true)}
                onOpenUpload={() => setIsUploadOpen(true)}
                onOpenAnalisisAi={() => setActiveTab('analisis')}
              />
            )}
          </div>
        )}

        {/* Tab 2: Work Order Dyeing (WOD) — Sheet "WOD" */}
        {activeTab === 'wod' && (
          <WorkOrderDyeingView
            workOrders={workOrders}
            machines={machines}
            recipes={recipes}
            onSelectWodToCalculate={handleSelectLotToCalculate}
            onSelectRecipeDirectly={(resep) => {
              setSelectedRecipe(resep);
              setActiveTab('resep');
            }}
            onOpenRphModal={() => setIsRphOpen(true)}
          />
        )}

        {/* Tab 3: Mesin Celup (MC) — Sheet "MC" */}
        {activeTab === 'mc' && (
          <MesinCelupView
            machines={machines}
            workOrders={workOrders}
            onOpenRphModal={() => setIsRphOpen(true)}
            onSelectWod={handleSelectLotToCalculate}
          />
        )}

        {/* Tab 4: Kalkulator Komposisi Kimia Batch */}
        {activeTab === 'kalkulator' && (
          <KalkulatorKomposisiView
            recipes={recipes}
            selectedRecipe={selectedRecipe}
            onSelectRecipe={(r) => setSelectedRecipe(r)}
            activeLots={activeLots}
            workOrders={workOrders}
            machines={machines}
            initialParams={calculatorParams}
          />
        )}

        {/* Tab 5: Rencana Lot Celup (Legacy MUTKIMYD) */}
        {activeTab === 'rencana' && (
          <RencanaLotView
            lots={activeLots}
            orders={orders}
            onSelectLotToCalculate={handleSelectLotToCalculate}
          />
        )}

        {/* Tab 6: Master Kamus & Stok Gudang (GKD) */}
        {activeTab === 'stok' && (
          <KamusStokView />
        )}

        {/* Tab 7: Analisis Cerdas AI (Multi-Model) */}
        {activeTab === 'analisis' && (
          <AnalisisCerdasAiView
            recipes={recipes}
            machines={machines}
            workOrders={workOrders}
            stokItems={stokItems}
            onOpenRphModal={() => setIsRphOpen(true)}
            onOpenUploadCsv={() => setIsUploadOpen(true)}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Sistem Informasi Formulasi Resep &amp; Komposisi Kimia Dyeing • <span className="font-semibold text-slate-700">RPH (Resep, MC, WOD)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Formula: % OWF (Berat Benang) &amp; Gr/l (Volume Air)</span>
            <span>•</span>
            <span>Sheet RPH: Resep Celup • Mesin Celup (MC) • Work Order Dyeing (WOD)</span>
          </div>
        </div>
      </footer>

      {/* RPH Google Sheets Connection Modal (Resep, MC, WOD) */}
      <RphSheetModal
        isOpen={isRphOpen}
        onClose={() => setIsRphOpen(false)}
        onRecipesUpdated={(newRecipes) => {
          setRecipes(newRecipes);
          setIsCustomData(true);
          setSelectedRecipe(null);
          showToast(`Berhasil menyinkronkan ${newRecipes.length} resep dari Spreadsheet RPH sheet "Resep"!`);
        }}
        onMcUpdated={(newMc) => {
          setMachines(newMc);
          saveMcToStorage(newMc);
          showToast(`Berhasil menyinkronkan ${newMc.length} mesin dari Spreadsheet RPH sheet "MC"!`);
        }}
        onWodUpdated={(newWod) => {
          setWorkOrders(newWod);
          saveWodToStorage(newWod);
          showToast(`Berhasil menyinkronkan ${newWod.length} lot dari Spreadsheet RPH sheet "WOD"!`);
        }}
        currentRecipeCount={recipes.length}
        currentMcCount={machines.length}
        currentWodCount={workOrders.length}
      />

      {/* Upload Modal */}
      <CsvUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onRecipesLoaded={handleRecipesLoadedFromCsv}
        currentCount={recipes.length}
      />

      {/* AI Semantic Search Modal */}
      <AiSimilarModal
        isOpen={isAiSearchOpen}
        onClose={() => setIsAiSearchOpen(false)}
        recipes={recipes}
        onSelectRecipe={(resep) => {
          setSelectedRecipe(resep);
          setActiveTab('resep');
        }}
      />

      {/* AI Floating Chat Drawer */}
      <AiChatDrawer
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        selectedRecipe={selectedRecipe}
        totalResep={recipes.length}
        recipes={recipes}
        machines={machines}
        workOrders={workOrders}
        stokItems={stokItems}
      />

    </div>
  );
}

