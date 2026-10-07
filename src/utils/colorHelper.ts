/**
 * Utility untuk memetakan kode warna tekstil (X.X.NN.X) ke estimasi warna visual
 */

export function getColorSwatch(warnaCode: string): { bg: string; text: string; border: string; label: string } {
  const code = (warnaCode || '').toUpperCase().trim();

  if (code.includes('BK') || code.includes('HITAM')) {
    return { bg: 'bg-slate-900', text: 'text-slate-100', border: 'border-slate-800', label: 'Black' };
  }
  if (code.includes('NV') || code.includes('NAVY')) {
    return { bg: 'bg-blue-950', text: 'text-blue-100', border: 'border-blue-900', label: 'Navy' };
  }
  if (code.includes('BL') || code.includes('BIRU')) {
    return { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700', label: 'Blue' };
  }
  if (code.includes('RD') || code.includes('MERAH')) {
    return { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-700', label: 'Red' };
  }
  if (code.includes('YL') || code.includes('KUNING')) {
    return { bg: 'bg-amber-400', text: 'text-amber-950', border: 'border-amber-500', label: 'Yellow' };
  }
  if (code.includes('GR') || code.includes('HIJAU')) {
    return { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700', label: 'Green' };
  }
  if (code.includes('AG') || code.includes('ABU') || code.includes('GREY') || code.includes('GRAY')) {
    return { bg: 'bg-slate-500', text: 'text-white', border: 'border-slate-600', label: 'Grey' };
  }
  if (code.includes('OR') || code.includes('ORANGE') || code.includes('JINGGA')) {
    return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', label: 'Orange' };
  }
  if (code.includes('VI') || code.includes('UNGU') || code.includes('VIOLET')) {
    return { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-700', label: 'Violet' };
  }
  if (code.includes('CC') || code.includes('COKLAT') || code.includes('BROWN')) {
    return { bg: 'bg-amber-800', text: 'text-amber-50', border: 'border-amber-900', label: 'Earth' };
  }

  // Fallback hash color
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return {
    bg: `hsl(${hue}, 60%, 45%)`,
    text: '#ffffff',
    border: `hsl(${hue}, 60%, 35%)`,
    label: code,
  };
}
