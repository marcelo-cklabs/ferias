# Painel de Milhas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `milhas.html` (carteira de pontos, meta ativa, radar diário, manual de voo) gerada de um YAML que a tarefa agendada do claude.ai passa a gravar todo dia via conector GitHub.

**Architecture:** Nova collection `milhas` (zod strict, entrada única `painel`) → página `src/pages/milhas.astro` composta por 5 componentes novos em `src/components/milhas/` + cartão member no mural da home. O prompt completo da tarefa agendada fica versionado em `docs/prompt-tarefa-agendada-milhas.md` (acoplado ao schema). Fail-safe: YAML inválido derruba o build e o site fica na versão anterior.

**Tech Stack:** Astro 5 (content collections + zod), CSS puro com tokens de `global.css`, zero JS client-side além do `auth.js` existente.

**Spec:** `docs/superpowers/specs/2026-08-19-painel-milhas-design.md` (wireframe validado: https://claude.ai/code/artifact/2504da91-b07f-4015-94a7-bcc28cc4675e)

## Global Constraints

- `npm run build` DEVE passar antes de qualquer commit (é o teste do projeto; valida o zod).
- Responsividade em 375px, 768px e 1280px sem scroll horizontal (tabela da régua rola dentro do próprio contêiner).
- Links internos SEMPRE via `import.meta.env.BASE_URL` (site em `/ferias/`, `build.format: 'file'`).
- NUNCA usar `visibility: visible` em componente (vaza conteúdo pré-auth). Ids `ck-pass`, `ck-form`, `ck-err`, `gate-veil` são reservados.
- Animações de entrada novas: `animation-play-state: paused` + `:global(html.embarcado) … { animation-play-state: running; }`.
- Caixa alta sempre via `text-transform: uppercase` no CSS, nunca no dado (leitores de tela soletram siglas em caixa alta no dado). Exceção existente: h1 display (home usa "NOSSAS VIAGENS" no dado).
- YAML de conteúdo nunca tem chaves `$schema:` ou `slug:` (schema strict derruba o build).
- Textos do site em pt-BR. Mensagens de commit em pt-BR imperativo, ASCII (sem acentos), terminando com a linha `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- NÃO fazer `git push` em nenhuma tarefa — push dispara deploy; fica para o checkpoint final com o dono.

---

### Task 1: Collection `milhas` + seed `painel.yaml`

**Files:**
- Modify: `src/content.config.ts`
- Create: `src/content/milhas/painel.yaml`

**Interfaces:**
- Produces: collection `milhas` com entrada única `painel` — consumida via `getEntry('milhas', 'painel')`. Shape de `.data`: `{ atualizadoEm: string; saldos: {programa, saldo:number, unidade, tipo:'flexivel'|'terminal', nota?}[]; alertas: string[]; meta: {destino, alvo, pax, cabine?, duracao?, situacao, gatilhos: string[]}; pisos: string[]; oportunidades: {titulo, bonus?, prazo, detalhe?, url?, recomendacao:'AGIR HOJE'|'MONITORAR', tag?}[] }`.

- [ ] **Step 1: Adicionar a collection em `src/content.config.ts`**

Inserir antes da linha `export const collections = { viagens };` os schemas abaixo, e trocar o export:

```ts
// Painel de milhas: painel.yaml e escrito DIARIAMENTE pela tarefa agendada do
// claude.ai (ver docs/prompt-tarefa-agendada-milhas.md). Enum so onde a
// renderizacao ramifica; texto livre degrada exibicao sem derrubar build.
const saldoPrograma = z.object({
  programa: z.string(),
  saldo: z.number().int().nonnegative(), // pega o classico 15.547 (float) — de proposito
  unidade: z.string(),
  tipo: z.enum(['flexivel', 'terminal']),
  nota: z.string().optional(),
}).strict();

const oportunidade = z.object({
  titulo: z.string(),
  bonus: z.string().optional(),
  prazo: z.string(),
  detalhe: z.string().optional(),
  url: z.string().url().optional(),
  recomendacao: z.enum(['AGIR HOJE', 'MONITORAR']),
  tag: z.string().optional(),
}).strict();

const milhas = defineCollection({
  loader: glob({ pattern: 'painel.yaml', base: './src/content/milhas' }),
  schema: z.object({
    atualizadoEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'atualizadoEm deve ser AAAA-MM-DD'),
    saldos: z.array(saldoPrograma).min(1),
    alertas: z.array(z.string()).default([]),
    meta: z.object({
      destino: z.string(),
      alvo: z.string(),
      pax: z.string(),
      cabine: z.string().optional(),
      duracao: z.string().optional(),
      situacao: z.string(),
      gatilhos: z.array(z.string()).default([]),
    }).strict(),
    pisos: z.array(z.string()).default([]),
    oportunidades: z.array(oportunidade).default([]),
  }).strict(),
});
```

```ts
export const collections = { viagens, milhas };
```

- [ ] **Step 2: Criar o seed `src/content/milhas/painel.yaml`**

Dados reais do Notion "✈️ Viagens e Milhas" em 16/08/2026. SEM comentário `# yaml-language-server` no topo (arquivo escrito por máquina — exceção deliberada, documentada na Task 10).

```yaml
atualizadoEm: "2026-08-16"
saldos:
  - programa: "Livelo"
    saldo: 15547
    unidade: "pts"
    tipo: flexivel
    nota: "Clube ativo — **não expiram** · +9.477 a receber a partir de 02/09"
  - programa: "Smiles"
    saldo: 276117
    unidade: "milhas"
    tipo: terminal
    nota: "65.869 vencem **mai/2027** · contestação de ~31.500 em aberto"
  - programa: "Esfera"
    saldo: 32556
    unidade: "pts"
    tipo: flexivel
    nota: "Reativada em 07/08 · validade 2029 · **só transferir com bônus**"
  - programa: "C6 Átomos"
    saldo: 0
    unidade: "átomos"
    tipo: flexivel
    nota: "Zerado — transferido p/ Smiles em jun (promo 70%)"
  - programa: "LATAM Pass"
    saldo: 16378
    unidade: "milhas"
    tipo: terminal
    nota: "Sem movimento · Clube LATAM cancelado em jul/2026"
alertas:
  - "**Contestação Smiles/Esfera:** bônus de ~31.500 milhas não creditado — 2º contato em 16/08; próximo passo: chamado na Esfera + consumidor.gov.br"
  - "**Smiles:** lote de 65.869 milhas vence em **mai/2027** — casar com a emissão NY"
  - "**Livelo:** +9.477 pts entram a partir de 02/09"
meta:
  destino: "Nova York"
  alvo: "março/2027"
  pax: "2"
  cabine: "econômica"
  duracao: "14 dias"
  situacao: "**Saldo cobre:** ida e volta do casal no saver direto da American ≈ 260–290k milhas Smiles. O gargalo não é milha — é **volta saver em 2027 com 2 assentos na mesma data**. Plano B: direto em dinheiro (~R$ 8–10k o casal) preservando Smiles para Roma/Buenos Aires."
  gatilhos:
    - "volta saver 2027 · 2 assentos"
    - "bônus Esfera → Iberia (Avios)"
    - "bônus p/ Smiles (Livelo/C6)"
pisos:
  - "Livelo→Smiles ≥ 70%"
  - "Livelo→LATAM ≥ 30%"
  - "Esfera→LATAM/Iberia ≥ 50%"
  - "C6→Smiles/LATAM ≥ 50%"
  - "Reativação Smiles ≥ 200%"
  - "Clubes: bom senso"
oportunidades: []
```

