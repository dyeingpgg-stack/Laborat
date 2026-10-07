import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Search, 
  Loader2, 
  ArrowRight, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { ResepDetail } from '../types/resep';
import { findSimilarRecipes } from '../services/geminiService';
import { getColorSwatch } from '../utils/colorHelper';

interface AiSimilarModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: ResepDetail[];
  onSelectRecipe: (resep: ResepDetail) => void;
}

export const AiSimilarModal: React.FC<AiSimilarModalProps> = ({
  isOpen,
  onClose,
  recipes,
  onSelectRecipe,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    ranked_recipes: { no_resep: string; skor_kecocokan: number; alasan: string }[];
    rekomendasi_teknis?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await findSimilarRecipes(query, recipes);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Gagal mencari resep mirip');
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Resep warna merah tua untuk bahan katun combed',
    'Pencelupan hitam pekat polyester TC 65/35',
    'Resep celup warna navy blue pada benang rayon',
    'Warna kuning cerah reactive untuk katun 24s',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 space-y-5 max-h-[90vh] flex flex-col">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              AI Cari Resep Mirip (Semantic Matcher)
            </h3>
            <p className="text-xs text-slate-500">
              Cari resep menggunakan deskripsi bahasa alami, corak warna, jenis Benang, atau sifat pewarnaan.
            </p>
          </div>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearch} className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="input-ai-similar-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Contoh: cari resep celup warna abu-abu untuk Benang TC 65/35..."
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Cari Resep</span>
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-medium">Contoh:</span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(p);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[160px]">
          {isLoading && (
            <div className="p-8 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                Gemini sedang menganalisis kecocokan karakteristik resep...
              </p>
            </div>
          )}

          {!isLoading && result && (
            <div className="space-y-3">
              {result.rekomendasi_teknis && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                  <span className="font-bold">Analisis AI:</span> {result.rekomendasi_teknis}
                </div>
              )}

              <div className="space-y-2">
                {result.ranked_recipes.map((item, idx) => {
                  const targetRecipe = recipes.find(r => r.no_resep === item.no_resep);
                  const swatch = targetRecipe ? getColorSwatch(targetRecipe.warna) : null;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (targetRecipe) {
                          onSelectRecipe(targetRecipe);
                          onClose();
                        }
                      }}
                      className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-sm text-slate-900 group-hover:text-blue-600">
                            {item.no_resep}
                          </span>
                          {targetRecipe && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 font-mono text-slate-700 font-semibold">
                              {targetRecipe.warna}
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {item.skor_kecocokan}% Cocok
                          </span>
                        </div>
                        {targetRecipe && (
                          <div className="text-xs text-slate-500">
                            Substrat: <span className="font-semibold text-slate-700">{targetRecipe.no_bng}</span> • {targetRecipe.total_bahan} Bahan
                          </div>
                        )}
                        <p className="text-xs text-slate-600 italic">
                          "{item.alasan}"
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-700 shrink-0">
                        <span>Buka</span>
                        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isLoading && !result && (
            <div className="p-8 text-center text-slate-400 text-xs">
              Masukkan deskripsi pencelupan yang diinginkan untuk menemukan resep terdekat.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
