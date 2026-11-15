// Tabela de casos do mdInline (src/lib/format.js). Roda com `npm test`.
// O módulo lê import.meta.env.BASE_URL, então é carregado via Vite SSR com o
// mesmo base do astro.config.mjs ('/ferias'). O vite vem junto com o astro.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

let server;
let mdInline;
before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    base: '/ferias/', configFile: false, logLevel: 'error',
    server: { middlewareMode: true }, appType: 'custom',
  });
  ({ mdInline } = await server.ssrLoadModule('/src/lib/format.js'));
});
after(() => server?.close());

const EXT = (href, texto) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${texto}</a>`;
const INT = (href, texto) => `<a href="${href}">${texto}</a>`;

/** <a>, <b> e <i> abrem e fecham na ordem certa (o resto da saída é texto escapado). */
function bemAninhado(html) {
  const pilha = [];
  for (const [, fecha, tag] of html.matchAll(/<(\/?)(a|b|i)\b[^>]*>/g)) {
    if (!fecha) pilha.push(tag);
    else if (pilha.pop() !== tag) return false;
  }
  return pilha.length === 0;
}

const casos = {
  'escape e texto puro': [
    [null, ''],
    [undefined, ''],
    ['texto simples, sem marcação', 'texto simples, sem marcação'],
    ['a < b & c > "d"', 'a &lt; b &amp; c &gt; &quot;d&quot;'],
    ['<script>alert(1)</script>', '&lt;script&gt;alert(1)&lt;/script&gt;'],
    ['**<img src=x onerror=alert(1)>**', '<b>&lt;img src=x onerror=alert(1)&gt;</b>'],
    // <0>, <1>… são os marcadores internos dos links: vindos do texto, saem escapados.
    ['<0> [x](https://a.b) <1>', `&lt;0&gt; ${EXT('https://a.b', 'x')} &lt;1&gt;`],
  ],
  'negrito e itálico': [
    ['**x**', '<b>x</b>'],
    ['*x*', '<i>x</i>'],
    ['a **b** c *d* e **f**', 'a <b>b</b> c <i>d</i> e <b>f</b>'],
    ['**a**b**c**', '<b>a</b>b<b>c</b>'],
    ['** **', '<b> </b>'],
    ['****', '****'],
  ],
  'ênfase aninhada': [
    ['**a *b* c**', '<b>a <i>b</i> c</b>'],
    ['**a *b***', '<b>a <i>b</i></b>'],
    ['***a* b**', '<b><i>a</i> b</b>'],
    ['***a***', '<b><i>a</i></b>'],
    ['**a*b*c**', '<b>a<i>b</i>c</b>'],
    ['**x *a* y *b* z**', '<b>x <i>a</i> y <i>b</i> z</b>'],
    ['*a **b** c*', '<i>a <b>b</b> c</i>'],
    ['*a **b***', '<i>a <b>b</b></i>'],
    ['***a** b*', '<i><b>a</b> b</i>'],
    ['**a *b* c** depois *d* e **e**', '<b>a <i>b</i> c</b> depois <i>d</i> e <b>e</b>'],
    ['*x* **a *b***', '<i>x</i> <b>a <i>b</i></b>'],
    ['x * y **a *b* c**', 'x * y <b>a <i>b</i> c</b>'],
    // Formatos reais do painel.yaml (a tarefa agendada põe o assunto do e-mail em itálico).
    ['**18/10 às 09h30: e-mail da Esfera *sua mensalidade foi aprovada***',
      '<b>18/10 às 09h30: e-mail da Esfera <i>sua mensalidade foi aprovada</i></b>'],
    ['**…chegou de novo o e-mail *Seu cupom para comprar milhas chegou!***',
      '<b>…chegou de novo o e-mail <i>Seu cupom para comprar milhas chegou!</i></b>'],
    ['📧 **E-mail de 14/11: *Saldo 370.167*** — sem mudança, **nenhum crédito** · 📒 **Notion: 22.500**',
      '📧 <b>E-mail de 14/11: <i>Saldo 370.167</i></b> — sem mudança, <b>nenhum crédito</b> · 📒 <b>Notion: 22.500</b>'],
  ],
  'link externo (aba nova) e interno (base prefixado)': [
    ['[x](https://y.z/w)', EXT('https://y.z/w', 'x')],
    ['[x](http://y.z)', EXT('http://y.z', 'x')],
    ['[x](https://a.b/?q=1&r=2)', EXT('https://a.b/?q=1&amp;r=2', 'x')],
    ['[a "b"](https://x.y/?q="1")', EXT('https://x.y/?q=&quot;1&quot;', 'a &quot;b&quot;')],
    ['[x](https://a.b/"onmouseover="alert(1))', `${EXT('https://a.b/&quot;onmouseover=&quot;alert(1', 'x')})`],
    // Parêntese na URL vai como %28 %29: o literal trunca no primeiro ")".
    ['[x](https://a.b/Foo_%28bar%29)', EXT('https://a.b/Foo_%28bar%29', 'x')],
    ['[x](https://a.b/Foo_(bar))', `${EXT('https://a.b/Foo_(bar', 'x')})`],
    ['[painel de milhas](/milhas.html)', INT('/ferias/milhas.html', 'painel de milhas')],
    ['[NY](/viagens/newyork-2027.html)', INT('/ferias/viagens/newyork-2027.html', 'NY')],
    ['[mural](/)', INT('/ferias/', 'mural')],
    ['[x](/feriasx.html)', INT('/ferias/feriasx.html', 'x')],
    ['[**negrito** no link](https://x.y)', EXT('https://x.y', '<b>negrito</b> no link')],
    ['[*cupom*](/milhas.html)', INT('/ferias/milhas.html', '<i>cupom</i>')],
    ['[**a *b***](https://x.y)', EXT('https://x.y', '<b>a <i>b</i></b>')],
    ['**ver [painel](/milhas.html) hoje**', `<b>ver ${INT('/ferias/milhas.html', 'painel')} hoje</b>`],
    ['*ver [site](https://x.y) já*', `<i>ver ${EXT('https://x.y', 'site')} já</i>`],
    ['**veja o [*painel*](/milhas.html) hoje *já***',
      `<b>veja o ${INT('/ferias/milhas.html', '<i>painel</i>')} hoje <i>já</i></b>`],
  ],
  'destino recusado fica como texto cru': [
    ['[x](javascript:alert(1))', '[x](javascript:alert(1))'],
    ['[x](JavaScript:alert(1))', '[x](JavaScript:alert(1))'],
    ['[x](data:text/html,oi)', '[x](data:text/html,oi)'],
    ['[x](milhas.html)', '[x](milhas.html)'],
    ['[x](#ancora)', '[x](#ancora)'],
    ['[x](//evil.com)', '[x](//evil.com)'],
    ['[x](/\\evil.com)', '[x](/\\evil.com)'],
    ['[x](https:)', '[x](https:)'],
    ['[x](javascript:*a*)', '[x](javascript:<i>a</i>)'], // é texto: a ênfase vale nele
  ],
  'link é opaco para a ênfase': [
    ['[x](https://a.b/*c*)', EXT('https://a.b/*c*', 'x')],
    ['**[x](https://a.b/**c**)**', `<b>${EXT('https://a.b/**c**', 'x')}</b>`],
    ['*a [b](https://x.y/*) c*', `<i>a ${EXT('https://x.y/*', 'b')} c</i>`],
    ['[x](/busca.html?q=*a*)', INT('/ferias/busca.html?q=*a*', 'x')],
    // O * do texto do link não pareia com um * de fora dele.
    ['[a*](https://x.y) b*', `${EXT('https://x.y', 'a*')} b*`],
  ],
  // Comportamento atual registrado, não é meta: mudar é aceitável se for de propósito.
  'limitações conhecidas': [
    ['2 * 3 * 4', '2 <i> 3 </i> 4'], // * cercado de espaço ainda pareia
    ['**a * b**', '*<i>a </i> b**'], // * solto dentro do negrito não é suportado
  ],
};

for (const [grupo, lista] of Object.entries(casos)) {
  describe(grupo, () => {
    for (const [entrada, esperado] of lista) {
      test(entrada === undefined ? 'undefined' : JSON.stringify(entrada), () => {
        const saida = mdInline(entrada);
        assert.equal(saida, esperado);
        assert.ok(bemAninhado(saida), `tags mal aninhadas: ${saida}`);
      });
    }
  });
}

describe('link interno já com o base derruba o build', () => {
  for (const entrada of ['[x](/ferias/milhas.html)', '[x](/ferias)', '[x](/ferias/?q=1)', '**a *b*** [x](/ferias/)']) {
    test(JSON.stringify(entrada), () => {
      assert.throws(() => mdInline(entrada), /já começa com o base "\/ferias"/);
    });
  }
});