- [ ] **Step 3: Build deve passar**

Run: `npm run build`
Expected: exit 0, sem erros de schema.

- [ ] **Step 4: Teste negativo — float derruba o build**

Editar `painel.yaml` trocando `saldo: 276117` por `saldo: 276.117`. Run: `npm run build`
Expected: FALHA citando a collection `milhas` (int esperado). Este é o fail-safe funcionando.

- [ ] **Step 5: Reverter a mutação e confirmar que volta a passar**

Restaurar `saldo: 276117`. Run: `npm run build`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/content.config.ts src/content/milhas/painel.yaml
git commit -m "Adiciona collection milhas e seed do painel (dados Notion 16/08)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Helpers `fmtInt` e `fmtDataIso`

**Files:**
- Modify: `src/lib/format.js`

**Interfaces:**
- Produces: `fmtInt(n: number): string` (`276117 → "276.117"`, agrupamento pt-BR) e `fmtDataIso(iso: string): string` (`"2026-08-19" → "19/08/2026"`). Consumidas pelas Tasks 3–8.

- [ ] **Step 1: Rodar o teste antes de implementar (deve falhar)**

```bash
node --input-type=module -e "
import { fmtInt, fmtDataIso } from './src/lib/format.js';
console.assert(fmtInt(276117) === '276.117', 'fmtInt grande');
console.assert(fmtInt(0) === '0', 'fmtInt zero');
console.assert(fmtDataIso('2026-08-19') === '19/08/2026', 'fmtDataIso');
console.log('ok');
"
```

Expected: FALHA (`fmtInt` não exportado).

- [ ] **Step 2: Implementar no fim de `src/lib/format.js`**

```js
/** Inteiro com agrupamento pt-BR: 276117 → "276.117". */
export function fmtInt(n) {
  return new Intl.NumberFormat('pt-BR').format(n);
}

/** "2026-08-19" → "19/08/2026". Manipulação de string — nunca new Date() (fuso). */
export function fmtDataIso(iso) {
  const [a, m, d] = String(iso).split('-');
  return `${d}/${m}/${a}`;
}
```

- [ ] **Step 3: Rodar o teste do Step 1 de novo**

Expected: imprime `ok`, sem assertions no stderr.

- [ ] **Step 4: Commit**

```bash
git add src/lib/format.js
git commit -m "Adiciona fmtInt e fmtDataIso ao format.js

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Tokens dourados + página mínima + `MemberCard` (hero)

**Files:**
- Modify: `src/styles/global.css` (só o bloco `:root`)
- Create: `src/components/milhas/MemberCard.astro`
- Create: `src/pages/milhas.astro`

**Interfaces:**
- Consumes: `getEntry('milhas', 'painel')` (Task 1), `fmtDataIso` (Task 2).
- Produces: tokens `--card-escuro`, `--card-escuro-2`, `--dourado`, `--gold-fio` (usados pelas Tasks 4–8); página `milhas.astro` com `<div class="secoes">` onde as Tasks 4–7 inserem seções; `MemberCard` com props `{ atualizadoEm: string; programas: number }`.

- [ ] **Step 1: Adicionar tokens ao `:root` de `src/styles/global.css`**

Inserir após a linha `--sombra-mesa: 0 5px 0 rgba(28, 25, 23, .12);`:

```css
  /* Tema do painel de milhas (member card escuro/dourado) */
  --card-escuro: #211d1a; --card-escuro-2: #2c2724;
  --dourado: #ca8a04; --gold-fio: #e3b341;
```

- [ ] **Step 2: Criar `src/components/milhas/MemberCard.astro`**

```astro
---
import { fmtDataIso } from '../../lib/format.js';
interface Props { atualizadoEm: string; programas: number }
const { atualizadoEm, programas } = Astro.props;
---
<header class="hero">
  <p class="overline mono">CK-LABS AIRLINES · PROGRAMA DE FIDELIDADE</p>
  <h1>MILHAS &amp;<br />PONTOS</h1>
  <p class="sub">Carteira, radar diário de oportunidades e manual de decisão</p>
  <div class="member">
    <div class="member-card" style="view-transition-name: ticket-milhas">
      <div class="topo">
        <span class="cia mono">CK-LABS AIRLINES ★ FIDELIDADE</span>
        <span class="tier">Clube Smiles 2000</span>
      </div>
      <p class="titular">Marcelo &amp; Sabrina</p>
      <div class="linha-membro">
        <span class="chip-cartao" aria-hidden="true"></span>
        <dl class="mono">
          <div><dt>Membro nº</dt><dd>CK 0001</dd></div>
          <div><dt>Desde</dt><dd>jun 2026</dd></div>
          <div><dt>Programas</dt><dd>{programas}</dd></div>
        </dl>
      </div>
      <div class="barcode" aria-hidden="true"></div>
    </div>
    <span class="stamp-verif">Verificado {fmtDataIso(atualizadoEm)}</span>
  </div>
