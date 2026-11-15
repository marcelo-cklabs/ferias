/** Formata número em BRL. Negativo usa sinal tipográfico "− " antes do R$. */
export function formatBRL(valor) {
  const abs = Math.abs(valor);
  const s = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${valor < 0 ? '− ' : ''}R$ ${s}`;
}

/* Base do site sem barra final ("/ferias"), mesmo padrão dos componentes. */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * HTML de um [texto](url), ou null quando o destino não é aceito (o trecho
 * segue como texto cru, nunca vira href). Só dois formatos viram link:
 * - externo `http(s):…` → aba nova;
 * - interno: caminho a partir da raiz do site, SEM o base (`/milhas.html`) →
 *   ganha o base aqui e abre na mesma aba. `//host` e `\` ficam de fora: o
 *   navegador leria como outro domínio se o base um dia virar a raiz.
 * javascript:, data:, relativo (`milhas.html`), `#ancora` etc. → null.
 */
function linkHtml(texto, url) {
  if (/^https?:./.test(url)) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${texto}</a>`;
  }
  if (!/^\/(?![/\\])[^\\]*$/.test(url)) return null;
  // Já com o base sairia "/ferias/ferias/…" (404 silencioso): derruba o build.
  if (BASE && url.startsWith(BASE) && /^(?:[/?#]|$)/.test(url.slice(BASE.length))) {
    const semBase = '/' + url.slice(BASE.length).replace(/^\//, '');
    throw new Error(`mdInline: o link interno "${url}" (texto "${texto}") já começa com o base "${BASE}". `
      + `Escreva o caminho sem ele, "${semBase}": o base é prefixado aqui, via import.meta.env.BASE_URL.`);
  }
  return `<a href="${BASE}${url}">${texto}</a>`;
}

/**
 * Markdown inline restrito: escapa HTML, depois [texto](url), **negrito**, *italico*.
 * Regras do link em linkHtml().
 */
export function mdInline(s) {
  if (s == null) return '';
  let out = String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (trecho, texto, url) => linkHtml(texto, url) ?? trecho);
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
