#!/usr/bin/env node
// Mede scroll horizontal nas páginas do dist/ (CLAUDE.md: 375/768/1280 sem scroll
// horizontal). Vazamento = documentElement.scrollWidth maior que clientWidth.
//
// Cada página × largura é medida em três momentos:
//   1. logo após o load;
//   2. depois que terminam as animações finitas da document timeline (a `fly`,
//      infinita, e a `printout`, guiada por scroll, nunca "terminam" e ficam de fora);
//   3. no pico, amostrado a cada quadro (requestAnimationFrame) desde a criação do
//      documento até o fim de uma rolagem completa. Pega o vazamento transitório
//      de animação de entrada, que some quando ela acaba.
// Quando vaza, lista os elementos que passam da borda direita (fora de contêineres
// de rolagem, que não alargam a página).
//
// O gate do auth.js é liberado pela chave de sessionStorage que ele mesmo grava no
// desbloqueio (KEY em public/auth.js). A senha não entra aqui.
//
// Uso:   npm run medir                          (builda antes de medir)
//        npm run medir -- --larguras 320,414
//        node scripts/medir-overflow.cjs [--larguras 375,768,1280] [--reduced-motion]
// Saída: 0 = nada passou do viewport · 1 = vazamento, gate fechado ou animação
//        travada · 2 = erro de execução.
// Requer Playwright com Chromium. No ambiente cloud do Claude Code já vem instalado;
// fora dele: npm i --no-save playwright && npx playwright install chromium
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const DIST = path.join(RAIZ, 'dist');
const CHAVE_GATE = 'ferias_cklabs_auth'; // = KEY em public/auth.js
const LARGURAS_PADRAO = [375, 768, 1280];
const ALTURAS = { 320: 568, 360: 740, 375: 812, 390: 844, 414: 896, 768: 1024, 1024: 768, 1280: 800, 1440: 900 };
const USO = 'uso: node scripts/medir-overflow.cjs [--larguras 375,768,1280] [--reduced-motion]';

function lerArgs(argv) {
  const opts = { larguras: LARGURAS_PADRAO, reduzido: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--reduced-motion') opts.reduzido = true;
    else if (a === '--larguras') {
      const valor = argv[++i] || '';
      opts.larguras = valor.split(',').map((s) => Number(s.trim()));
      if (opts.larguras.some((w) => !Number.isInteger(w) || w < 200 || w > 4000)) {
        throw new Error(`--larguras inválido: "${valor}" (ex.: --larguras 320,375,768)`);
      }
    } else if (a === '--help' || a === '-h') {
      console.log(USO);
      process.exit(0);
    } else throw new Error(`argumento desconhecido: ${a}\n${USO}`);
  }
  return opts;
}

function listarPaginas() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    throw new Error('dist/index.html não existe: rode `npm run medir` (que builda antes) ou `npm run build`.');
  }
  const achadas = [];
  const anda = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) anda(p);
      else if (e.name.endsWith('.html')) achadas.push(path.relative(DIST, p).split(path.sep).join('/'));
    }
  };
  anda(DIST);
  // home primeiro, depois as páginas da raiz, depois as das subpastas
  return achadas.map((p) => (p === 'index.html' ? '' : p))
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
}

// Medir um dist/ velho dá falsa segurança: avisa se algo da fonte é mais novo que o build.
function avisarSeDistVelho() {
  const build = fs.statSync(path.join(DIST, 'index.html')).mtimeMs;
  let maisNovo = { t: 0, p: '' };
  const anda = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) for (const n of fs.readdirSync(p)) anda(path.join(p, n));
    else if (st.mtimeMs > maisNovo.t) maisNovo = { t: st.mtimeMs, p };
  };
  for (const p of ['src', 'public', 'astro.config.mjs']) {
    if (fs.existsSync(path.join(RAIZ, p))) anda(path.join(RAIZ, p));
  }
  if (maisNovo.t > build) {
    console.warn(`aviso: ${path.relative(RAIZ, maisNovo.p)} é mais novo que o dist/, então a medição é do build ` +
      'anterior. `npm run medir` builda antes de medir.\n');
  }
}

