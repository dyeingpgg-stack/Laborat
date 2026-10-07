import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Layers, 
  Sparkles, 
  ChevronRight, 
  ArrowUpDown, 
  X,
  Palette,
  FlaskConical,
  FileSpreadsheet,
  UploadCloud
} from 'lucide-react';
import { ResepDetail } from '../types/resep';
import { getColorSwatch } from '../utils/colorHelper';

interface ResepListViewProps {
  recipes: ResepDetail[];
  onSelectRecipe: (resep: ResepDetail) => void;
  onOpenAiSearch: () => void;
  onOpenRphModal?: () => void;
  onOpenUpload?: () => void;
  onOpenAnalisisAi?: () => void;
}

export const ResepListView: React.FC<ResepListViewProps> = ({
  recipes,
  onSelectRecipe,
  onOpenAiSearch,
  onOpenRphModal,
  onOpenUpload,
  onOpenAnalisisAi,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYarn, setSelectedYarn] = useState<string>('SEMUA');
  const [selectedType, setSelectedType] = useState<string>('SEMUA');
  const [sortBy, setSortBy] = useState<'no_resep' | 'warna' | 'bahan'>('no_resep');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 18;

  // Extract unique yarn types
  const yarnTypes = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => {
      if (r.no_bng) set.add(r.no_bng);
    });
    return Array.from(set).sort();
  }, [recipes]);

  // Filtered & sorted recipes
  const filteredRecipes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return recipes.filter(r => {
      const matchQuery = !q || 
        r.no_resep.toLowerCase().includes(q) ||
        r.warna.toLowerCase().includes(q) ||
        r.no_bng.toLowerCase().includes(q) ||
        r.tahap_proses.some(t => t.langkah.some(l => l.mat_name.toLowerCase().includes(q)));

      const matchYarn = selectedYarn === 'SEMUA' || r.no_bng === selectedYarn;
      const matchType = selectedType === 'SEMUA' || r.tipe_resep === selectedType;

      return matchQuery && matchYarn && matchType;
    }).sort((a, b) => {
      if (sortBy === 'no_resep') return a.no_resep.localeCompare(b.no_resep);
      if (sortBy === 'warna') return a.warna.localeCompare(b.warna);
      if (sortBy === 'bahan') return b.total_bahan - a.total_bahan;
      return 0;
    });
  }, [recipes, searchQuery, selectedYarn, selectedType, sortBy]);

  // Pagination slice
  const totalPages = Math.ceil(filteredRecipes.length / pageSize) || 1;
  const paginatedRecipes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecipes.slice(start, start + pageSize);
  }, [filteredRecipes, currentPage]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedYarn('SEMUA');
    setSelectedType('SEMUA');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        
        {/* Main Search Input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              id="input-search-resep"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari no resep, warna, atau jenis benang..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            id="btn-ai-search-filter"
            onClick={onOpenAiSearch}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Cari Resep Mirip</span>
          </button>

          {onOpenAnalisisAi && (
            <button
              id="btn-open-analisis-ai-list"
              onClick={onOpenAnalisisAi}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-xl shadow-2xs transition-all whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Analisis Cerdas AI (Multi-Model)</span>
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Yarn Dropdown (43 options) */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Jenis Benang:</span>
              <select
                id="select-yarn-filter"
                value={selectedYarn}
                onChange={(e) => {
                  setSelectedYarn(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="SEMUA">Semua Benang ({recipes.length})</option>
                {yarnTypes.map(yarn => (
                  <option key={yarn} value={yarn}>
                    {yarn}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipe Type Pill Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {['SEMUA', 'REGULER', 'CORAK'].map(type => (
                <button
                  key={type}
                  id={`filter-type-${type.toLowerCase()}`}
                  onClick={() => {
                    setSelectedType(type);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    selectedType === type
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Clear filters if active */}
            {(searchQuery || selectedYarn !== 'SEMUA' || selectedType !== 'SEMUA') && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 px-2 py-1 font-medium transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Reset Filter
              </button>
            )}
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Urutkan:</span>
            <select
              id="select-sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 font-medium focus:outline-hidden"
            >
              <option value="no_resep">No Resep (A-Z)</option>
              <option value="warna">Kode Warna</option>
              <option value="bahan">Jumlah Bahan Kimia</option>
            </select>
          </div>

        </div>

      </div>

      {/* Results Count & Badges */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div>
          Menampilkan <span className="font-bold text-slate-900">{filteredRecipes.length}</span> resep pencelupan
          {selectedYarn !== 'SEMUA' && ` pada benang "${selectedYarn}"`}
          {selectedType !== 'SEMUA' && ` (${selectedType})`}
        </div>
        <div>
          Halaman <span className="font-semibold text-slate-800">{currentPage}</span> dari {totalPages}
        </div>
      </div>

      {/* Recipes Grid */}
      {recipes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">
              Database Resep Siap Dihubungkan
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Semua data mockup telah dibersihkan. Resep pencelupan berada pada Spreadsheet <strong>&ldquo;RPH&rdquo;</strong> sheet <strong>&ldquo;Resep&rdquo;</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onOpenRphModal && (
              <button
                id="btn-open-rph-empty-state"
                onClick={onOpenRphModal}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Tarik Data dari Spreadsheet RPH (Sheet Resep)
              </button>
            )}
            {onOpenUpload && (
              <button
                id="btn-open-upload-empty-state"
                onClick={onOpenUpload}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-2 border border-slate-200"
              >
                <UploadCloud className="w-4 h-4 text-blue-600" />
                Upload File Resep.csv
              </button>
            )}
          </div>
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Koneksi Google Sheets langsung membaca kolom: <code className="text-slate-600">no_resep, no_bng, warna, jns_proses, mat_name, qty, uom_code</code>.
          </div>
        </div>
      ) : paginatedRecipes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">
            Tidak Ditemukan Resep Yang Sesuai
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Tidak ada resep dengan kata kunci atau filter yang dipilih. Silakan ubah filter atau upload dataset Resep.csv lengkap.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">no_resep (kode resep)</th>
                  <th className="py-3.5 px-4">benang</th>
                  <th className="py-3.5 px-4">warna</th>
                  <th className="py-3.5 px-4">tahap proses</th>
                  <th className="py-3.5 px-4 text-center">jumlah bahan</th>
                  <th className="py-3.5 px-4 text-right">aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedRecipes.map((resep) => {
                  const swatch = getColorSwatch(resep.warna);
                  return (
                    <tr
                      key={resep.no_resep}
                      id={`row-resep-${resep.no_resep}`}
                      onClick={() => onSelectRecipe(resep)}
                      className="hover:bg-blue-50/60 transition-colors cursor-pointer group"
                    >
                      {/* 1. no_resep (kode resep) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
                            {resep.no_resep}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            resep.tipe_resep === 'CORAK'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {resep.tipe_resep}
                          </span>
                        </div>
                      </td>

                      {/* 2. benang */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700 font-mono">
                          {resep.no_bng}
                        </span>
                      </td>

                      {/* 3. warna */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs inline-block shrink-0" 
                            style={{ backgroundColor: swatch.bg.startsWith('hsl') ? swatch.bg : undefined }}
                          />
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            {resep.warna}
                          </span>
                        </div>
                      </td>

                      {/* 4. tahap proses */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {resep.tahap_proses.map(t => (
                            <span
                              key={t.tahap}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
                            >
                              {t.tahap === 'PRETREATMENT' ? 'PRE' : t.tahap === 'PROCESSING' ? 'CELUP' : 'AFTER'}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* 5. jumlah bahan */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-mono font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                          {resep.total_bahan} Bahan
                        </span>
                      </td>

                      {/* 6. aksi */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-700 bg-blue-50 group-hover:bg-blue-100/80 px-2.5 py-1.5 rounded-lg transition-colors">
                          Lihat Resep & Komposisi
                          <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            ← Sebelumnya
          </button>

          <div className="flex items-center gap-1 text-xs">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl font-semibold transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            Berikutnya →
          </button>
        </div>
      )}

    </div>
  );
};
