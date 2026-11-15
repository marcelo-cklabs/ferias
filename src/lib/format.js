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
 * segue como texto cru, nunca vira href). `texto` já chega como HTML: escapado
 * e com a ênfase aplicada. Só dois formatos viram link:
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

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const ITALICO = /\*([^*]+)\*/g;
/* Conteúdo do negrito: caractere que não é *, ou um *itálico* inteiro. Assim
   **a *b* c** e **a *b*** (o itálico fecha junto, em ***) viram negrito. As duas
   alternativas começam por caracteres diferentes: sem backtracking exponencial. */
const NEGRITO = /\*\*((?:[^*]|\*[^*]+\*)+)\*\*/g;

/** **negrito** (com o *itálico* de dentro já resolvido), depois o *itálico* de fora. */
function enfase(html) {
  return html
    .replace(NEGRITO, (_, dentro) => `<b>${dentro.replace(ITALICO, '<i>$1</i>')}</b>`)
    .replace(ITALICO, '<i>$1</i>');
}

/**
 * Markdown inline restrito: escapa HTML, depois [texto](url), **negrito**, *itálico*.
 * Ênfase aninhada vale nos dois sentidos: *itálico* dentro de **negrito**
 * (inclusive fechando em ***) e **negrito** dentro de *itálico*.
 * Regras do link em linkHtml(). O link pronto entra na ênfase como um marcador
 * opaco (<0>, <1>…) e só volta no fim: * do href nunca vira tag, e o * do texto
 * do link não pareia com um * de fora dele (o texto tem a ênfase própria).
 */
export function mdInline(s) {
  if (s == null) return '';
  const html = String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  // Depois do escape não sobra "<" cru: os marcadores <0>, <1>… não colidem com o texto.
  const links = [];
  const comMarcadores = html.replace(LINK, (trecho, texto, url) => {
    const a = linkHtml(enfase(texto), url);
    if (a == null) return trecho;
    links.push(a);
    return `<${links.length - 1}>`;
  });
  return enfase(comMarcadores).replace(/<(\d+)>/g, (_, i) => links[i]);
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
