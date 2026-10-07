import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  X, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Database,
  Layers,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { parseResepCsv } from '../data/masterResep';
import { ResepDetail } from '../types/resep';
import { saveRecipesToStorage, clearCustomStorage } from '../services/storageService';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipesLoaded: (recipes: ResepDetail[]) => void;
  currentCount: number;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({
  isOpen,
  onClose,
  onRecipesLoaded,
  currentCount,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<{
    totalRows: number;
    totalResep: number;
    yarnCount: number;
    colorCount: number;
    recipes: ResepDetail[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setErrorMessage('Format file harus berupa .csv atau .txt');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || text.length < 50) {
          throw new Error('File kosong atau format tidak valid');
        }

        const parsed = parseResepCsv(text);
        if (parsed.resepList.length === 0) {
          throw new Error('Tidak ada baris resep valid yang berhasil diparsing. Pastikan file memiliki kolom: no_resep, no_bng, warna, mat_name, qty, uom_code.');
        }

        setParseResult({
          totalRows: parsed.totalRows,
          totalResep: parsed.totalResep,
          yarnCount: parsed.yarnTypes.length,
          colorCount: parsed.colorCodes.length,
          recipes: parsed.resepList,
        });
      } catch (err: any) {
        setErrorMessage(err?.message || 'Gagal memproses file CSV');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Gagal membaca file dari disk.');
      setIsProcessing(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleApplyRecipes = async () => {
    if (!parseResult) return;
    setIsProcessing(true);
    try {
      await saveRecipesToStorage(parseResult.recipes);
      onRecipesLoaded(parseResult.recipes);
      onClose();
    } catch (e) {
      onRecipesLoaded(parseResult.recipes);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsProcessing(true);
    try {
      await clearCustomStorage();
      window.location.reload();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Unggah File Dataset Resep (Resep.csv)
            </h3>
            <p className="text-xs text-slate-500">
              Impor langsung 21.737 baris resep dengan urutan tahap dan dosis kimia lengkap.
            </p>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileProcess(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-slate-200 text-blue-600 flex items-center justify-center mx-auto">
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              ) : (
                <FileText className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {isProcessing ? 'Sedang memproses CSV...' : 'Klik untuk memilih file atau drag & drop di sini'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Mendukung file <span className="font-mono font-bold">Resep.csv</span> (format separator koma atau titik-koma)
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Preview of Parsed Data */}
        {parseResult && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>File Berhasil Diparsing!</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-white rounded-lg border border-emerald-100">
                <div className="text-[10px] text-slate-500">Total Baris</div>
                <div className="font-bold text-slate-900 font-mono">{parseResult.totalRows.toLocaleString('id-ID')}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-100">
                <div className="text-[10px] text-slate-500">Resep Unik</div>
                <div className="font-bold text-emerald-700 font-mono">{parseResult.totalResep.toLocaleString('id-ID')}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-100">
                <div className="text-[10px] text-slate-500">Jenis Benang</div>
                <div className="font-bold text-slate-900 font-mono">{parseResult.yarnCount} Jenis</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-100">
                <div className="text-[10px] text-slate-500">Kode Warna</div>
                <div className="font-bold text-slate-900 font-mono">{parseResult.colorCount} Warna</div>
              </div>
            </div>

            <button
              id="btn-confirm-apply-csv"
              onClick={handleApplyRecipes}
              disabled={isProcessing}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terapkan {parseResult.totalResep} Resep ke Aplikasi</span>
            </button>
          </div>
        )}

        {/* Footer & Reset option */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
          <button
            onClick={handleResetToDefault}
            className="text-slate-500 hover:text-red-600 inline-flex items-center gap-1 transition-colors"
            title="Hapus data resep yang tersimpan di browser"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kosongkan Cache Resep Lokal</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