// `astro preview` direto (sem a camada do npm, para o kill funcionar em qualquer SO).
// Se a porta pedida estiver ocupada (ex.: `npm run dev` na 4321), o astro tenta a
// próxima sem falhar, por isso a URL vem da saída dele e não de uma porta fixa.
function subirPreview() {
  return new Promise((resolve, reject) => {
    const cli = path.join(RAIZ, 'node_modules', 'astro', 'astro.js');
    if (!fs.existsSync(cli)) return reject(new Error('astro não está em node_modules: rode `npm ci`.'));
    const proc = spawn(process.execPath, [cli, 'preview', '--host', '127.0.0.1', '--port', '4329'], {
      cwd: RAIZ, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let saida = '';
    let pronto = false;
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`astro preview não anunciou a URL em 30s:\n${saida}`));
    }, 30000);
    const ler = (buf) => {
      if (pronto) return; // segue drenando o pipe, para ele não encher e travar o servidor
      saida += buf;
      // o \s final exige a linha inteira: um pedaço cortado no meio da URL não casa
      const m = saida.replace(/\x1b\[[0-9;]*m/g, '').match(/Local\s+(https?:\/\/\S+)\s/);
      if (m) {
        pronto = true;
        clearTimeout(timer);
        resolve({ proc, base: m[1].replace(/\/?$/, '/') });
      }
    };
    proc.stdout.on('data', ler);
    proc.stderr.on('data', ler);
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      if (!pronto) reject(new Error(`astro preview saiu (código ${code}) antes de subir:\n${saida}`));
    });
  });
}

// Roda dentro da página, antes de qualquer script dela (addInitScript).
function scriptDePagina(chave) {
  try { sessionStorage.setItem(chave, 'ok'); } catch (e) { /* sem storage, o gate fica fechado e a medição acusa */ }
  const rec = { quadros: 0, maxSW: 0, pico: 0, picoSW: 0, picoCW: 0, picoEm: 0, culpados: [] };
  window.__overflow = rec;
  const descreve = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = [...el.classList].filter((c) => !c.startsWith('astro-')).slice(0, 3);
    return cls.length ? `${s}.${cls.join('.')}` : s;
  };
  // Quem está dentro de um ancestral com overflow != visible que cabe na tela não
  // alarga a página (ex.: tabela larga num .rolagem com overflow-x: auto).
  const recortado = (el, cw) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== 'visible' && p.getBoundingClientRect().right <= cw + 0.5) return true;
    }
    return false;
  };
  const amostra = () => {
    const de = document.documentElement;
    if (de && document.body) {
      const sw = de.scrollWidth;
      const cw = de.clientWidth;
      rec.quadros++;
      if (sw > rec.maxSW) rec.maxSW = sw;
      if (sw - cw > rec.pico) {
        Object.assign(rec, { pico: sw - cw, picoSW: sw, picoCW: cw, picoEm: Math.round(performance.now()) });
        rec.culpados = [...document.body.querySelectorAll('*')]
          .filter((el) => el.getBoundingClientRect().right > cw + 0.5 && !recortado(el, cw))
          .slice(0, 6)
          .map((el) => `${descreve(el)} (right=${Math.round(el.getBoundingClientRect().right)})`);
      }
    }
    requestAnimationFrame(amostra);
  };
  requestAnimationFrame(amostra);
}

function medeAgora() {
  const de = document.documentElement;
  return {
    sw: de.scrollWidth,
    cw: de.clientWidth,
    embarcado: de.classList.contains('embarcado'),
    veu: !!document.getElementById('gate-veil'),
  };
}

async function esperarAnimacoes() {
  const doisQuadros = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const pendentes = () => document.getAnimations().filter((a) =>
    a.timeline === document.timeline && a.effect &&
    Number.isFinite(a.effect.getComputedTiming().endTime) && a.playState !== 'finished');
  let total = 0;
  for (let rodada = 0; rodada < 20; rodada++) {
    const lista = pendentes();
    if (!lista.length) return { ok: true, total };
    const pausadas = lista.filter((a) => a.playState === 'paused').length;
    if (pausadas) return { ok: false, total, erro: `${pausadas} animação(ões) pausada(s)` };
    total += lista.length;
    await Promise.all(lista.map((a) => a.finished.catch(() => {})));
    await doisQuadros();
  }
  return { ok: false, total, erro: 'animações não terminaram em 20 rodadas' };
}