</header>
<style>
  .hero { position: relative; max-width: 1080px; margin: 0 auto; padding: 40px 0 8px; }
  .overline { font-size: .68rem; letter-spacing: .3em; color: #92400e; margin: 0; }
  h1 {
    font-family: var(--f-display); font-size: clamp(2rem, 6.5vw, 3.6rem);
    text-shadow: 3px 3px 0 var(--ambar); margin: 10px 0 6px;
  }
  .sub { font-weight: 600; color: var(--muted-3); margin: 0 0 26px; font-size: clamp(.85rem, 2.5vw, 1rem); }
  .member { position: relative; max-width: 620px; }
  .member-card {
    background: linear-gradient(160deg, var(--card-escuro-2), var(--card-escuro) 55%);
    color: #f5f0e6; border-radius: 16px; padding: 20px 22px 0;
    box-shadow: 0 7px 0 rgba(28, 25, 23, .22); border: 1px solid #3d362f;
    overflow: hidden; display: flex; flex-direction: column; gap: 14px;
  }
  .topo { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .cia { font-size: .66rem; letter-spacing: .28em; color: var(--gold-fio); }
  .tier {
    font-family: var(--f-carimbo); font-size: .72rem; color: var(--gold-fio);
    border: 1.5px solid var(--gold-fio); border-radius: 6px; padding: 1px 8px;
    transform: rotate(2deg); text-transform: uppercase;
  }
  .titular { font-family: var(--f-display); font-size: clamp(1.15rem, 4vw, 1.7rem); color: #fdfaf3; margin: 0; text-transform: uppercase; }
  .linha-membro { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .chip-cartao {
    width: 38px; height: 28px; border-radius: 6px; flex: none;
    background: linear-gradient(135deg, #f3cf6f, var(--dourado));
    box-shadow: inset 0 0 0 1.5px rgba(60, 42, 5, .45), inset 0 8px 0 -6px rgba(255, 255, 255, .7);
  }
  dl { display: flex; gap: 26px; flex-wrap: wrap; margin: 0; }
  dt { font-size: .58rem; letter-spacing: .18em; color: #b5aa96; text-transform: uppercase; }
  dd { margin: 0; font-weight: 700; font-size: .92rem; letter-spacing: .06em; text-transform: uppercase; }
  .barcode {
    height: 34px; margin: 4px -22px 0; opacity: .8; border-top: 2px dashed #4a423a;
    background: repeating-linear-gradient(90deg, #efe6d2 0 2px, transparent 2px 5px, #efe6d2 5px 6px, transparent 6px 11px, #efe6d2 11px 14px, transparent 14px 17px);
  }
  /* rotate(-3deg) casa com o 100% do keyframe stampin global — outro ângulo pula no fim. */
  .stamp-verif {
    position: absolute; right: -8px; top: -14px;
    font-family: var(--f-carimbo); font-size: .78rem; text-transform: uppercase;
    color: var(--pend); border: 2px solid var(--pend); border-radius: 8px;
    padding: 4px 10px; background: rgba(254, 243, 199, .92); transform: rotate(-3deg);
    animation: stampin .38s cubic-bezier(.2, .8, .3, 1) .6s backwards;
    animation-play-state: paused;
  }
  :global(html.embarcado) .stamp-verif { animation-play-state: running; }
</style>
```

- [ ] **Step 3: Criar `src/pages/milhas.astro`**

```astro
---
import { getEntry } from 'astro:content';
import Base from '../layouts/Base.astro';
import MemberCard from '../components/milhas/MemberCard.astro';

const painel = await getEntry('milhas', 'painel');
if (!painel) throw new Error('src/content/milhas/painel.yaml ausente');
const d = painel.data;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
---
<Base title="Milhas & Pontos · Férias CK-Labs">
  <main class="wrap">
    <a class="volta mono" href={`${base}/`}>← VOLTAR AO MURAL</a>
    <MemberCard atualizadoEm={d.atualizadoEm} programas={d.saldos.length} />
    <div class="secoes">
      {/* Seções entram nas Tasks 4–7: Carteira, Meta ativa, Radar, Manual de voo */}
    </div>
  </main>
  <footer class="site">ÁREA PRIVADA · CK-LABS · O RADAR VERIFICA GMAIL + WEB TODA MANHÃ <span aria-hidden="true">📡</span></footer>
</Base>

<style>
  .volta {
    display: inline-block; font-size: .7rem; letter-spacing: .12em;
    color: #92400e; text-decoration: none; padding: 22px 0 0; min-height: 44px;
  }
  .volta:hover { text-decoration: underline; }
  .secoes { display: grid; gap: 34px; margin-top: 34px; }
</style>
```

- [ ] **Step 4: Build + conferir a saída**

```bash
npm run build && grep -q "PROGRAMA DE FIDELIDADE" dist/milhas.html && grep -q "Verificado 16/08/2026" dist/milhas.html && echo OK
```

Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/components/milhas/MemberCard.astro src/pages/milhas.astro
git commit -m "Cria pagina de milhas com hero member card e tokens dourados

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `SaldoCard` + seção Carteira de pontos

**Files:**
- Create: `src/components/milhas/SaldoCard.astro`
- Modify: `src/pages/milhas.astro`

**Interfaces:**
- Consumes: `fmtInt`, `mdInline` de `src/lib/format.js`; tokens da Task 3; `d.saldos` da Task 3.
- Produces: `SaldoCard` com props `{ s: {programa, saldo, unidade, tipo, nota?}; index: number }`.

- [ ] **Step 1: Criar `src/components/milhas/SaldoCard.astro`**

```astro
---
import { fmtInt, mdInline } from '../../lib/format.js';
interface Props {
  s: { programa: string; saldo: number; unidade: string; tipo: 'flexivel' | 'terminal'; nota?: string };
  index: number;
}
const { s, index } = Astro.props;
---
<article class:list={['saldo-card', s.tipo]} style={`--i:${index}`}>
  <div class="prog">
    <b>{s.programa}</b>
    <span class="tag-moeda mono">{s.tipo === 'flexivel' ? 'Flexível' : 'Terminal'}</span>
  </div>
  <p class="saldo-num mono">{fmtInt(s.saldo)} <small>{s.unidade}</small></p>
  {s.nota && <p class="saldo-nota" set:html={mdInline(s.nota)} />}
</article>
<style>
  .saldo-card {
    background: var(--tiquete); border-radius: 12px; box-shadow: var(--sombra-mesa);
    border-top: 6px solid var(--dourado); padding: 14px 16px 12px;
    display: flex; flex-direction: column; gap: 6px;
    animation: deal .55s cubic-bezier(.2, .9, .3, 1.25) calc(var(--i) * 90ms) backwards;
    animation-play-state: paused;
  }
  :global(html.embarcado) .saldo-card { animation-play-state: running; }
  .saldo-card.terminal { border-top-color: var(--muted-2); }
  .prog { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .prog b { font-size: .95rem; font-weight: 800; }
  .tag-moeda {
    font-size: .56rem; letter-spacing: .12em; text-transform: uppercase; flex: none;
    color: var(--pend); border: 1.5px solid var(--dourado); background: #fffbeb;
    border-radius: 999px; padding: 2px 8px;
  }
  .terminal .tag-moeda { color: var(--muted-3); border: 1.5px dashed var(--muted-2); background: #fafaf9; }
  .saldo-num { margin: 0; font-weight: 700; font-size: 1.7rem; font-variant-numeric: tabular-nums; letter-spacing: .01em; }
  .saldo-num small { font-size: .62rem; color: var(--muted); font-weight: 500; letter-spacing: .1em; text-transform: uppercase; }
  .saldo-nota { font-size: .74rem; color: var(--muted); border-top: 2px dashed var(--linha); padding-top: 7px; margin: 2px 0 0; }
  .saldo-nota :global(b) { color: var(--muted-3); }
</style>
```

- [ ] **Step 2: Inserir a seção em `src/pages/milhas.astro`**

Adicionar aos imports:

```astro
import SecaoTitulo from '../components/SecaoTitulo.astro';
import SaldoCard from '../components/milhas/SaldoCard.astro';
```

Dentro de `<div class="secoes">` (no lugar do comentário, mantendo o comentário para as próximas seções):

```astro
      <section>
        <SecaoTitulo icone="💳" titulo="Carteira de pontos" />
        <div class="saldos">
          {d.saldos.map((s, i) => <SaldoCard s={s} index={i + 1} />)}
        </div>
      </section>
```

E no `<style>` da página:

```css
  .saldos { display: grid; grid-template-columns: 1fr; gap: 14px; }
  @media (min-width: 640px) { .saldos { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 1024px) { .saldos { grid-template-columns: repeat(3, 1fr); } }
```

- [ ] **Step 3: Build + conferir**

```bash
npm run build && grep -q "276.117" dist/milhas.html && grep -q "Flexível" dist/milhas.html && echo OK
```

Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add src/components/milhas/SaldoCard.astro src/pages/milhas.astro
git commit -m "Adiciona carteira de pontos com cards por programa

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `MetaBoard` + seção Meta ativa

**Files:**
- Create: `src/components/milhas/MetaBoard.astro`
- Modify: `src/pages/milhas.astro`

**Interfaces:**
- Consumes: `mdInline`; `d.meta` (Task 1); tokens (Task 3).
- Produces: `MetaBoard` com prop `{ meta: {destino, alvo, pax, cabine?, duracao?, situacao, gatilhos: string[]} }`.

- [ ] **Step 1: Criar `src/components/milhas/MetaBoard.astro`**

```astro
---
import { mdInline } from '../../lib/format.js';
interface Props {
  meta: { destino: string; alvo: string; pax: string; cabine?: string; duracao?: string; situacao: string; gatilhos: string[] };
}
const { meta } = Astro.props;
---
<div class="meta-board">
  <div class="linha-voo mono">
    <span class="destino">{meta.destino}</span>
    <span class="dado">Alvo <b>{meta.alvo}</b></span>
    <span class="dado">Pax <b>{meta.pax}</b></span>
    {meta.cabine && <span class="dado">Cabine <b>{meta.cabine}</b></span>}
    {meta.duracao && <span class="dado">Duração <b>{meta.duracao}</b></span>}
  </div>
  <p class="situacao" set:html={mdInline(meta.situacao)} />
  {meta.gatilhos.length > 0 && (
    <ul class="gatilhos mono">
      {meta.gatilhos.map((g) => <li>{g}</li>)}
    </ul>
  )}
</div>
<style>
  .meta-board {
    background: var(--card-escuro); color: #f2ead8; border-radius: 14px;
    box-shadow: 0 6px 0 rgba(28, 25, 23, .2); border: 1px solid #3d362f; overflow: hidden;
  }
  .linha-voo {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 22px;
    padding: 16px 20px 12px; border-bottom: 1px solid #3d362f;
  }
  .destino { font-family: var(--f-display); font-size: clamp(1.3rem, 5vw, 2rem); color: var(--gold-fio); letter-spacing: .02em; text-transform: uppercase; }
  .dado { font-size: .72rem; letter-spacing: .12em; color: #cbbfa6; text-transform: uppercase; }
  .dado b { color: #fdfaf3; font-size: .85rem; }
  .situacao { font-size: .85rem; line-height: 1.5; color: #e9e0cd; max-width: 62ch; padding: 12px 20px; margin: 0; }
  .situacao :global(b) { color: var(--gold-fio); }
  .gatilhos { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 20px 16px; margin: 0; list-style: none; }
  .gatilhos li {
    font-size: .62rem; letter-spacing: .05em; color: #e3d9c2;
    border: 1.5px dashed #8a7c60; border-radius: 999px; padding: 3px 10px;
  }
  .gatilhos li::before { content: '📡 '; }
</style>
```

- [ ] **Step 2: Inserir a seção em `src/pages/milhas.astro`**

Import: `import MetaBoard from '../components/milhas/MetaBoard.astro';`

Depois da seção Carteira, dentro de `.secoes`:

```astro
      <section>
        <SecaoTitulo icone="🎯" titulo="Meta ativa" />
        <MetaBoard meta={d.meta} />
      </section>
```

- [ ] **Step 3: Build + conferir**

```bash
npm run build && grep -q "Nova York" dist/milhas.html && grep -q "volta saver em 2027" dist/milhas.html && echo OK
```

Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add src/components/milhas/MetaBoard.astro src/pages/milhas.astro
git commit -m "Adiciona letreiro da meta ativa ao painel de milhas

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: `Radar` + seção Radar do dia

**Files:**
- Create: `src/components/milhas/Radar.astro`
- Modify: `src/pages/milhas.astro`

**Interfaces:**
- Consumes: `fmtDataIso`, `mdInline`; `d.oportunidades`, `d.alertas`, `d.pisos`, `d.atualizadoEm`.
- Produces: `Radar` com props `{ oportunidades, alertas, pisos, atualizadoEm }` (shapes da Task 1).

- [ ] **Step 1: Criar `src/components/milhas/Radar.astro`**

```astro
---
import { fmtDataIso, mdInline } from '../../lib/format.js';
type Oportunidade = {
  titulo: string; bonus?: string; prazo: string; detalhe?: string;
  url?: string; recomendacao: 'AGIR HOJE' | 'MONITORAR'; tag?: string;
};
interface Props { oportunidades: Oportunidade[]; alertas: string[]; pisos: string[]; atualizadoEm: string }
const { oportunidades, alertas, pisos, atualizadoEm } = Astro.props;
---
{oportunidades.length > 0 ? (
  <div class="radar-lista">
    {oportunidades.map((o) => (
      <article class="oport">
        <div class="rota">
          {o.titulo}
          {o.tag && <span class="meta-flag mono">{o.tag}</span>}
        </div>
        <p class="detalhe">
          Prazo {o.prazo}{o.detalhe && <> · <span set:html={mdInline(o.detalhe)} /></>}{o.url && <> · <a href={o.url} target="_blank" rel="noopener noreferrer">página da promoção</a></>}
        </p>
        <div class="num-bonus">
          <span class="pct mono">{o.bonus ?? '—'}</span>
          <span class:list={['stamp', o.recomendacao === 'AGIR HOJE' ? 'agir' : 'monitorar']}>{o.recomendacao}</span>
        </div>
      </article>
    ))}
  </div>
) : (
  <p class="ceu-limpo"><span aria-hidden="true">☀️</span> <b>Céu limpo.</b> Nenhuma oportunidade acima dos pisos — radar verificado em {fmtDataIso(atualizadoEm)}.</p>
)}
{alertas.length > 0 && (
  <aside class="alertas">
    <b>⚠️ Pendências &amp; validades:</b>
    <ul>{alertas.map((a) => <li set:html={mdInline(a)} />)}</ul>
  </aside>
)}
{pisos.length > 0 && (
  <p class="pisos mono"><span class="rotulo">Pisos do radar →</span> {pisos.map((p) => <span class="piso">{p}</span>)}</p>
)}
<style>
  .radar-lista { display: flex; flex-direction: column; gap: 12px; }
  .oport {
    background: var(--tiquete); border-radius: 12px; box-shadow: var(--sombra-mesa);
    padding: 12px 16px; display: grid; gap: 4px 16px;
    grid-template-columns: 1fr auto; align-items: center;
  }
  .rota { font-weight: 800; font-size: .95rem; }
  .meta-flag {
    font-size: .6rem; letter-spacing: .08em; color: var(--pend);
    border: 1.5px solid var(--dourado); background: #fffbeb;
    border-radius: 999px; padding: 1px 8px; margin-left: 8px; white-space: nowrap;
  }
  .detalhe { grid-column: 1; font-size: .76rem; color: var(--muted); margin: 0; }
  .detalhe a { color: var(--pend); font-weight: 600; }
  .num-bonus { grid-row: 1 / span 2; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
  .pct { font-weight: 700; font-size: 1.5rem; font-variant-numeric: tabular-nums; }
  .stamp {
    font-family: var(--f-carimbo); font-size: .62rem; text-transform: uppercase;
    border-radius: 6px; padding: 2px 8px; transform: rotate(-2deg); white-space: nowrap;
  }
  .stamp.agir { color: var(--pend); border: 2px solid var(--pend); background: #fffbeb; }
  .stamp.monitorar { color: var(--muted); border: 2px dashed var(--muted-2); }
  .ceu-limpo {
    border: 1.5px dashed var(--muted-2); border-radius: 12px; padding: 14px 16px;
    font-size: .82rem; color: var(--muted-3); background: rgba(255, 255, 255, .5); margin: 0;
  }
  .alertas {
    background: #fffbeb; border: 1.5px dashed var(--ambar); border-radius: 10px;
    padding: 10px 14px; font-size: .8rem; margin-top: 14px;
  }
  .alertas ul { margin: 6px 0 0; padding-left: 18px; }
  .alertas li { margin: 3px 0; }
  .pisos { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 0; }
  .pisos .rotulo { color: var(--muted); font-size: .6rem; letter-spacing: .04em; align-self: center; text-transform: uppercase; }
  .piso {
    font-size: .6rem; letter-spacing: .04em; color: var(--muted-3);
    border: 1px solid var(--linha); background: rgba(255, 255, 255, .6);
    border-radius: 999px; padding: 2px 9px;
  }
</style>
```

- [ ] **Step 2: Inserir a seção em `src/pages/milhas.astro`**

Import: `import Radar from '../components/milhas/Radar.astro';`

Depois da seção Meta ativa:

```astro
      <section>
        <SecaoTitulo icone="📡" titulo="Radar do dia" />
        <Radar oportunidades={d.oportunidades} alertas={d.alertas} pisos={d.pisos} atualizadoEm={d.atualizadoEm} />
      </section>
```

- [ ] **Step 3: Build + conferir o estado vazio (seed tem `oportunidades: []`)**

```bash
npm run build && grep -q "Céu limpo" dist/milhas.html && grep -q "Pendências" dist/milhas.html && grep -q "Livelo→Smiles ≥ 70%" dist/milhas.html && echo OK
```

Expected: `OK`.

- [ ] **Step 4: Teste de mutação — estado populado renderiza**

Adicionar TEMPORARIAMENTE ao fim do `painel.yaml` (substituindo `oportunidades: []`):

```yaml
oportunidades:
  - titulo: "Livelo → Smiles"
    bonus: "80%"
    prazo: "21/08"
    detalhe: "teto p/ assinantes de Clube · fecha o milheiro a ~R$ 12,22"
    url: "https://www.smiles.com.br/"
    recomendacao: "AGIR HOJE"
    tag: "🎯 META NY"
```

```bash
npm run build && grep -q "AGIR HOJE" dist/milhas.html && grep -q "80%" dist/milhas.html && grep -q "META NY" dist/milhas.html && echo OK
```

Expected: `OK`.

- [ ] **Step 5: Reverter a mutação (`oportunidades: []`) e build de novo**

```bash
npm run build && grep -q "Céu limpo" dist/milhas.html && echo OK
```

Expected: `OK`. Conferir `git status`: só os arquivos da task modificados.

- [ ] **Step 6: Commit**

```bash
git add src/components/milhas/Radar.astro src/pages/milhas.astro
git commit -m "Adiciona radar do dia com oportunidades, alertas e pisos

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: `ManualVoo` (estático) + seção Manual de voo

**Files:**
- Create: `src/components/milhas/ManualVoo.astro`
- Modify: `src/pages/milhas.astro`

**Interfaces:**
- Consumes: tokens (Task 3). Sem props — conteúdo 100% estático (síntese própria; nunca texto do ebook).
- Produces: `ManualVoo` sem props.

- [ ] **Step 1: Criar `src/components/milhas/ManualVoo.astro`**

```astro
---
// Conteúdo estático curado: síntese do resumo crítico do ebook "Milhas Sem
// Milhas", da aula de emissões e da régua do Notion. Editar AQUI (não é YAML).
---
<div class="manual">
  <div class="man-card">
    <h3>As duas moedas</h3>
    <div class="duo-moedas">
      <div class="flex">
        <b>Flexível — Livelo · Esfera · Átomos</b>
        <p>Vira qualquer moeda com bônus de 30–120%. Vale ~2× a terminal. É onde se acumula.</p>
      </div>
      <div class="term">
        <b>Terminal — Smiles · LATAM Pass</b>
        <p>Destino final: expira e desvaloriza. Só chegar aqui com bônus alto e emissão à vista.</p>
      </div>
    </div>
  </div>
  <div class="cupom">
    <h3 class="mono">Régua de decisão</h3>
    <p class="sep mono" aria-hidden="true">· · · · · · · · · ·</p>
    <p class="formula mono">custo da milha = ponto Livelo ÷ (1 + bônus)</p>
    <div class="rolagem">
      <table class="mono">
        <thead>
          <tr><th scope="col">Bônus</th><th scope="col">Livelo R$ 22*</th><th scope="col">Livelo R$ 30</th></tr>
        </thead>
        <tbody>
          <tr><td>70%</td><td>R$ 12,94</td><td>R$ 17,65</td></tr>
          <tr class="destaque"><td>80%</td><td>R$ 12,22</td><td>R$ 16,67</td></tr>
          <tr><td>90%</td><td>R$ 11,58</td><td>R$ 15,79</td></tr>
          <tr><td>100%</td><td>R$ 11,00</td><td>R$ 15,00</td></tr>
        </tbody>
      </table>
    </div>
    <p class="sep mono" aria-hidden="true">· · · · · · · · · ·</p>
    <p class="rodape-cupom mono">* custo real via Clube Livelo Classic<br />alvo Smiles 2026: ≤ R$ 16/milheiro · ≥ ~450k/trecho = preço dinâmico, ignorar</p>
  </div>
  <div class="man-card">
    <h3>Hierarquia do acúmulo (por impacto real)</h3>
    <ol>
      <li><b>Bônus de boas-vindas de cartão</b> — só se a meta cabe no gasto natural</li>
      <li><b>Transferência bonificada</b> — esperar o topo: Smiles 80–100%+, LATAM 60%+</li>
      <li><b>Portais de compras</b> — preço primeiro, portal depois</li>
      <li><b>Clube</b> — alavanca do bônus, não fonte de pontos</li>
      <li><b>Acúmulo passivo</b> — higiene, não estratégia</li>
    </ol>
  </div>
  <div class="man-card">
    <h3>Regras de ouro</h3>
    <ul>
      <li>Acumule <b>flexível</b>; converta só com emissão em mãos</li>
      <li><b>Cadastre-se na campanha antes</b> de transferir (lição de jul/2026)</li>
      <li>Meça tudo em <b>R$/milheiro</b>, nunca em pontos</li>
      <li>Sessão limpa no portal: clique → compra no mesmo dia, sem cupom no meio</li>
      <li>Registre pedido, data, pontos prometidos e prazo (30–90 dias)</li>
      <li>Validade se resolve <b>movimentando</b> o programa, não transferindo por medo</li>
    </ul>
  </div>
  <div class="man-card">
    <h3>Emissão em 3 passos (método da aula)</h3>
    <ol>
      <li><b>Google Flights</b> multiorigem (GRU·GIG·CNF·SSA·REC·BSB) + calendário de preços</li>
      <li><b>Comparar</b> dinheiro × milhas na cia e nos parceiros (a régua decide)</li>
      <li><b>Emitir</b> pelo programa certo no mapa de parcerias — só assento saver</li>
    </ol>
    <p class="obs">Referência de emissão boa: ≥ R$ 33/milheiro extraído · executiva internacional extrai 4–5× o custo do milheiro.</p>
  </div>
</div>
<style>
  .manual { display: grid; grid-template-columns: 1fr; gap: 14px; }
  @media (min-width: 900px) {
    .manual { grid-template-columns: 1fr 1fr; }
    .cupom { grid-row: span 2; }
  }
  .man-card { background: var(--tiquete); border-radius: 12px; box-shadow: var(--sombra-mesa); padding: 14px 18px; }
  .man-card h3 { font-size: .92rem; font-weight: 800; margin-bottom: 8px; }
  .man-card p, .man-card li { font-size: .8rem; }
  .man-card ol, .man-card ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 5px; }
  .obs { color: var(--muted); font-size: .72rem; margin: 8px 0 0; }
  .duo-moedas { display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media (min-width: 520px) { .duo-moedas { grid-template-columns: 1fr 1fr; } }
  .duo-moedas > div { border-radius: 10px; padding: 9px 12px; }
  .duo-moedas .flex { border: 1.5px solid var(--dourado); background: #fffbeb; }
  .duo-moedas .term { border: 1.5px dashed var(--muted-2); background: #fafaf9; }
  .duo-moedas b { display: block; font-size: .78rem; }
  .duo-moedas p { margin: 3px 0 0; font-size: .72rem; color: var(--muted-3); }
  .cupom {
    background: var(--tiquete); border-radius: 4px; padding: 16px 18px;
    border: 1.5px dashed var(--muted-2); box-shadow: var(--sombra-mesa); align-self: start;
  }
  .cupom h3 { font-size: .8rem; letter-spacing: .14em; text-align: center; font-weight: 700; text-transform: uppercase; margin: 0; }
  .sep { text-align: center; color: var(--muted-2); letter-spacing: .5em; margin: 6px 0; font-size: .7rem; }
  .formula { font-size: .68rem; color: var(--muted-3); margin: 0 0 6px; }
  .rolagem { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; min-width: 300px; font-size: .72rem; font-variant-numeric: tabular-nums; }
  th, td { text-align: right; padding: 4px 6px; border-bottom: 1px dashed var(--linha); white-space: nowrap; }
  th:first-child, td:first-child { text-align: left; }
  thead th { color: var(--muted); font-weight: 500; font-size: .62rem; letter-spacing: .05em; }
  .destaque td { font-weight: 700; background: #fffbeb; }
  .rodape-cupom { font-size: .64rem; color: var(--muted); text-align: center; margin: 10px 0 0; }
</style>
```

- [ ] **Step 2: Inserir a seção em `src/pages/milhas.astro`**

Import: `import ManualVoo from '../components/milhas/ManualVoo.astro';`

Depois da seção Radar (remover o comentário-placeholder das seções, se ainda existir):

```astro
      <section>
        <SecaoTitulo icone="📓" titulo="Manual de voo" />
        <ManualVoo />
      </section>
```

- [ ] **Step 3: Build + conferir**

```bash
npm run build && grep -q "Régua de decisão" dist/milhas.html && grep -q "R\$ 12,22" dist/milhas.html && grep -q "As duas moedas" dist/milhas.html && echo OK
```

Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add src/components/milhas/ManualVoo.astro src/pages/milhas.astro
git commit -m "Adiciona manual de voo estatico ao painel de milhas

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: `MilhasCard` no mural da home

**Files:**
- Create: `src/components/milhas/MilhasCard.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `fmtDataIso`; `getEntry('milhas', 'painel')`; tokens (Task 3).
- Produces: `MilhasCard` com props `{ atualizadoEm: string; programas: number; index: number }`.

- [ ] **Step 1: Criar `src/components/milhas/MilhasCard.astro`**

```astro
---
import { fmtDataIso } from '../../lib/format.js';
interface Props { atualizadoEm: string; programas: number; index: number }
const { atualizadoEm, programas, index } = Astro.props;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
---
<a class="cartao-milhas" href={`${base}/milhas.html`} style={`--i:${index};view-transition-name:ticket-milhas`}>
  <span class="faixa" aria-hidden="true"></span>
  <span class="corpo">
    <span class="rota mono">
      <b>Acúmulo</b>
      <span class="tracinho" aria-hidden="true"><span class="aviao">✈️</span></span>
      <b>Emissão</b>
    </span>
    <span class="nome"><span aria-hidden="true">💳</span> Milhas &amp; Pontos</span>
    <span class="quando mono">radar diário · {programas} programas</span>
    <span class="resumo">Carteira, oportunidades do dia e manual de decisão</span>
    <span class="carimbo">Verificado {fmtDataIso(atualizadoEm)}</span>
  </span>
  <span class="rodape" aria-hidden="true">
    <span class="mono num">CARTÃO Nº 001</span>
    <span class="barrinhas"></span>
  </span>
</a>
<style>
  .cartao-milhas {
    display: flex; flex-direction: column; text-decoration: none;
    background: linear-gradient(160deg, var(--card-escuro-2), var(--card-escuro) 55%);
    color: #f5f0e6; border-radius: 12px; overflow: hidden;
    box-shadow: var(--sombra-mesa); border: 1px solid #3d362f;
    animation: deal .55s cubic-bezier(.2, .9, .3, 1.25) calc(var(--i) * 130ms) backwards;
    animation-play-state: paused;
    transition: transform .18s ease, box-shadow .18s ease;
    transform: rotate(.5deg);
  }
  :global(html.embarcado) .cartao-milhas { animation-play-state: running; }
  .cartao-milhas:hover, .cartao-milhas:focus-visible {
    transform: translateY(-5px) rotate(0deg);
    box-shadow: 0 12px 22px rgba(28, 25, 23, .28);
  }
  .faixa { height: 6px; background: linear-gradient(90deg, #f3cf6f, var(--dourado)); }
  .corpo { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px 10px; }
  .rota { display: flex; align-items: baseline; gap: 10px; font-size: 1.05rem; font-weight: 700; color: var(--gold-fio); letter-spacing: .04em; text-transform: uppercase; }
  .tracinho { flex: 1; border-bottom: 2px dashed #4a423a; position: relative; }
  .aviao { position: absolute; left: 50%; top: -.7em; transform: translateX(-50%); font-size: .7em; }
  .nome { font-weight: 800; font-size: 1rem; color: #fdfaf3; }
  .quando { font-size: .72rem; color: #b5aa96; text-transform: uppercase; }
  .resumo { font-size: .8rem; color: #cbbfa6; }
  .carimbo {
    align-self: flex-start; margin-top: 2px;
    font-family: var(--f-carimbo); font-size: .68rem; line-height: 1.2; padding: 2px 8px;
    border: 2px solid var(--gold-fio); border-radius: 6px; color: var(--gold-fio);
    transform: rotate(-3deg); text-transform: uppercase;
    animation: stampin .38s cubic-bezier(.2, .8, .3, 1) .95s backwards;
    animation-play-state: paused;
  }
  :global(html.embarcado) .carimbo { animation-play-state: running; }
  .rodape {
    display: flex; justify-content: space-between; align-items: center;
    border-top: 2px dashed #4a423a; padding: 8px 16px; position: relative;
  }
  /* Furos do tíquete na cor do papel, como no TicketCard */
  .rodape::before, .rodape::after {
    content: ''; position: absolute; top: -9px; width: 18px; height: 18px;
    border-radius: 50%; background: var(--papel);
  }
  .rodape::before { left: -9px; } .rodape::after { right: -9px; }
  .num { font-size: .62rem; color: #8a7c60; }
  .barrinhas {
    width: 90px; height: 16px; opacity: .7;
    background: repeating-linear-gradient(90deg, #8a7c60 0 2px, transparent 2px 4px, #8a7c60 4px 7px, transparent 7px 10px);
  }
</style>
```

- [ ] **Step 2: Inserir no mural em `src/pages/index.astro`**

No frontmatter, trocar o import de `getCollection` e buscar o painel:

```astro
import { getCollection, getEntry } from 'astro:content';
```

```astro
const painel = await getEntry('milhas', 'painel');
```

E adicionar o import do componente:

```astro
import MilhasCard from '../components/milhas/MilhasCard.astro';
```

No corpo, dentro de `<div class="mural">`, logo após `{mural.map((v, i) => <TicketCard viagem={v} index={i + 1} />)}`:

```astro
      {painel && <MilhasCard atualizadoEm={painel.data.atualizadoEm} programas={painel.data.saldos.length} index={mural.length + 1} />}
```

- [ ] **Step 3: Build + conferir**

```bash
npm run build && grep -q "CARTÃO Nº 001" dist/index.html && grep -q "milhas.html" dist/index.html && echo OK
```

Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add src/components/milhas/MilhasCard.astro src/pages/index.astro
git commit -m "Adiciona cartao do programa de fidelidade ao mural da home

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Prompt completo da tarefa agendada (versionado)

**Files:**
- Create: `docs/prompt-tarefa-agendada-milhas.md`

**Interfaces:**
- Consumes: contrato do `painel.yaml` (Task 1) — o template do passo 6 DEVE espelhar o schema exatamente.
- Produces: arquivo que o dono cola inteiro (da linha "Você é meu assistente…" até o fim) no prompt da tarefa em claude.ai.

- [ ] **Step 1: Criar `docs/prompt-tarefa-agendada-milhas.md` com o conteúdo EXATO abaixo**

````markdown
# Prompt da tarefa agendada — briefing de milhas + publicação no site

> Cópia canônica do prompt da tarefa agendada do claude.ai
> (https://claude.ai/scheduled-task/trig_016Cbjsqt3A51hcsUXAbjeek).
> **Acoplado ao schema da collection `milhas`** (`src/content.config.ts`): mudou um,
> mude o outro no MESMO commit — e o dono precisa recolar este arquivo inteiro no
> prompt da tarefa.
>
> Diferenças vs. o prompt anterior (18/08/2026): passo 6 novo (publicação no site);
> item 4 ganha a linha de status do painel; item 5 (dia seco) ajustado para permitir
> essa linha; fallbacks de saldos e da meta atualizados para o estado de 16/08/2026.
>
> Requisitos na tarefa do claude.ai: conectores **Notion**, **Gmail** e **GitHub**
> habilitados. Cole tudo a partir da linha "Você é meu assistente".

---

Você é meu assistente de oportunidades de milhas e pontos. Execute o briefing matinal abaixo de forma objetiva, sem floreios.

0) FONTE DA VERDADE — Antes de qualquer coisa, leia a página do Notion "✈️ Viagens e Milhas" (id: 37230767d59d8037b5f9cff0e04bad75; URL: https://www.notion.so/Viagens-e-Milhas-37230767d59d8037b5f9cff0e04bad75). Use a ferramenta Notion (fetch) com esse id.
   - Dela, extraia e use como verdade atual: SALDOS por programa, DATAS DE EXPIRAÇÃO/ações, METAS DE VIAGEM (incluindo a viagem prioritária ativa e seus "gatilhos a monitorar") e os PISOS DE BÔNUS.
   - Os pisos e o portfólio dessa página têm prioridade sobre quaisquer valores hardcoded neste prompt.
   - Se a página estiver inacessível, siga com os valores de fallback listados na seção CONTEXTO abaixo e avise no fim que usou o fallback.

CONTEXTO DE FALLBACK (usar SOMENTE se o Notion estiver indisponível — estado de 16/08/2026):
- Livelo (Bradesco): ~15.547 pontos — programa principal (Clube ativo, não expiram)
- Smiles: ~276.117 milhas ativas (65.869 vencem mai/2027; contestação de ~31.500 do bônus Esfera em aberto)
- Esfera (Santander): ~32.556 pontos (reativada em 07/08, validade 2029)
- C6 Átomos: 0 (zerado em jun/2026)
- LATAM Pass: ~16.378 milhas
- Eu NÃO revendo milhas. Uso só para viagens próprias.
- Meta ativa de fallback: Nova York, 14 dias, alvo março/2027, 2 pax, econômica. O pool Smiles já cobre; o gargalo é DISPONIBILIDADE DE VOLTA SAVER em 2027 com 2 assentos na mesma data. Rota Avios (Esfera→Iberia) é otimização opcional.

O QUE FAZER EM CADA EXECUÇÃO:

1) GMAIL — Buscar no label "Milhas & Pontos" os e-mails das últimas 24 horas.
   - Use a ferramenta Gmail (search_threads) com query similar a: label:"Milhas & Pontos" newer_than:1d
   - Leia o conteúdo dos threads relevantes (get_thread) e extraia APENAS promoções ativas com prazo claro.
   - Ignore notícias gerais, newsletters editoriais, dicas, conteúdo institucional.

2) WEB — Pesquise promoções ativas HOJE em:
   - melhoresdestinos.com.br/milhas
   - passageirodeprimeira.com (seção promoções)
   - melhorescartoes.com.br
   Use WebSearch e/ou web_fetch. Foque em:
   - Transferência bonificada Livelo / Esfera / C6 / Bradesco → Smiles ou LATAM Pass
   - Transferência bonificada Esfera → Iberia (Avios) — relevante para a meta EUA (rota Avios)
   - Reativação de milhas Smiles com bônus
   - Promoções de clube Livelo ou clube Esfera (assinatura com bônus de pontos)

3) FILTRO DE RELEVÂNCIA — Use os PISOS da página Notion. Se indisponível, use estes como fallback (abaixo disso, IGNORE):
   - Livelo → Smiles: só reportar se bônus >= 70%
   - Livelo → LATAM Pass: só reportar se bônus >= 30%
   - Esfera → LATAM / Ibéria Plus: só reportar se bônus >= 50%
   - C6 → Smiles / LATAM: só reportar se bônus >= 50%
   - Reativação Smiles: só reportar se bônus >= 200%
   - Clube Livelo/Esfera: reportar se a promoção for claramente vantajosa — usar bom senso.

   EXCEÇÃO POR META ATIVA: promoções que avancem diretamente a viagem prioritária da página Notion podem ser reportadas MESMO abaixo do piso passivo, desde que claramente marcadas com "🎯 META EUA". Em especial:
   - Qualquer bônus Esfera → Iberia (Avios), mesmo < 50% — otimização da rota Avios.
   - Bônus de transferência para Smiles (Livelo/C6) que preservem ou ampliem o pool da meta.

4) FORMATO DE ENTREGA — Lista curta, um item por promoção que passou no filtro:
   - **Programa origem → destino (X% bônus)** — adicionar "🎯 META EUA" quando aplicável
   - Prazo de expiração da promoção (data específica)
   - Link direto da página de cadastro/promoção
   - Recomendação: "AGIR HOJE" / "MONITORAR" / "IGNORAR"

   Ordene por recomendação (AGIR HOJE primeiro), com itens "🎯 META EUA" priorizados, e depois por % de bônus decrescente.
   Encerre SEMPRE com uma linha de status do painel: "📟 Painel do site atualizado (milhas: briefing AAAA-MM-DD)" — ou o motivo de não ter atualizado.

5) SE NADA PASSAR NO FILTRO: responda somente:
   "Nenhuma oportunidade relevante hoje."
   seguida da linha de status do painel (📟 …). Sem preâmbulo, sem despedida, sem explicação.

6) PUBLICAR NO SITE — Depois de consolidar o briefing, atualize o painel do site com a ferramenta GitHub:
   - Repo: marcelo-cklabs/ferias · branch: main · arquivo: src/content/milhas/painel.yaml
   - Leia o arquivo atual (get_file_contents). Use-o como base: COPIE e edite APENAS o que mudou hoje. Estrutura, chaves e ordem permanecem exatamente as mesmas.
   - Atualize:
     - atualizadoEm: a data de hoje, formato AAAA-MM-DD
     - saldos / alertas / meta / pisos: espelhando a página Notion lida no passo 0
     - oportunidades: os itens que passaram no filtro HOJE (AGIR HOJE e MONITORAR; IGNORE não entra) + itens de dias anteriores cujo prazo ainda não venceu. Remova os vencidos. Dia sem nada: oportunidades: [] (a chave sempre existe).
   - Grave com create_or_update_file (informe o sha do arquivo atual), mensagem de commit: milhas: briefing AAAA-MM-DD
   - REGRAS DO ARQUIVO (o build do site valida e FALHA se violar):
     - saldo é número INTEIRO sem separador de milhar (escreva 276117, nunca 276.117)
     - tipo só aceita: flexivel | terminal (sem acento; Livelo/Esfera/Átomos = flexivel, Smiles/LATAM = terminal)
     - recomendacao só aceita: AGIR HOJE | MONITORAR
     - prazo é obrigatório em cada oportunidade; bonus é opcional (omita a linha se o % não for claro)
     - links de promoção vão SOMENTE no campo url (nunca como markdown dentro de detalhe)
     - texto livre aceita só **negrito** e *itálico* — nada de HTML, nada de links inline
     - NUNCA crie chaves novas, NUNCA use $schema: ou slug:, NUNCA toque outro arquivo do repo
   - Em caso de QUALQUER dúvida sobre o formato: NÃO grave e explique o motivo na linha de status.
   - TEMPLATE (formato exato do arquivo; os valores são exemplo):

```yaml
atualizadoEm: "2026-08-19"
saldos:
  - programa: "Livelo"
    saldo: 15547
    unidade: "pts"
    tipo: flexivel
    nota: "Clube ativo — **não expiram** · +9.477 a receber a partir de 02/09"
alertas:
  - "**Contestação Smiles/Esfera:** bônus de ~31.500 milhas não creditado"
meta:
  destino: "Nova York"
  alvo: "março/2027"
  pax: "2"
  cabine: "econômica"
  duracao: "14 dias"
  situacao: "**Saldo cobre.** Gargalo: **volta saver em 2027 com 2 assentos**."
  gatilhos:
    - "volta saver 2027 · 2 assentos"
pisos:
  - "Livelo→Smiles ≥ 70%"
oportunidades:
  - titulo: "Livelo → Smiles"
    bonus: "80%"
    prazo: "21/08"
    detalhe: "teto p/ assinantes de Clube"
    url: "https://www.smiles.com.br/campanha-exemplo"
    recomendacao: "AGIR HOJE"
    tag: "🎯 META EUA"
```

REGRAS RÍGIDAS:
- NÃO inclua resumo de notícias gerais.
- NÃO inclua dicas genéricas ("vale a pena acumular...", "fique de olho...").
- NÃO inclua promoções sem prazo claro de expiração.
- NÃO invente bônus que não está explícito na fonte — se a fonte só diz "bônus em breve", IGNORE.
- Se uma promoção parece relevante mas o % não está claro, marque como "MONITORAR" e indique o que falta confirmar.

Comece lendo o Notion (fonte da verdade), depois o Gmail, depois a varredura web, consolide a lista final e por último PUBLIQUE no site (passo 6).
````

- [ ] **Step 2: Conferir consistência com o schema**

Checar manualmente: cada chave do TEMPLATE existe no schema da Task 1, mesmos nomes e tipos (`atualizadoEm`, `saldos[].programa/saldo/unidade/tipo/nota`, `alertas`, `meta.destino/alvo/pax/cabine/duracao/situacao/gatilhos`, `pisos`, `oportunidades[].titulo/bonus/prazo/detalhe/url/recomendacao/tag`). Enum values idênticos (`flexivel`, `terminal`, `AGIR HOJE`, `MONITORAR`).

- [ ] **Step 3: Commit**

```bash
git add docs/prompt-tarefa-agendada-milhas.md
git commit -m "Versiona o prompt da tarefa agendada com o passo de publicacao

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: CLAUDE.md + AGENTS.md (espelhos)

**Files:**
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: decisões das Tasks 1–9.

- [ ] **Step 1: Inserir a seção abaixo em `CLAUDE.md`, entre a seção "## Arquitetura — o contrato central" e "## Checklist de viagem nova"**

```markdown
## Painel de milhas — contrato

A página `milhas.html` é gerada de `src/content/milhas/painel.yaml` (collection `milhas`, entrada única `painel`). **Esse YAML é escrito todos os dias pela tarefa agendada do claude.ai** (briefing de milhas) via conector GitHub — commits `milhas: briefing AAAA-MM-DD` na main. Não brigar com ela: edição manual nesse arquivo será sobrescrita na próxima execução; o dado canônico vem da página Notion "✈️ Viagens e Milhas".

- **Schema e prompt são acoplados:** mudou o schema da collection `milhas` (`src/content.config.ts`), atualize `docs/prompt-tarefa-agendada-milhas.md` no MESMO commit — e o dono precisa recolar o prompt na tarefa do claude.ai.
- `painel.yaml` NÃO leva comentário `# yaml-language-server` (arquivo escrito por máquina — exceção deliberada à regra dos YAMLs de viagem).
- Conteúdo estático da página (Manual de voo, member card, tier do clube) é hardcoded em `src/pages/milhas.astro` e `src/components/milhas/` — editar lá, não no YAML.
- O cartão da home vem de `src/components/milhas/MilhasCard.astro` ("CARTÃO Nº 001", numeração própria — não usa `bilhete` das viagens).
```

- [ ] **Step 2: Inserir EXATAMENTE a mesma seção em `AGENTS.md`, na mesma posição relativa**

Ler `AGENTS.md` primeiro (é espelho do CLAUDE.md — pode diferir só na primeira linha). Inserir o bloco idêntico entre as mesmas seções.

- [ ] **Step 3: Conferir o espelhamento**

```bash
diff <(grep -A 8 "Painel de milhas" CLAUDE.md) <(grep -A 8 "Painel de milhas" AGENTS.md) && echo ESPELHADO
```

Expected: `ESPELHADO` (diff vazio).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md AGENTS.md
git commit -m "Documenta o contrato do painel de milhas no CLAUDE.md e AGENTS.md

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Verificação final (SEM push)

**Files:**
- Nenhum novo — verificação.

- [ ] **Step 1: Build limpo do zero**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 2: Checagens de conteúdo consolidadas**

```bash
grep -q "PROGRAMA DE FIDELIDADE" dist/milhas.html \
  && grep -q "276.117" dist/milhas.html \
  && grep -q "Nova York" dist/milhas.html \
  && grep -q "Céu limpo" dist/milhas.html \
  && grep -q "Régua de decisão" dist/milhas.html \
  && grep -q "CARTÃO Nº 001" dist/index.html \
  && grep -q "noindex" dist/milhas.html \
  && grep -q "auth.js" dist/milhas.html \
  && echo TUDO-OK
```

Expected: `TUDO-OK` (as duas últimas conferem gate + noindex herdados do Base).

- [ ] **Step 3: Conferir que nenhum componente novo usa `visibility: visible`**

```bash
grep -rn "visibility" src/components/milhas/ src/pages/milhas.astro; echo "exit: $?"
```

Expected: `exit: 1` (nenhuma ocorrência).

- [ ] **Step 4: Preview para a revisão visual do dono/sessão principal**

```bash
npm run preview
```

A checagem visual (375/768/1280, animações pós-gate, hover do cartão na home) é do revisor na sessão principal — NÃO fazer push; o push (deploy) acontece só após a revisão visual e confirmação.

---

## Pós-execução (sessão principal, fora deste plano)

1. Revisão visual no preview (3 breakpoints + gate + view transition home ↔ milhas).
2. `git push origin main` (deploy) após confirmação do dono.
3. Entregar ao dono as instruções: recolar o prompt (`docs/prompt-tarefa-agendada-milhas.md`) na tarefa do claude.ai, habilitar o conector GitHub nela, rodar a tarefa manualmente 1x e conferir o commit `milhas: briefing …` + Actions verde + página com `atualizadoEm` novo.
