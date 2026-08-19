/** Formata número em BRL. Negativo usa sinal tipográfico "− " antes do R$. */
export function formatBRL(valor) {
  const abs = Math.abs(valor);
  const s = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${valor < 0 ? '− ' : ''}R$ ${s}`;
}

/** Markdown inline restrito: escapa HTML, depois **negrito**, *italico*, [texto](url). */
export function mdInline(s) {
  if (s == null) return '';
  let out = String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  out = out.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  return out;
}

/** Inteiro com agrupamento pt-BR: 276117 → "276.117". */
export function fmtInt(n) {
  return new Intl.NumberFormat('pt-BR').format(n);
}

/** "2026-08-19" → "19/08/2026". Manipulação de string — nunca new Date() (fuso). */
export function fmtDataIso(iso) {
  const [a, m, d] = String(iso).split('-');
  return `${d}/${m}/${a}`;
}