async function rolarPagina() {
  const doisQuadros = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const passo = Math.max(200, Math.floor(innerHeight * 0.6));
  for (let y = 0; y <= document.documentElement.scrollHeight; y += passo) {
    scrollTo(0, y);
    await doisQuadros();
  }
  scrollTo(0, document.documentElement.scrollHeight);
  await doisQuadros();
  scrollTo(0, 0);
  await doisQuadros();
}

async function medirPagina(context, url) {
  const page = await context.newPage(); // aba nova por URL: sem view transition entre páginas
  try {
    const resp = await page.goto(url, { waitUntil: 'load' });
    const load = await page.evaluate(medeAgora);
    const anim = await page.evaluate(esperarAnimacoes);
    const fim = await page.evaluate(medeAgora);
    await page.evaluate(rolarPagina);
    const rec = await page.evaluate(() => window.__overflow);
    return { status: resp ? resp.status() : 0, load, anim, fim, rec };
  } finally {
    await page.close();
  }
}

function avaliar(largura, caminho, m) {
  const problemas = [];
  if (m.status !== 200) problemas.push(`HTTP ${m.status}`);
  if (!m.load.embarcado || m.load.veu) problemas.push('gate não liberou');
  if (!m.anim.ok) problemas.push(m.anim.erro);
  if (m.rec.quadros === 0) problemas.push('amostragem por quadro não rodou');
  const vazou = m.load.sw > m.load.cw || m.fim.sw > m.fim.cw || m.rec.pico > 0;
  if (vazou) problemas.push('OVERFLOW');
  return {
    largura,
    caminho,
    load: `${m.load.sw}/${m.load.cw}`,
    fim: `${m.fim.sw}/${m.fim.cw}`,
    pico: m.rec.pico > 0 ? `${m.rec.picoSW}/${m.rec.picoCW} @${m.rec.picoEm}ms` : `${m.rec.maxSW}/${m.load.cw}`,
    quadros: m.rec.quadros,
    problemas,
    culpados: m.rec.pico > 0 ? m.rec.culpados : [],
  };
}

function imprimir(linhas, opts, base) {
  const col = (s, n) => String(s).padEnd(n);
  console.log(`dist/ servido em ${base} · prefers-reduced-motion: ${opts.reduzido ? 'reduce' : 'no-preference'}`);
  console.log('colunas: scrollWidth/clientWidth no load, no fim das animações e no pico quadro a quadro\n');
  console.log(col('larg', 6) + col('página', 40) + col('load', 11) + col('fim anim.', 11) + col('pico', 22) + col('quadros', 9) + 'status');
  for (const l of linhas) {
    console.log(col(l.largura, 6) + col(l.caminho, 40) + col(l.load, 11) + col(l.fim, 11) + col(l.pico, 22) +
      col(l.quadros, 9) + (l.problemas.join(', ') || 'ok'));
    for (const c of l.culpados) console.log('        └ ' + c);
  }
  const falhas = linhas.filter((l) => l.problemas.length).length;
  console.log(falhas
    ? `\n${falhas} de ${linhas.length} medições com problema`
    : `\nnenhuma página passou do viewport (${linhas.length} medições)`);
}

async function main() {
  const opts = lerArgs(process.argv.slice(2));
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    throw new Error('Playwright não encontrado. Fora do ambiente cloud do Claude Code: ' +
      'npm i --no-save playwright && npx playwright install chromium');
  }
  const paginas = listarPaginas();
  avisarSeDistVelho();

  const { proc, base } = await subirPreview();
  const derruba = () => { if (proc.exitCode === null && proc.signalCode === null) proc.kill(); };
  process.on('exit', derruba);
  const raiz = new URL(base).pathname;
  const linhas = [];
  let browser;
  try {
    browser = await chromium.launch();
    for (const width of opts.larguras) {
      const context = await browser.newContext({
        viewport: { width, height: ALTURAS[width] || 800 },
        deviceScaleFactor: 1,
        reducedMotion: opts.reduzido ? 'reduce' : 'no-preference',
      });
      await context.addInitScript(scriptDePagina, CHAVE_GATE);
      for (const p of paginas) linhas.push(avaliar(width, raiz + p, await medirPagina(context, base + p)));
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    derruba();
  }
  imprimir(linhas, opts, base);
  return linhas.some((l) => l.problemas.length) ? 1 : 0;
}

main().then(
  (codigo) => { process.exitCode = codigo; },
  (e) => { console.error(e && e.message ? e.message : e); process.exitCode = 2; },
);
