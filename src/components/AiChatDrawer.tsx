import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Loader2, 
  Bot, 
  User, 
  FlaskConical, 
  HelpCircle,
  Minimize2,
  Maximize2,
  Copy,
  Check,
  Cpu,
  Layers,
  Award,
  Trash2,
  ChevronDown,
  ArrowRight,
  ShieldAlert,
  Activity,
  GitCompare,
  FileSpreadsheet
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
  AnalysisType 
} from '../types/resep';
import { sendChatMessage, runMultiModelAnalysis } from '../services/geminiService';
import { extractLotKeyword, resolveLotDetails } from '../utils/lotExtractor';

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRecipe?: ResepDetail | null;
  totalResep: number;
  recipes?: ResepDetail[];
  machines?: MesinCelup[];
  workOrders?: WorkOrderDyeing[];
  stokItems?: StokKimiaItem[];
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  provider?: AiProviderId;
  lotContext?: string;
  activeSubTab?: 'consensus' | 'gemini' | 'openai' | 'claude';
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({
  isOpen,
  onClose,
  selectedRecipe,
  totalResep,
  recipes = [],
  machines = [],
  workOrders = [],
  stokItems = [],
}) => {
  // Provider Selection: Default to Trio Konsensus (all_three)
  const [selectedProvider, setSelectedProvider] = useState<AiProviderId>('all_three');
  
  // Lot WOD Selector
  const [selectedWodLot, setSelectedWodLot] = useState<string>(
    workOrders.length > 0 ? (workOrders[0].kikc || workOrders[0].no_wod) : ''
  );
  const [isLotPickerOpen, setIsLotPickerOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      provider: 'all_three',
      text: `### 🏭 Selamat Datang di AI Asisten Laboratorium Celup Tekstil Pabrik Sarung!

Silakan ketik pertanyaan atau problem lot celup Anda langsung di kolom percakapan. Sistem cerdas otomatis mendeteksi nomor lot WOD (seperti **AHN26F001**, **AHN26F002**, **AHN26H001**, dll.) dan menjalankan analisis konsensus 3 Pakar AI (**Gemini**, **ChatGPT**, & **Claude**).

**Contoh pertanyaan langsung:**
- \`AHN26F001 celupan tersebut kurang tua, temukan masalahnya dan berikan solusi up dosisnya\`
- \`Lot AHN26F002 terjadi luntur bagian dalam, temukan masalahnya dan berikan solusinya\`
- \`AHN26H001 timbul belang atau garis pakan di tenun sarung, periksa korelasi densitas winding\``,
      timestamp: new Date(),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Keep selectedWodLot valid if workOrders change
  useEffect(() => {
    if (!selectedWodLot && workOrders.length > 0) {
      setSelectedWodLot(workOrders[0].kikc || workOrders[0].no_wod);
    }
  }, [workOrders, selectedWodLot]);

  if (!isOpen) return null;

  // Active WOD metadata helper using lotExtractor
  const resolvedActiveWod = resolveLotDetails(selectedWodLot, workOrders, recipes);
  const activeWod = workOrders.find(
    (w) => w.kikc === selectedWodLot || w.no_wod === selectedWodLot
  ) || resolvedActiveWod;
  const activeRecipe = recipes.find((r) => r.no_resep === activeWod?.no_resep) || selectedRecipe;

  // Copy handler
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Send message
  const handleSend = async (queryText?: string, explicitLot?: string, explicitProvider?: AiProviderId) => {
    const query = (queryText !== undefined ? queryText : inputText).trim();
    if (!query || isLoading) return;

    // Extract lot keyword from query automatically (never stuck on single default)
    const detectedLot = extractLotKeyword(query, workOrders);
    const lotToUse = explicitLot || detectedLot || selectedWodLot || (workOrders.length > 0 ? (workOrders[0].kikc || workOrders[0].no_wod) : 'AHN26F001');
    if (detectedLot && detectedLot !== selectedWodLot) {
      setSelectedWodLot(detectedLot);
    }

    const providerToUse = explicitProvider || selectedProvider;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date(),
      provider: providerToUse,
      lotContext: lotToUse || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (queryText === undefined) setInputText('');
    setIsLoading(true);

    try {
      const qLower = query.toLowerCase();
      const isProblemOrAnalysis = 
        Boolean(detectedLot) ||
        qLower.includes('kurang tua') || 
        qLower.includes('luntur') ||
        qLower.includes('up dosis') || 
        qLower.includes('analisis') ||
        qLower.includes('solusi') ||
        qLower.includes('masalah') ||
        qLower.includes('garis pakan') ||
        qLower.includes('weft bar') ||
        qLower.includes('densitas') ||
        qLower.includes('audit') ||
        qLower.includes('belang');

      let responseText = '';

      if (isProblemOrAnalysis) {
        const result = await runMultiModelAnalysis({
          provider: providerToUse,
          target: 'cross_file',
          analysisType: qLower.includes('kurang tua') ? 'audit_dosis' : 'audit_dosis',
          customPrompt: query,
          selectedWodLot: lotToUse,
          recipes,
          machines,
          workOrders,
          stokItems,
        });
        responseText = result.markdown;
      } else {
        const chatRes = await sendChatMessage(
          query,
          activeRecipe || undefined,
          totalResep || recipes.length,
          recipes,
          machines,
          workOrders,
          stokItems,
          providerToUse,
          lotToUse
        );
        responseText = chatRes.text;
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        timestamp: new Date(),
        provider: providerToUse,
        lotContext: lotToUse || undefined,
        activeSubTab: 'consensus',
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Chat AI error:', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Maaf, terjadi kendala teknis saat memproses analisis celup. Silakan coba kembali.',
        timestamp: new Date(),
        provider: providerToUse,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract perspective sub-sections
  const getSubSection = (fullText: string, subTab?: 'consensus' | 'gemini' | 'openai' | 'claude') => {
    if (!subTab || subTab === 'consensus') return fullText;

    if (subTab === 'gemini') {
      const match = fullText.match(/(?:###.*?(?:Google Gemini|Dyeing & Kimia|Pakar Dyeing)[\s\S]*?)(?=###.*?(?:OpenAI|Claude|---|$))/i);
      return match ? `### 🔵 Perspektif Google Gemini (Dyeing & Kimia Celup)\n\n${match[0]}` : fullText;
    }
    if (subTab === 'openai') {
      const match = fullText.match(/(?:###.*?(?:OpenAI ChatGPT|Winding & Tenun|Pakar Winding)[\s\S]*?)(?=###.*?(?:Claude|Gemini|---|$))/i);
      return match ? `### 🟢 Perspektif OpenAI ChatGPT (Winding & Tenun Sarung)\n\n${match[0]}` : fullText;
    }
    if (subTab === 'claude') {
      const match = fullText.match(/(?:###.*?(?:Anthropic Claude|Audit Mutu|Pakar Audit)[\s\S]*?)(?=###.*?(?:Gemini|OpenAI|---|$))/i);
      return match ? `### 🟣 Perspektif Anthropic Claude (Audit Mutu, Cacat & K3)\n\n${match[0]}` : fullText;
    }

    return fullText;
  };

  // Preset Prompts Khusus Pabrik Sarung
  const multiModelPresets = [
    {
      label: '🎨 Warna Kurang Tua (Up Dosis)',
      prompt: activeWod 
        ? `Jalankan analisis 3 Fase untuk Lot ${activeWod.kikc || activeWod.no_wod} (${activeWod.warna}): warnanya kurang tua, cek kode resep ${activeWod.no_resep} dan rekomendasikan up dosis zat warna serta penambahan topping kimia di mesin ${activeWod.no_mc}.`
        : 'Ketika analisa ai diminta untuk memberikan solusi misalkan celup warna A.M.04.A warnanya kurang tua, cek lot KIKC, telusuri resep, dan berikan analisa 3 sumber AI item mana yang perlu di-up dosisnya.',
      provider: 'all_three' as AiProviderId,
      badge: 'Solusi Up Dosis 3 Fase',
    },
    {
      label: '🧵 Audit Winding Cone',
      prompt: `Audit densitas bobbin soft winding (target 0.34-0.38 g/cm³) dan sudut gulung pada benang sarung ${activeWod?.no_bng || "Ne 60/2"} untuk mencegah belang celup antar cone.`,
      provider: 'openai' as AiProviderId,
      badge: 'OpenAI Winding',
    },
    {
      label: '🔍 Cacat Garis Pakan (Weft Bar)',
      prompt: 'Investigasi penyebab timbulnya cacat garis pakan (weft bar) pada kain sarung tenun, korelasi variasi lot celup pakan dan tegangan unwinding.',
      provider: 'claude' as AiProviderId,
      badge: 'Claude QA Cacat',
    },
    {
      label: '⚖️ Dosis Soda Ash & Garam',
      prompt: activeWod
        ? `Hitung kebutuhan gramatur riil garam Glauber dan Soda Ash fiksasi untuk Lot ${activeWod.kikc || activeWod.no_wod} bobot ${activeWod.berat_Benang_kg} kg dan volume air ${activeWod.volume_air_liter} L.`
        : 'Jelaskan dosis standar garam Glauber dan Soda Ash dense untuk zat warna reaktif pada rasio air 1:10.',
      provider: 'gemini' as AiProviderId,
      badge: 'Gemini Kimia',
    },
    {
      label: '⚙️ Cek Kapasitas Mesin MC vs Air',
      prompt: activeWod
        ? `Audit kesesuaian bobot ${activeWod.berat_Benang_kg} kg pada mesin celup ${activeWod.no_mc} dengan volume air ${activeWod.volume_air_liter} L. Apakah L:R optimal?`
        : 'Bagaimana batas toleransi minimum dan maksimum kapasitas beban kg mesin celup package dyeing agar sirkulasi pompa tidak kavitasi?',
      provider: 'claude' as AiProviderId,
      badge: 'Claude Audit Mesin',
    },
  ];

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-full transition-all duration-300 bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right ${
        isExpanded ? 'max-w-4xl' : 'max-w-xl'
      }`}
    >
      {/* 1. TOP HEADER */}
      <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-600 via-blue-600 to-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                AI Asisten Laboratorium Celup Tekstil
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Multi-Model
              </span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>Konsensus 3 Pakar: Gemini • ChatGPT • Claude</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (window.confirm('Bersihkan riwayat percakapan asisten?')) {
                setMessages([messages[0]]);
              }
            }}
            title="Bersihkan Percakapan"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Kecilkan' : 'Perlebar Layar'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. CHAT CONVERSATION STREAM (HANYA KOLOM PERCAKAPAN) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => {
          const providerBadge = msg.provider || 'all_three';
          const subTab = msg.activeSubTab || 'consensus';
          const renderedText = getSubSection(msg.text, subTab);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Header Info for Message */}
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-500">
                {msg.sender === 'ai' ? (
                  <>
                    <span
                      className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${
                        providerBadge === 'openai'
                          ? 'bg-emerald-100 text-emerald-800'
                          : providerBadge === 'claude'
                          ? 'bg-purple-100 text-purple-800'
                          : providerBadge === 'gemini'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {providerBadge === 'all_three' && '🌟 Trio 3 AI Consensus'}
                      {providerBadge === 'gemini' && '🔵 Google Gemini'}
                      {providerBadge === 'openai' && '🟢 OpenAI ChatGPT'}
                      {providerBadge === 'claude' && '🟣 Anthropic Claude'}
                    </span>
                    {msg.lotContext && (
                      <span className="font-mono text-slate-600 bg-slate-200/80 px-1.5 py-0.2 rounded font-semibold">
                        Lot {msg.lotContext}
                      </span>
                    )}
                    <span>• {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                ) : (
                  <span>Anda • {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>

              {/* Message Bubble Card */}
              <div
                className={`max-w-[95%] sm:max-w-[90%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed overflow-x-auto shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200'
                }`}
              >
                {msg.sender === 'user' ? (
                  <div className="whitespace-pre-wrap font-medium">{msg.text}</div>
                ) : (
                  <div>
                    {/* Multi-Model Sub-Tabs inside message bubble if Trio was used */}
                    {providerBadge === 'all_three' && msg.text.includes('Pandangan Pakar') && (
                      <div className="mb-3 pb-2 border-b border-slate-200 flex flex-wrap items-center gap-1 text-[11px]">
                        <span className="text-[10px] font-bold text-slate-500 mr-1">Tinjauan:</span>
                        <button
                          onClick={() => {
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === msg.id ? { ...m, activeSubTab: 'consensus' } : m
                              )
                            );
                          }}
                          className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                            subTab === 'consensus'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          🌟 Semua / Konsensus
                        </button>
                        <button
                          onClick={() => {
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === msg.id ? { ...m, activeSubTab: 'gemini' } : m
                              )
                            );
                          }}
                          className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                            subTab === 'gemini'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          🔵 Gemini (Kimia)
                        </button>
                        <button
                          onClick={() => {
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === msg.id ? { ...m, activeSubTab: 'openai' } : m
                              )
                            );
                          }}
                          className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                            subTab === 'openai'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          🟢 ChatGPT (Winding)
                        </button>
                        <button
                          onClick={() => {
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === msg.id ? { ...m, activeSubTab: 'claude' } : m
                              )
                            );
                          }}
                          className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                            subTab === 'claude'
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          🟣 Claude (Mutu)
                        </button>
                      </div>
                    )}

                    {/* Markdown Body */}
                    <div className="prose prose-xs sm:prose-sm max-w-none text-slate-800 [&_table]:w-full [&_table]:border-collapse [&_table]:my-2.5 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2 [&_th]:text-slate-900 [&_th]:text-left [&_th]:font-bold [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-xl [&_code]:font-mono [&_code]:text-xs [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-2.5 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                      <Markdown remarkPlugins={[remarkGfm]}>{renderedText}</Markdown>
                    </div>

                    {/* Footer Actions of Bubble */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Pabrik Sarung Intelligence Platform</span>
                      <button
                        onClick={() => handleCopy(msg.id, renderedText)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Salin Laporan</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2.5 items-center text-xs text-slate-500 italic">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>
                {selectedProvider === 'all_three'
                  ? 'Menghubungi Dewan 3 Pakar AI (Gemini, ChatGPT, Claude) & Menjalankan 3 Fase...'
                  : `Menghubungi ${selectedProvider.toUpperCase()} & Menganalisis Formula Pabrik Sarung...`}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. INPUT FORM (HANYA KOLOM INPUT BERSIH) */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3.5 border-t border-slate-200 bg-white flex items-center gap-2">
        <input
          id="input-ai-chat-text"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder='Ketik problem lot celup... (misal: "AHN26F001 celupan tersebut kurang tua" atau "Lot AHN26F002 luntur")...'
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium transition-all"
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 font-semibold text-xs sm:text-sm cursor-pointer shrink-0"
        >
          <span>Kirim</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
