# Redesign Astro "Cartão de Embarque" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir o site de viagens como projeto Astro estático com design "cartão de embarque", dados em content collections (1 YAML por viagem) e deploy no GitHub Pages — conforme spec `docs/superpowers/specs/2026-08-07-redesign-astro-cartao-embarque-design.md`.

**Architecture:** Astro 5 (MPA, zero JS client-side exceto `public/auth.js`). Cada viagem é um YAML validado por zod que gera o tíquete da home E a página de detalhe. Componentes .astro server-rendered; animações 100% CSS; View Transitions cross-document via CSS (`@view-transition`).

**Tech Stack:** Astro ^5, zod (embutido no Astro), @fontsource (Archivo Black, Inter Variable, IBM Plex Mono, Special Elite), GitHub Actions → GitHub Pages.

## Global Constraints

- Branch de trabalho: `claude/redesign-astro` (já existe; spec commitado nele).
- Idioma do site e dos dados: **pt-BR**. Mensagens de commit: pt-BR **sem acentos** (convenção do repo, ex.: "Adiciona spec do redesign Astro").
- `astro.config.mjs`: `site: 'https://marcelo-cklabs.github.io'`, `base: '/ferias'`, `build: { format: 'file' }` — URLs `viagens/<slug>.html` preservadas. Os 6 slugs atuais não mudam.
- Todo link/asset interno usa `import.meta.env.BASE_URL` (padrão nos componentes: `const base = import.meta.env.BASE_URL.replace(/\/$/, '')`).
- **Zero JS no site final exceto `public/auth.js`.** Nenhum framework de UI. Animações são CSS puro e TODAS desligam com `prefers-reduced-motion: reduce`.
- Senha do gate inalterada: `<senha: ver public/auth.js>` · chave `ferias_cklabs_auth` · `sessionStorage`. A senha só pode existir em `public/auth.js`.
- Conteúdo portado 1:1 — **nenhuma correção editorial**; contradições pré-existentes vão para a descrição do PR (lista na Task 14).
- Cores por viagem (exatas): SP jul `#334155` · Nordeste `#0e7490` · Iron Maiden `#7f1d1d` · Eddie Vedder `#92400e` · Rush `#3730a3` · NY `#1d4ed8`. Âmbar da marca `#f59e0b`, papel `#fef3c7`, tinta `#1c1917`.
- Responsividade imprescindível: zero scroll horizontal em 375/768/1280px nas 7 páginas.
- Não há framework de testes: o ciclo de verificação é `npm run build` (schema zod valida dados), asserts com `node -e`, greps no `dist/` e conferência no preview/dev server.
- `npm run build` DEVE passar ao fim de toda task; commit por task.

## Fontes de verdade para o port

Os HTML atuais permanecem no repo até a Task 13 e são a fonte do port: `index.html`, `viagens/saopaulo-jul2026.html`, `viagens/nordeste-set2026.html`, `viagens/saopaulo-out2026.html`, `viagens/saopaulo-nov2026.html`, `viagens/brasilia-fev2027.html`, `viagens/newyork-2027.html`.

---

### Task 1: Scaffold do projeto Astro

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/pages/index.astro` (mínima, substituída na Task 5)
- Replace: `.gitignore`

**Interfaces:**
- Produces: comandos `npm run dev|build|preview`; config com `base: '/ferias'` e `build.format: 'file'` que TODAS as tasks seguintes assumem.

- [ ] **Step 1: Verificar pré-requisito Node**

Run: `node --version`
Expected: v20+ (ideal v22). Se não houver Node, PARAR e avisar o usuário — nada funciona sem ele.

- [ ] **Step 2: Criar package.json**

```json
{
  "name": "ferias",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@fontsource/archivo-black": "^5.0.0",
    "@fontsource-variable/inter": "^5.0.0",
    "@fontsource/ibm-plex-mono": "^5.0.0",
    "@fontsource/special-elite": "^5.0.0"
  }
}
```

- [ ] **Step 3: Criar astro.config.mjs**

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://marcelo-cklabs.github.io',
  base: '/ferias',
  build: { format: 'file' },
});
```

- [ ] **Step 4: Criar tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/base",
  "include": [".astro/types.d.ts", "src/**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 5: Substituir .gitignore** (o atual é template Node genérico; o novo é enxuto)

```gitignore
node_modules/
dist/
.astro/
.DS_Store

# Mockups do visual companion (brainstorming)
.superpowers/
```

- [ ] **Step 6: Criar página provisória** `src/pages/index.astro`

```astro
---
---
<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Férias CK-Labs</title></head>
<body><p>Em reconstrução.</p></body></html>
```

- [ ] **Step 7: Instalar e buildar**

Run: `npm install && npm run build`
Expected: build OK; existe `dist/index.html`.

- [ ] **Step 8: Verificar que o site antigo não foi tocado**

Run: `git status --short`
Expected: apenas arquivos novos + `.gitignore` e `package-lock.json`; `index.html` e `viagens/` intactos.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json src/pages/index.astro .gitignore
git commit -m "Adiciona scaffold do projeto Astro (base /ferias, format file)"
```

---

### Task 2: Schema das collections + helpers de formatação

**Files:**
- Create: `src/content.config.ts`, `src/lib/format.js`

**Interfaces:**
- Produces (schema — todos os componentes consomem estes nomes de campo):
  - Identidade: `titulo, tituloCard, emoji, subtitulo, rota{origem, origemNome, destino, destinoNome, retorno?, retornoNome?}, dataInicio (date), dataCard, dataDisplay, pax (string), status ('planejando'|'confirmada'|'realizada'), statusLabel, cor (#hex), resumoCard, bilhete (int), heroMeta[]{rotulo, valor}, footer, secoes[]`.
  - Seções (união discriminada por `tipo`): `ficha{titulo, icone, cartoes[], lembretes?, notas?}`, `roteiro{titulo, icone, dias[]}`, `voos{titulo, icone, trechos?, notas?}`, `hospedagem{titulo, icone, cartoes?, checklist?, destaque?, notas?}`, `gastos{titulo, icone, linhas[], totais[], notas?}`, `checklist{titulo, icone, itens[]}`.
  - Cartão (ficha/hospedagem): `{titulo?, subtitulo?, entradas[]{rotulo, valor}, total?}`.
  - Gasto: `linhas[]{categoria, descricao, status?('pago'|'recebido'|'pendente'), valor (number, negativo ok)}`; `totais[]{rotulo, valor (number)}`.
  - Helpers JS: `formatBRL(valor: number): string` (1234.56 → "R$ 1.234,56"; −616 → "− R$ 616,00") e `mdInline(s: string): string` (escapa HTML; `**b**`→`<b>`, `*i*`→`<i>`, `[t](url)`→`<a target="_blank" rel="noopener">`).

- [ ] **Step 1: Criar src/content.config.ts**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const kv = z.object({ rotulo: z.string(), valor: z.string() });

const cartao = z.object({
  titulo: z.string().optional(),
  subtitulo: z.string().optional(),
  entradas: z.array(kv).default([]),
  total: z.string().optional(),
});

const secaoFicha = z.object({
  tipo: z.literal('ficha'),
  titulo: z.string(),
  icone: z.string().default('ℹ️'),
  cartoes: z.array(cartao).min(1),
  lembretes: z.array(z.string()).optional(),
  notas: z.array(z.string()).optional(),
});

const itemRoteiro = z.object({
  hora: z.string().optional(),
  titulo: z.string(),
  tag: z.string().optional(),
  status: z.string().optional(),
  endereco: z.string().optional(),
  enderecoUrl: z.string().url().optional(),
  meta: z.string().optional(),
});

const diaRoteiro = z.object({
  data: z.string(),
  diaSemana: z.string().optional(),
  local: z.string().optional(),
  texto: z.string().optional(),
  itens: z.array(itemRoteiro).optional(),
  tags: z.array(z.string()).optional(),
});

const secaoRoteiro = z.object({
  tipo: z.literal('roteiro'),
  titulo: z.string().default('Roteiro dia a dia'),
  icone: z.string().default('🗺️'),
  dias: z.array(diaRoteiro).min(1),
});

const perna = z.object({
  de: z.string(), deHora: z.string(), deNome: z.string(),
  para: z.string(), paraHora: z.string(), paraNome: z.string(),
  voo: z.string().optional(),
});

const trecho = z.object({
  titulo: z.string(),
  localizador: z.string().optional(),
  pernas: z.array(perna).min(1),
  conexao: z.string().optional(),
});

const secaoVoos = z.object({
  tipo: z.literal('voos'),
  titulo: z.string().default('Voos'),
  icone: z.string().default('✈️'),
  trechos: z.array(trecho).optional(),
  notas: z.array(z.string()).optional(),
});

const secaoHospedagem = z.object({
  tipo: z.literal('hospedagem'),
  titulo: z.string().default('Hospedagem'),
  icone: z.string().default('🏨'),
  cartoes: z.array(cartao).optional(),
  checklist: z.array(z.string()).optional(),
  destaque: z.string().optional(),
  notas: z.array(z.string()).optional(),
});

const linhaGasto = z.object({
  categoria: z.string(),
  descricao: z.string(),
  status: z.enum(['pago', 'recebido', 'pendente']).optional(),
  valor: z.number(),
});

const secaoGastos = z.object({
  tipo: z.literal('gastos'),
  titulo: z.string().default('Gastos'),
  icone: z.string().default('💰'),
  linhas: z.array(linhaGasto).default([]),
  totais: z.array(z.object({ rotulo: z.string(), valor: z.number() })).default([]),
  notas: z.array(z.string()).optional(),
});

const secaoChecklist = z.object({
  tipo: z.literal('checklist'),
  titulo: z.string(),
  icone: z.string().default('✅'),
  itens: z.array(z.object({ texto: z.string(), detalhe: z.string().optional() })).min(1),
});

const viagens = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/viagens' }),
  schema: z.object({
    titulo: z.string(),
    tituloCard: z.string(),
    emoji: z.string(),
    subtitulo: z.string(),
    rota: z.object({
      origem: z.string(), origemNome: z.string(),
      destino: z.string(), destinoNome: z.string(),
      retorno: z.string().optional(), retornoNome: z.string().optional(),
    }),
    dataInicio: z.coerce.date(),
    dataCard: z.string(),
    dataDisplay: z.string(),
    pax: z.string(),
    status: z.enum(['planejando', 'confirmada', 'realizada']),
    statusLabel: z.string(),
    cor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    resumoCard: z.string(),
    bilhete: z.number().int().positive(),
    heroMeta: z.array(kv).default([]),
    footer: z.string(),
    secoes: z.array(z.discriminatedUnion('tipo', [
      secaoFicha, secaoRoteiro, secaoVoos, secaoHospedagem, secaoGastos, secaoChecklist,
    ])),
  }),
});

export const collections = { viagens };
```

- [ ] **Step 2: Criar src/lib/format.js**

```js
/** Formata número em BRL. Negativo usa sinal tipográfico "− " antes do R$. */
export function formatBRL(valor) {
  const abs = Math.abs(valor);
  const s = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${valor < 0 ? '− ' : ''}R$ ${s}`;
}

/** Markdown inline restrito: escapa HTML, depois **negrito**, *italico*, [texto](url). */
export function mdInline(s) {
  let out = String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  out = out.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  return out;
}
```

- [ ] **Step 3: Verificar helpers com asserts**

Run:
```bash
node -e "
import('./src/lib/format.js').then(({ formatBRL, mdInline }) => {
  const assert = (c, m) => { if (!c) { console.error('FAIL: ' + m); process.exit(1); } };
  assert(formatBRL(1854.17) === 'R\$ 1.854,17', 'positivo: ' + formatBRL(1854.17));
  assert(formatBRL(-616) === '− R\$ 616,00', 'negativo: ' + formatBRL(-616));
  assert(formatBRL(0) === 'R\$ 0,00', 'zero');
  assert(mdInline('a **b** c') === 'a <b>b</b> c', 'bold');
  assert(mdInline('<img>') === '&lt;img&gt;', 'escape');
  assert(mdInline('[x](https://y.z/w)') === '<a href=\"https://y.z/w\" target=\"_blank\" rel=\"noopener\">x</a>', 'link');
  console.log('helpers OK');
});"
```
Expected: `helpers OK`.

- [ ] **Step 4: Build (collection vazia é válida)**

Run: `npm run build`
Expected: build OK (nenhum YAML ainda; `getCollection` só será usado nas Tasks 5+).

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts src/lib/format.js
git commit -m "Adiciona schema zod das viagens e helpers de formatacao"
```

---

### Task 3: Primeira viagem em YAML (Nordeste) + prova de validação

**Files:**
- Create: `src/content/viagens/nordeste-set2026.yaml`

**Interfaces:**
- Consumes: schema da Task 2.
- Produces: a entrada `nordeste-set2026` usada como cobaia visual pelas Tasks 5–9. Fonte: `viagens/nordeste-set2026.html`.

- [ ] **Step 1: Criar o YAML completo**

```yaml
titulo: "Férias no Nordeste"
tituloCard: "Nordeste — Maceió & Costa"
emoji: "🌴"
subtitulo: "Maceió · São Miguel dos Milagres · Maragogi · Porto de Galinhas"
rota:
  origem: "GYN"
  origemNome: "Goiânia"
  destino: "MCZ"
  destinoNome: "Maceió"
  retorno: "REC"
  retornoNome: "Recife"
dataInicio: 2026-09-04
dataCard: "4–12 set 2026"
dataDisplay: "4 – 12 de setembro de 2026"
pax: "Marcelo & Sabrina"
status: confirmada
statusLabel: "Voos + carro OK"
cor: "#0e7490"
resumoCard: "Maceió, São Miguel, Maragogi e Porto de Galinhas."
bilhete: 2
heroMeta:
  - { rotulo: "LOC", valor: "WSFDPK · OZHNBN" }
  - { rotulo: "CARRO", valor: "LOCALIZA MCZ→REC" }
footer: "Voos e carro confirmados · Distâncias aproximadas · Atualizar conforme o plano evoluir 🌴"
secoes:
  - tipo: roteiro
    dias:
      - data: "04/09"
        diaSemana: "Sexta"
        local: "Maceió"
        texto: "Chegada em Maceió às **16:30**. Retirada do carro na Localiza (aeroporto) às **17:00** e check-in na hospedagem."
        tags: ["✈️ Voo GYN→MCZ", "🚗 Retira carro", "🏨 Check-in Maceió"]
      - data: "05–07/09"
        diaSemana: "Sáb · Dom · Seg"
        local: "Maceió"
        texto: "Dias livres em Maceió — praias (Pajuçara, Ponta Verde, Gunga), piscinas naturais, orla e gastronomia. *A detalhar.*"
        tags: ["🏨 Maceió"]
      - data: "08/09"
        diaSemana: "Terça"
        local: "→ S. Miguel"
        texto: "Manhã final em Maceió. **Após o almoço**, seguir de carro para **São Miguel dos Milagres** pela Rota Ecológica (~105 km · ~2h)."
        tags: ["🏨 Maceió (manhã)", "🚗 Maceió → S. Miguel"]
      - data: "08–09/09"
        diaSemana: "Ter · Qua"
        local: "S. Miguel dos Milagres"
        texto: "Rota Ecológica dos Milagres: praias desertas, piscinas naturais de barco, sossego. *Sugestão: 1 noite (ajustável).*"
        tags: ["🏨 São Miguel dos Milagres"]
      - data: "09–10/09"
        diaSemana: "Qua · Qui"
        local: "Maragogi"
        texto: "Seguir para **Maragogi** (~55 km · ~1h). Galés de Maragogi (piscinas naturais em alto-mar), praias e vilas. *Sugestão: 1 noite.*"
        tags: ["🚗 S. Miguel → Maragogi", "🏨 Maragogi"]
      - data: "10–12/09"
        diaSemana: "Qui · Sex"
        local: "Porto de Galinhas"
        texto: "Rumo a **Porto de Galinhas**/PE (~130 km · ~2h30). Piscinas naturais, praia dos Carneiros, jangadas. *Sugestão: 2 noites.*"
        tags: ["🚗 Maragogi → Porto de Galinhas", "🏨 Porto de Galinhas"]
      - data: "12/09"
        diaSemana: "Sexta"
        local: "Recife → Casa"
        texto: "**Manhã:** sair de Porto de Galinhas direto para o aeroporto de Recife (~65 km · ~1h20). Devolução do carro às **11:00** e voo às **12:20**."
        tags: ["🚗 → Aeroporto REC", "🚗 Devolve carro", "✈️ Voo REC→GYN"]
  - tipo: voos
    titulo: "Voos · GOL"
    trechos:
      - titulo: "Ida · 04/09 (sexta)"
        localizador: "WSFDPK"
        pernas:
          - { de: "GYN", deHora: "09:50", deNome: "Goiânia", para: "GIG", paraHora: "11:40", paraNome: "Rio", voo: "G3-2061" }
          - { de: "GIG", deHora: "13:55", deNome: "Rio", para: "MCZ", paraHora: "16:30", paraNome: "Maceió", voo: "G3-2078" }
        conexao: "conexão no Rio · 2h15"
      - titulo: "Volta · 12/09 (sexta)"
        localizador: "OZHNBN"
        pernas:
          - { de: "REC", deHora: "12:20", deNome: "Recife", para: "SSA", paraHora: "13:50", paraNome: "Salvador", voo: "G3-1923" }
          - { de: "SSA", deHora: "14:45", deNome: "Salvador", para: "GYN", paraHora: "16:50", paraNome: "Goiânia", voo: "G3-1904" }
        conexao: "conexão em Salvador · 55min"
    notas:
      - "2 passageiros: Marcelo José Amador Filho e Sabrina Oliveira · Tarifa reembolsável (Smiles)."
  - tipo: ficha
    titulo: "Carro · Localiza"
    icone: "🚗"
    cartoes:
      - titulo: "SUV compacto automático"
        subtitulo: "(Grupo GC)"
        entradas:
          - { rotulo: "Retirada", valor: "Aeroporto de Maceió (MCZ) · 04/09 17:00" }
          - { rotulo: "Devolução", valor: "Aeroporto de Recife (REC) · 12/09 11:00" }
          - { rotulo: "Franquia de km", valor: "200 km/dia · 8 diárias" }
          - { rotulo: "Total pago", valor: "R$ 1.636,49" }
        total: "R$ 1.636,49"
    lembretes:
      - "Limite de **200 km/dia** (1.600 km no total). O trajeto Maceió → Recife pela costa consome bastante — acompanhar a quilometragem."
      - "CNH física e cartão de crédito **no nome do motorista** (Marcelo) para retirar o carro."
  - tipo: hospedagem
    checklist:
      - "**Maceió** — 4 noites (04–08/09) · *a reservar*"
      - "**São Miguel dos Milagres** — 1 noite (08–09/09) · *a reservar*"
      - "**Maragogi** — 1 noite (09–10/09) · *a reservar*"
      - "**Porto de Galinhas** — 2 noites (10–12/09) · *a reservar*"
    notas:
      - "A divisão de noites é uma sugestão — dá pra remanejar conforme fecharmos o plano."
  - tipo: gastos
    linhas:
      - { categoria: "Voos", descricao: "Ida GYN→MCZ (WSFDPK, 2 pax) — 63.400 milhas + taxas", status: pago, valor: 96.60 }
      - { categoria: "Voos", descricao: "Volta REC→GYN (OZHNBN, 2 pax) — 115.600 milhas + taxas", status: pago, valor: 121.08 }
      - { categoria: "Carro", descricao: "Aluguel Localiza SUV (8 diárias, one-way)", status: pago, valor: 1636.49 }
    totais:
      - { rotulo: "Total em dinheiro (fora milhas)", valor: 1854.17 }
    notas:
      - "Voos pagos com milhas Smiles (179.000 milhas no total) + taxas em dinheiro acima."
  - tipo: checklist
    titulo: "Próximos passos"
    itens:
      - { texto: "Definir a divisão de noites entre São Miguel, Maragogi e Porto de Galinhas" }
      - { texto: "Reservar as hospedagens" }
      - { texto: "Passeios: piscinas naturais (Pajuçara/Gunga), Galés de Maragogi, jangada em Porto de Galinhas" }
      - { texto: "Restaurantes e transfers de barco" }
      - { texto: "Conferir franquia/deductível da proteção do carro" }
```

- [ ] **Step 2: Build passa com o YAML válido**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Prova negativa — schema pega dado inválido**

Trocar temporariamente `status: confirmada` por `status: confirmado` no YAML.
Run: `npm run build`
Expected: **FALHA** com erro zod citando `status` (invalid enum value). Isto prova que o "teste do projeto" funciona.

- [ ] **Step 4: Reverter a quebra e confirmar**

Reverter para `status: confirmada`. Run: `npm run build` → OK.

- [ ] **Step 5: Paridade com o HTML antigo**

Run: `for c in WSFDPK OZHNBN G3-2061 G3-2078 G3-1923 G3-1904 1636.49; do grep -q "$c" src/content/viagens/nordeste-set2026.yaml && echo "OK $c" || echo "FALTA $c"; done`
Expected: 7× OK.

- [ ] **Step 6: Commit**

```bash
git add src/content/viagens/nordeste-set2026.yaml
git commit -m "Porta viagem do Nordeste para content collection YAML"
```

---

### Task 4: Design tokens, layout Base, gate de auth e robots

**Files:**
- Create: `src/styles/global.css`, `src/layouts/Base.astro`, `public/auth.js`, `public/robots.txt`

**Interfaces:**
- Consumes: fontes @fontsource (Task 1).
- Produces:
  - `Base.astro` props: `{ title: string }`; slot default; TODA página o usa. Inclui `<style id="gate-veil">` no head e `<script>` do auth no fim do body.
  - Custom properties globais: `--papel #fef3c7, --tiquete #fff, --tinta #1c1917, --ambar #f59e0b, --muted #78716c, --muted-2 #a8a29e, --linha #e7e5e4, --ok #15803d, --pend #b45309, --sombra-mesa 0 5px 0 rgba(28,25,23,.12)`; fontes: `--f-display 'Archivo Black'`, `--f-texto 'Inter Variable'`, `--f-mono 'IBM Plex Mono'`, `--f-carimbo 'Special Elite'`.
  - Keyframes globais: `deal`, `stampin`, `fly`, `printout`, `swing`.
  - Classes utilitárias: `.mono`, `.wrap` (container max-width 1080px).

- [ ] **Step 1: Criar src/styles/global.css**

```css
/* ===== Tokens ===== */
:root {
  --papel: #fef3c7; --tiquete: #fff; --tinta: #1c1917;
  --ambar: #f59e0b; --muted: #78716c; --muted-2: #a8a29e;
  --linha: #e7e5e4; --ok: #15803d; --pend: #b45309;
  --sombra-mesa: 0 5px 0 rgba(28, 25, 23, .12);
  --f-display: 'Archivo Black', sans-serif;
  --f-texto: 'Inter Variable', sans-serif;
  --f-mono: 'IBM Plex Mono', monospace;
  --f-carimbo: 'Special Elite', monospace;
}

/* ===== Base ===== */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--papel); color: var(--tinta);
  font-family: var(--f-texto); line-height: 1.55;
  font-size: 16px;
}
a { color: inherit; }
img, svg { max-width: 100%; }
.mono { font-family: var(--f-mono); }
.wrap { max-width: 1080px; margin: 0 auto; padding: 0 20px 48px; }
:focus-visible { outline: 3px solid var(--ambar); outline-offset: 2px; border-radius: 4px; }

h1, h2, h3 { line-height: 1.15; margin: 0; }

footer.site {
  text-align: center; font-family: var(--f-mono); font-size: .72rem;
  color: var(--muted-2); padding: 28px 16px 40px;
}

/* ===== View Transitions (cross-document, sem JS) ===== */
@view-transition { navigation: auto; }

/* ===== Animações ===== */
@keyframes deal {
  from { opacity: 0; transform: translateY(30px) rotate(5deg) scale(.97); }
}
@keyframes stampin {
  0% { opacity: 0; transform: scale(2.4) rotate(-16deg); }
  55% { opacity: 1; transform: scale(.9) rotate(-1deg); }
  100% { transform: scale(1) rotate(-3deg); }
}
@keyframes fly {
  from { offset-distance: 0%; } to { offset-distance: 100%; }
}
@keyframes printout {
  from { clip-path: inset(0 0 100% 0); transform: translateY(-8px); }
  to { clip-path: inset(0 0 -2% 0); }
}
@keyframes swing {
  25% { transform: rotate(2.6deg); } 55% { transform: rotate(-2deg); } 80% { transform: rotate(1deg); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  @view-transition { navigation: none; }
}
```

- [ ] **Step 2: Criar src/layouts/Base.astro**

```astro
---
import '@fontsource/archivo-black';
import '@fontsource-variable/inter';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/700.css';
import '@fontsource/special-elite';
import '../styles/global.css';

interface Props { title: string }
const { title } = Astro.props;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
---
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>{title}</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✈️</text></svg>" />
    {/* Cortina fail-closed: conteúdo invisível (tela e impressão) até auth.js liberar */}
    <style id="gate-veil" is:inline>
      html { visibility: hidden; }
      @media print { body { display: none; } }
    </style>
  </head>
  <body>
    <slot />
    <noscript>
      <div style="visibility:visible;position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#fef3c7;color:#1c1917;font-family:sans-serif;padding:24px;text-align:center">
        Habilite o JavaScript para entrar na área privada.
      </div>
    </noscript>
    <script is:inline src={`${base}/auth.js`}></script>
  </body>
</html>
```

- [ ] **Step 3: Criar public/auth.js** (checkpoint 🛂; mesma senha/chave; fail-closed)

```js
/* =========================================================
   Férias CK-Labs — checkpoint de embarque (cortina visual).
   NÃO é segurança: o conteúdo é servido integralmente; a
   proteção real planejada é Basic Auth no nginx (TATOOINE).
   Senha: alterar PASSWORD abaixo (único lugar permitido).
   ========================================================= */
(function () {
  var PASSWORD = "<senha: ver public/auth.js>";
  var KEY = "ferias_cklabs_auth";

  function unveil() {
    var v = document.getElementById("gate-veil");
    if (v) v.remove();
  }

  var authed = false;
  try { authed = sessionStorage.getItem(KEY) === "ok"; } catch (e) { /* fica fechado */ }
  if (authed) { unveil(); return; }

  var ov = document.createElement("div");
  ov.style.cssText =
    "visibility:visible;position:fixed;top:0;right:0;bottom:0;left:0;z-index:99999;" +
    "display:flex;align-items:center;justify-content:center;padding:20px;" +
    "background:#fef3c7;font-family:'Inter Variable',Inter,sans-serif";
  ov.innerHTML =
    '<form id="ck-form" style="background:#fff;border-radius:14px;box-shadow:0 6px 0 rgba(28,25,23,.12);' +
    'width:min(360px,92vw);overflow:hidden;text-align:center">' +
    '<div style="background:#1c1917;color:#fef3c7;font-family:monospace;font-size:.7rem;' +
    'letter-spacing:.25em;padding:10px">CHECKPOINT DE EMBARQUE</div>' +
    '<div style="padding:26px 24px">' +
    '<div style="font-size:2.2rem" aria-hidden="true">🛂</div>' +
    '<h1 style="margin:8px 0 4px;font-size:1.1rem;color:#1c1917">Férias CK-Labs</h1>' +
    '<p style="color:#78716c;font-size:.85rem;margin:0 0 16px">Área privada. Informe a senha.</p>' +
    '<input id="ck-pass" type="password" name="password" autocomplete="current-password" ' +
    'placeholder="Senha" aria-label="Senha" ' +
    'style="width:100%;padding:12px;border:1.5px solid #d6d3d1;border-radius:10px;font-size:1rem" />' +
    '<div id="ck-err" role="alert" style="color:#b91c1c;font-size:.8rem;min-height:18px;margin:8px 0"></div>' +
    '<button type="submit" style="width:100%;padding:12px;border:0;border-radius:10px;' +
    'background:#f59e0b;color:#1c1917;font-weight:800;font-size:1rem;cursor:pointer">Embarcar</button>' +
    '</div>' +
    '<div style="border-top:2px dashed #e7e5e4;padding:8px;font-family:monospace;' +
    'font-size:.6rem;color:#a8a29e">CK-LABS AIRLINES · ACESSO RESTRITO</div>' +
    "</form>";

  function mount() {
    document.body.appendChild(ov);
    var input = document.getElementById("ck-pass");
    input.focus();
    document.getElementById("ck-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var val = (input.value || "").trim();
      if (val === PASSWORD) {
        try { sessionStorage.setItem(KEY, "ok"); } catch (e2) { /* segue sem persistir */ }
        ov.remove();
        unveil();
      } else {
        document.getElementById("ck-err").textContent = "Senha incorreta.";
        input.select();
      }
    });
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
```

- [ ] **Step 4: Criar public/robots.txt**

```txt
User-agent: *
Disallow: /
```

- [ ] **Step 5: Plugar o layout na index provisória** — editar `src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Férias CK-Labs">
  <main class="wrap"><p>Em reconstrução.</p></main>
</Base>
```

- [ ] **Step 6: Build e inspecionar o dist**

Run: `npm run build && grep -c 'noindex' dist/index.html && grep -c 'gate-veil' dist/index.html && grep -c '/ferias/auth.js' dist/index.html && test -f dist/auth.js && test -f dist/robots.txt && echo DIST_OK`
Expected: três `1` (ou mais) e `DIST_OK`.

- [ ] **Step 7: Testar o gate no dev server**

Run: `npm run dev` (background) e abrir `http://localhost:4321/ferias/`:
1. Página abre com o checkpoint 🛂 visível e o conteúdo invisível atrás.
2. Senha errada → "Senha incorreta.".
3. `<senha: ver public/auth.js>` + Enter → conteúdo aparece.
4. Recarregar → não pede senha de novo (sessionStorage).
Matar o dev server ao final.
Expected: os 4 comportamentos confirmados.

- [ ] **Step 8: Commit**

```bash
git add src/styles/global.css src/layouts/Base.astro public/auth.js public/robots.txt src/pages/index.astro
git commit -m "Adiciona tokens, layout Base com veu fail-closed e gate checkpoint"
```

---

### Task 5: Stamp, Barcode, TicketCard e a home (mural de tíquetes)

**Files:**
- Create: `src/components/Stamp.astro`, `src/components/Barcode.astro`, `src/components/TicketCard.astro`
- Modify: `src/pages/index.astro` (substituir conteúdo provisório)

**Interfaces:**
- Consumes: collection `viagens` (Task 2/3), tokens/keyframes (Task 4).
- Produces:
  - `Stamp` props: `{ status: 'planejando'|'confirmada'|'realizada', label: string }`.
  - `Barcode` props: `{ largura?: number }` (px, default 60).
  - `TicketCard` props: `{ viagem: CollectionEntry<'viagens'>, index: number }` — `<a>` para `${base}/viagens/${viagem.id}.html`, com `view-transition-name: ticket-{viagem.id}` e `--i: {index}` para o stagger.
  - Ordenação do mural (Tasks 10–11 dependem): não-realizadas por `dataInicio` asc, depois realizadas por `dataInicio` asc, com classe `realizada`.

- [ ] **Step 1: Criar src/components/Stamp.astro**

```astro
---
interface Props { status: 'planejando' | 'confirmada' | 'realizada'; label: string }
const { status, label } = Astro.props;
---
<span class:list={['stamp', status]}>{label}</span>
<style>
  .stamp {
    display: inline-block; font-family: var(--f-carimbo);
    font-size: .68rem; line-height: 1.2; padding: 2px 8px;
    border: 2px solid var(--ok); border-radius: 6px; color: var(--ok);
    transform: rotate(-3deg); text-transform: uppercase;
    animation: stampin .38s cubic-bezier(.2, .8, .3, 1) .95s backwards;
  }
  .planejando { color: var(--pend); border-color: var(--pend); border-style: dashed; }
  .realizada { color: var(--muted); border-color: var(--muted); }
</style>
```

- [ ] **Step 2: Criar src/components/Barcode.astro**

```astro
---
interface Props { largura?: number }
const { largura = 60 } = Astro.props;
---
<span class="barcode" style={`width:${largura}px`} aria-hidden="true"></span>
<style>
  .barcode {
    display: inline-block; height: 16px;
    background: repeating-linear-gradient(90deg, var(--tinta) 0 1.5px, transparent 1.5px 4.5px);
  }
</style>
```

- [ ] **Step 3: Criar src/components/TicketCard.astro**

```astro
---
import type { CollectionEntry } from 'astro:content';
import Stamp from './Stamp.astro';
import Barcode from './Barcode.astro';

interface Props { viagem: CollectionEntry<'viagens'>; index: number }
const { viagem, index } = Astro.props;
const d = viagem.data;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const num = String(d.bilhete).padStart(3, '0');
---
<a
  class:list={['ticket', { apagado: d.status === 'realizada' }]}
  href={`${base}/viagens/${viagem.id}.html`}
  style={`--cor:${d.cor};--i:${index};view-transition-name:ticket-${viagem.id}`}
>
  <span class="faixa" aria-hidden="true"></span>
  <span class="corpo">
    <span class="rota mono">
      <b>{d.rota.origem}</b>
      <span class="tracinho" aria-hidden="true"><span class="aviao">✈️</span></span>
      <b>{d.rota.destino}</b>
    </span>
    <span class="nome">{d.emoji} {d.tituloCard}</span>
    <span class="quando mono">{d.dataCard.toUpperCase()}</span>
    <span class="resumo">{d.resumoCard}</span>
    <Stamp status={d.status} label={d.status === 'realizada' ? 'Realizada' : d.statusLabel} />
  </span>
  <span class="rodape" aria-hidden="true">
    <span class="mono num">BILHETE Nº {num}</span>
    <Barcode />
  </span>
</a>
<style>
  .ticket {
    display: flex; flex-direction: column; text-decoration: none;
    background: var(--tiquete); border-radius: 12px; overflow: hidden;
    box-shadow: var(--sombra-mesa); color: var(--tinta);
    animation: deal .55s cubic-bezier(.2, .9, .3, 1.25) calc(var(--i) * 130ms) backwards;
    transition: transform .18s ease, box-shadow .18s ease;
  }
  /* rotação alternada sutil: pares/ímpares */
  .ticket:nth-child(odd) { transform: rotate(-.6deg); }
  .ticket:nth-child(even) { transform: rotate(.5deg); }
  .ticket:hover, .ticket:focus-visible {
    transform: translateY(-5px) rotate(0deg);
    box-shadow: 0 12px 22px rgba(28, 25, 23, .18);
  }
  .apagado { opacity: .55; filter: saturate(.35); }
  .faixa { height: 6px; background: var(--cor); }
  .corpo { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px 10px; }
  .rota { display: flex; align-items: baseline; gap: 10px; font-size: 1.25rem; font-weight: 700; }
  .tracinho { flex: 1; border-bottom: 2px dashed var(--linha); position: relative; }
  .aviao { position: absolute; left: 50%; top: -.7em; transform: translateX(-50%); font-size: .7em; }
  .nome { font-weight: 800; font-size: 1rem; }
  .quando { font-size: .72rem; color: var(--muted); }
  .resumo { font-size: .8rem; color: var(--muted); }
  .corpo > :global(.stamp) { align-self: flex-start; margin-top: 2px; }
  .rodape {
    display: flex; justify-content: space-between; align-items: center;
    border-top: 2px dashed var(--linha); padding: 8px 16px; position: relative;
  }
  .rodape::before, .rodape::after {
    content: ''; position: absolute; top: -9px; width: 18px; height: 18px;
    border-radius: 50%; background: var(--papel);
  }
  .rodape::before { left: -9px; } .rodape::after { right: -9px; }
  .num { font-size: .62rem; color: var(--muted-2); }
</style>
```

Nota: a linha com `mod()` é aspiracional e a regra `:nth-child` logo abaixo a sobrescreve — ao implementar, **usar só as regras `:nth-child(odd/even)`** e remover a linha com `mod()`.

- [ ] **Step 4: Reescrever src/pages/index.astro (mural completo)**

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import TicketCard from '../components/TicketCard.astro';

const todas = await getCollection('viagens');
const porData = (a: any, b: any) => +a.data.dataInicio - +b.data.dataInicio;
const ativas = todas.filter((v) => v.data.status !== 'realizada').sort(porData);
const realizadas = todas.filter((v) => v.data.status === 'realizada').sort(porData);
const mural = [...ativas, ...realizadas];
---
<Base title="Férias CK-Labs">
  <header class="hero">
    <svg class="trilha" viewBox="0 0 400 70" aria-hidden="true">
      <path id="rota-aviao" d="M -10 58 Q 120 -12 200 30 T 410 18" fill="none"
        stroke="var(--ambar)" stroke-width="1.5" stroke-dasharray="1 7" stroke-linecap="round" />
    </svg>
    <span class="aviaozinho" aria-hidden="true">✈️</span>
    <p class="overline mono">CK-LABS AIRLINES · ÁREA PRIVADA</p>
    <h1>NOSSAS<br />VIAGENS</h1>
    <p class="sub">Marcelo &amp; Sabrina · roteiros, voos, hospedagem e gastos</p>
  </header>
  <main class="wrap">
    <div class="mural">
      {mural.map((v, i) => <TicketCard viagem={v} index={i + 1} />)}
    </div>
  </main>
  <footer class="site">ÁREA PRIVADA · CK-LABS · ATUALIZADO CONFORME OS PLANOS EVOLUEM 🌍</footer>
</Base>

<style>
  .hero { position: relative; max-width: 1080px; margin: 0 auto; padding: 56px 20px 28px; overflow: hidden; }
  .trilha { position: absolute; top: 6px; left: 0; width: 100%; opacity: .55; }
  .aviaozinho {
    position: absolute; top: 0; left: 0; font-size: 14px;
    offset-path: path('M -10 58 Q 120 -12 200 30 T 410 18');
    offset-rotate: auto 45deg;
    animation: fly 8s ease-in-out infinite;
  }
  .overline { font-size: .68rem; letter-spacing: .3em; color: #92400e; margin: 0; }
  h1 {
    font-family: var(--f-display);
    font-size: clamp(2.2rem, 7vw, 4rem);
    text-shadow: 3px 3px 0 var(--ambar);
    margin: 10px 0 6px;
  }
  .sub { font-weight: 600; color: var(--muted); margin: 0 0 8px; font-size: clamp(.85rem, 2.5vw, 1rem); }
  .mural { display: grid; grid-template-columns: 1fr; gap: 16px; padding-top: 18px; }
  @media (min-width: 640px) { .mural { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 1024px) { .mural { grid-template-columns: 1fr 1fr 1fr; } }
</style>
```

- [ ] **Step 5: Build + inspeção**

Run: `npm run build && grep -c 'class="ticket' dist/index.html && grep -o 'viagens/nordeste-set2026.html' dist/index.html | head -1`
Expected: `1` tíquete; href com o slug preservado.

- [ ] **Step 6: Conferir no dev server (3 larguras)**

Com `npm run dev`: em 375, 768 e 1280px — mural 1/2/3 colunas, deal-in + carimbo + aviãozinho rodando, hover levanta o tíquete, sem scroll horizontal. Com "reduzir movimento" do SO ativado, nada anima.
Expected: tudo confirmado.

- [ ] **Step 7: Commit**

```bash
git add src/components/Stamp.astro src/components/Barcode.astro src/components/TicketCard.astro src/pages/index.astro
git commit -m "Adiciona mural de tiquetes na home com animacoes CSS"
```

---

### Task 6: BoardingHero e página de viagem (hero + footer)

**Files:**
- Create: `src/components/BoardingHero.astro`, `src/pages/viagens/[slug].astro`

**Interfaces:**
- Consumes: collection (Task 2/3), `Stamp`/`Barcode` (Task 5), tokens (Task 4).
- Produces:
  - `BoardingHero` props: `{ viagem: CollectionEntry<'viagens'> }` — `view-transition-name: ticket-{viagem.id}` (par com o TicketCard).
  - `[slug].astro`: `getStaticPaths` da collection; renderiza `Base` → back-link → `BoardingHero` → `<div class="secoes">` (placeholder vazio nesta task; a Task 7 pluga o dispatcher) → footer da viagem.

- [ ] **Step 1: Criar src/components/BoardingHero.astro**

```astro
---
import type { CollectionEntry } from 'astro:content';
import Stamp from './Stamp.astro';
import Barcode from './Barcode.astro';

interface Props { viagem: CollectionEntry<'viagens'> }
const { viagem } = Astro.props;
const d = viagem.data;
/* Arco exibido no hero: com `retorno` (viagem itinerante, ex. Nordeste) mostra
   destino→retorno (MCZ→REC, como no mockup aprovado); sem retorno, origem→destino. */
const heroDe = d.rota.retorno ? d.rota.destino : d.rota.origem;
const heroDeNome = d.rota.retorno ? d.rota.destinoNome : d.rota.origemNome;
const heroPara = d.rota.retorno ?? d.rota.destino;
const heroParaNome = d.rota.retornoNome ?? d.rota.destinoNome;
const mes = d.dataCard.toUpperCase();
---
<header class="bpass" style={`--cor:${d.cor};view-transition-name:ticket-${viagem.id}`}>
  <div class="faixa mono">
    <span>CK-LABS AIRLINES · CARTÃO DE EMBARQUE</span>
    <span>{mes}</span>
  </div>
  <div class="meio">
    <div class="rota">
      <div class="ponto">
        <div class="cod">{heroDe}</div>
        <div class="cid mono">{heroDeNome.toUpperCase()}</div>
      </div>
      <div class="tracinho" aria-hidden="true"><span class="aviao">✈️</span></div>
      <div class="ponto fim">
        <div class="cod">{heroPara}</div>
        <div class="cid mono">{heroParaNome.toUpperCase()}</div>
      </div>
    </div>
    <h1>{d.emoji} {d.titulo}</h1>
    <p class="subtitulo">{d.subtitulo}</p>
    <dl class="meta mono">
      <div><dt>DATA</dt><dd>{d.dataDisplay}</dd></div>
      <div><dt>PAX</dt><dd>{d.pax}</dd></div>
      {d.heroMeta.map((m) => <div><dt>{m.rotulo}</dt><dd>{m.valor}</dd></div>)}
    </dl>
  </div>
  <div class="rodape">
    <Stamp status={d.status} label={d.status === 'realizada' ? 'Realizada' : d.statusLabel} />
    <Barcode largura={90} />
  </div>
</header>
```

E o `<style>` do componente:

```astro
<style>
  .bpass {
    background: var(--tiquete); border-radius: 14px; overflow: hidden;
    box-shadow: var(--sombra-mesa); margin-top: 14px;
  }
  .faixa {
    background: var(--cor); color: #fff; display: flex; flex-wrap: wrap; gap: 4px 12px;
    justify-content: space-between; padding: 10px 18px;
    font-size: .62rem; letter-spacing: .2em;
  }
  .meio { padding: 18px 20px 14px; }
  .rota { display: flex; align-items: center; gap: 14px; }
  .cod { font-family: var(--f-display); font-size: clamp(1.8rem, 6vw, 2.6rem); }
  .cid { font-size: .62rem; color: var(--muted); }
  .fim { text-align: right; }
  .tracinho { flex: 1; border-bottom: 2px dashed var(--linha); position: relative; }
  .aviao { position: absolute; left: 50%; top: -.8em; transform: translateX(-50%); }
  h1 { font-size: clamp(1.15rem, 4vw, 1.5rem); font-weight: 800; margin-top: 12px; font-family: var(--f-texto); }
  .subtitulo { color: var(--muted); font-size: .85rem; margin: 4px 0 0; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin: 14px 0 0; font-size: .72rem; }
  @media (min-width: 640px) { .meta { display: flex; flex-wrap: wrap; gap: 18px; } }
  .meta dt { display: inline; color: var(--muted-2); font-weight: 700; }
  .meta dd { display: inline; margin: 0; }
  .rodape {
    display: flex; justify-content: space-between; align-items: center;
    border-top: 2px dashed var(--linha); padding: 10px 18px; position: relative;
  }
  .rodape::before, .rodape::after {
    content: ''; position: absolute; top: -9px; width: 18px; height: 18px;
    border-radius: 50%; background: var(--papel);
  }
  .rodape::before { left: -9px; } .rodape::after { right: -9px; }
</style>
```

- [ ] **Step 2: Criar src/pages/viagens/[slug].astro**

```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import BoardingHero from '../../components/BoardingHero.astro';

export async function getStaticPaths() {
  const viagens = await getCollection('viagens');
  return viagens.map((viagem) => ({ params: { slug: viagem.id }, props: { viagem } }));
}
const { viagem } = Astro.props;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
---
<Base title={`${viagem.data.tituloCard} · Férias CK-Labs`}>
  <main class="wrap">
    <a class="volta mono" href={`${base}/`}>← VOLTAR AO MURAL</a>
    <BoardingHero viagem={viagem} />
    <div class="secoes"><!-- Task 7 pluga o dispatcher aqui --></div>
  </main>
  <footer class="site">{viagem.data.footer}</footer>
</Base>

<style>
  .volta {
    display: inline-block; font-size: .7rem; letter-spacing: .12em;
    color: #92400e; text-decoration: none; padding: 22px 0 0; min-height: 44px;
  }
  .volta:hover { text-decoration: underline; }
  .secoes { display: grid; gap: 26px; margin-top: 26px; }
</style>
```

- [ ] **Step 3: Build + URL preservada**

Run: `npm run build && test -f dist/viagens/nordeste-set2026.html && grep -c 'CARTÃO DE EMBARQUE' dist/viagens/nordeste-set2026.html && grep -c 'ticket-nordeste-set2026' dist/index.html dist/viagens/nordeste-set2026.html`
Expected: arquivo existe; hero presente; `view-transition-name` par nos DOIS arquivos (card e hero).

- [ ] **Step 4: Conferir no dev server**

`http://localhost:4321/ferias/viagens/nordeste-set2026.html` (após gate): hero MCZ→REC com faixa teal, meta DATA/PAX/LOC/CARRO, carimbo, back-link volta à home. Em Chrome: clicar no tíquete da home → transição do card para o hero.
Expected: confirmado (transição só onde houver suporte; sem suporte, navegação normal).

- [ ] **Step 5: Commit**

```bash
git add src/components/BoardingHero.astro src/pages/viagens/
git commit -m "Adiciona pagina de viagem com hero de cartao de embarque"
```

---

### Task 7: Dispatcher de seções + Ficha + Checklist (etiquetas)

**Files:**
- Create: `src/components/Secoes.astro`, `src/components/SecaoTitulo.astro`, `src/components/Ficha.astro`, `src/components/Checklist.astro`, `src/components/Notas.astro`
- Modify: `src/pages/viagens/[slug].astro` (plugar `Secoes`)

**Interfaces:**
- Consumes: schema (Task 2), `mdInline` (Task 2).
- Produces:
  - `Secoes` props: `{ secoes: any[], cor: string, tituloCard: string }` — switch por `secao.tipo`; tipos ainda sem componente são ignorados silenciosamente ATÉ a Task 9 (quando todos existem).
  - `SecaoTitulo` props: `{ icone: string, titulo: string }` — h2 padrão de seção (todas as seções usam).
  - `Notas` props: `{ notas?: string[] }` — parágrafos `.nota-media` com `mdInline`.
  - `Ficha` props: `{ secao: SecaoFicha, cor: string }`.
  - `Checklist` props: `{ secao: SecaoChecklist, cor: string }`.

- [ ] **Step 1: Criar src/components/SecaoTitulo.astro**

```astro
---
interface Props { icone: string; titulo: string }
const { icone, titulo } = Astro.props;
---
<h2><span aria-hidden="true">{icone}</span> {titulo}</h2>
<style>
  h2 {
    font-family: var(--f-display); font-size: clamp(.95rem, 3vw, 1.15rem);
    letter-spacing: .04em; text-transform: uppercase; margin-bottom: 12px;
  }
</style>
```

- [ ] **Step 2: Criar src/components/Notas.astro**

```astro
---
import { mdInline } from '../lib/format.js';
interface Props { notas?: string[] }
const { notas = [] } = Astro.props;
---
{notas.map((n) => <p class="nota" set:html={mdInline(n)} />)}
<style>
  .nota { font-size: .78rem; color: var(--muted); margin: 10px 2px 0; }
</style>
```

- [ ] **Step 3: Criar src/components/Ficha.astro**

```astro
---
import { mdInline } from '../lib/format.js';
import SecaoTitulo from './SecaoTitulo.astro';
import Notas from './Notas.astro';
interface Props { secao: any; cor: string }
const { secao, cor } = Astro.props;
---
<section style={`--cor:${cor}`}>
  <SecaoTitulo icone={secao.icone} titulo={secao.titulo} />
  {secao.cartoes.map((c: any) => (
    <article class="cartao">
      {c.titulo && <h3>{c.titulo} {c.subtitulo && <span class="sub">{c.subtitulo}</span>}</h3>}
      <dl>
        {c.entradas.map((e: any) => (
          <div class="kv">
            <dt>{e.rotulo}</dt>
            <dd set:html={mdInline(e.valor)} />
          </div>
        ))}
      </dl>
      {c.total && <p class="total mono">{c.total}</p>}
    </article>
  ))}
  {secao.lembretes && (
    <aside class="lembretes">
      <b>⚠️ Lembretes:</b>
      <ul>{secao.lembretes.map((l: string) => <li set:html={mdInline(l)} />)}</ul>
    </aside>
  )}
  <Notas notas={secao.notas} />
</section>
<style>
  .cartao {
    background: var(--tiquete); border-radius: 12px; box-shadow: var(--sombra-mesa);
    border-left: 4px solid var(--cor); padding: 14px 16px; margin-bottom: 12px;
  }
  h3 { font-size: .95rem; font-weight: 800; margin-bottom: 8px; }
  .sub { font-weight: 600; color: var(--muted); font-size: .78rem; }
  dl { margin: 0; display: grid; gap: 6px; }
  .kv { display: grid; grid-template-columns: minmax(90px, 130px) 1fr; gap: 10px; font-size: .82rem; }
  .kv dt { color: var(--muted); }
  .kv dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
  .total {
    margin: 10px 0 0; text-align: right; font-weight: 700; font-size: 1rem;
    border-top: 2px dashed var(--linha); padding-top: 8px;
  }
  .lembretes {
    background: #fffbeb; border: 1.5px dashed var(--ambar); border-radius: 10px;
    padding: 10px 14px; font-size: .8rem; margin-top: 4px;
  }
  .lembretes ul { margin: 6px 0 0; padding-left: 18px; }
  .lembretes li { margin: 3px 0; }
</style>
```

- [ ] **Step 4: Criar src/components/Checklist.astro** (etiquetas de bagagem)

```astro
---
import { mdInline } from '../lib/format.js';
import SecaoTitulo from './SecaoTitulo.astro';
interface Props { secao: any; cor: string }
const { secao, cor } = Astro.props;
---
<section style={`--cor:${cor}`}>
  <SecaoTitulo icone={secao.icone} titulo={secao.titulo} />
  <ul class="etiquetas">
    {secao.itens.map((item: any, i: number) => (
      <li class="etiqueta">
        <span class="furo" aria-hidden="true"></span>
        <div>
          <div class="texto" set:html={mdInline(item.texto)} />
          {item.detalhe && <div class="detalhe" set:html={mdInline(item.detalhe)} />}
          <div class="num mono">ETIQUETA Nº {String(i + 1).padStart(2, '0')}</div>
        </div>
      </li>
    ))}
  </ul>
</section>
<style>
  .etiquetas { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .etiqueta {
    background: var(--tiquete); border-radius: 8px 14px 14px 8px;
    border-left: 4px solid var(--cor);
    padding: 10px 14px 10px 28px; position: relative;
    box-shadow: var(--sombra-mesa); transform-origin: 14px 50%;
  }
  .etiqueta:nth-child(odd) { transform: rotate(-.5deg); }
  .etiqueta:nth-child(even) { transform: rotate(.4deg); }
  .etiqueta:hover { animation: swing .9s ease-in-out; }
  .furo {
    position: absolute; left: 9px; top: 50%; transform: translateY(-50%);
    width: 9px; height: 9px; border: 2px solid var(--linha); border-radius: 50%;
  }
  .texto { font-size: .85rem; font-weight: 600; }
  .detalhe { font-size: .75rem; color: var(--muted); margin-top: 2px; }
  .num { font-size: .58rem; color: var(--muted-2); margin-top: 4px; }
</style>
```

- [ ] **Step 5: Criar src/components/Secoes.astro**

```astro
---
import Ficha from './Ficha.astro';
import Checklist from './Checklist.astro';
/* Tasks 8–9 adicionam: Roteiro, Voos, Hospedagem, CupomGastos */
interface Props { secoes: any[]; cor: string; tituloCard: string }
const { secoes, cor, tituloCard } = Astro.props;
---
{secoes.map((secao) => {
  switch (secao.tipo) {
    case 'ficha': return <Ficha secao={secao} cor={cor} />;
    case 'checklist': return <Checklist secao={secao} cor={cor} />;
    default: return null; /* tipos plugados nas Tasks 8-9 */
  }
})}
```

- [ ] **Step 6: Plugar em [slug].astro** — substituir `<div class="secoes"><!-- ... --></div>` por:

```astro
    <div class="secoes">
      <Secoes secoes={viagem.data.secoes} cor={viagem.data.cor} tituloCard={viagem.data.tituloCard} />
    </div>
```

E adicionar o import no frontmatter: `import Secoes from '../../components/Secoes.astro';`

- [ ] **Step 7: Build + inspeção**

Run: `npm run build && grep -c 'Carro · Localiza' dist/viagens/nordeste-set2026.html && grep -c 'ETIQUETA Nº 05' dist/viagens/nordeste-set2026.html`
Expected: ficha do carro renderizada; 5ª etiqueta presente (checklist com 5 itens).

- [ ] **Step 8: Conferir no dev server** — página do Nordeste mostra Carro (com lembretes ⚠️ e total) e Próximos passos (etiquetas tortas que balançam no hover). Mobile 375px: kv empilha sem estourar.

- [ ] **Step 9: Commit**

```bash
git add src/components/Secoes.astro src/components/SecaoTitulo.astro src/components/Ficha.astro src/components/Checklist.astro src/components/Notas.astro src/pages/viagens/
git commit -m "Adiciona dispatcher de secoes com ficha e checklist de etiquetas"
```

---

### Task 8: Seções Roteiro e Voos

**Files:**
- Create: `src/components/Roteiro.astro`, `src/components/Voos.astro`
- Modify: `src/components/Secoes.astro` (2 cases novos)

**Interfaces:**
- Consumes: schema `secaoRoteiro`/`secaoVoos` (Task 2), `SecaoTitulo`/`Notas` (Task 7), `mdInline`.
- Produces: cases `'roteiro'` e `'voos'` no dispatcher.

- [ ] **Step 1: Criar src/components/Roteiro.astro**

```astro
---
import { mdInline } from '../lib/format.js';
import SecaoTitulo from './SecaoTitulo.astro';
interface Props { secao: any; cor: string }
const { secao, cor } = Astro.props;
---
<section style={`--cor:${cor}`}>
  <SecaoTitulo icone={secao.icone} titulo={secao.titulo} />
  <ol class="dias">
    {secao.dias.map((dia: any) => (
      <li class="dia">
        <header class="cab">
          <span class="data mono">{dia.data}</span>
          {dia.diaSemana && <span class="semana mono">{dia.diaSemana.toUpperCase()}</span>}
          {dia.local && <span class="onde">{dia.local}</span>}
        </header>
        {dia.texto && <p class="texto" set:html={mdInline(dia.texto)} />}
        {dia.itens && (
          <ul class="itens">
            {dia.itens.map((item: any) => (
              <li class="item">
                <span class="hora mono">{item.hora ?? '—'}</span>
                <div class="corpo">
                  <div class="linha1">
                    <b>{item.titulo}</b>
                    {item.tag && <span class="tag">{item.tag}</span>}
                    {item.status && <span class="tag ok">{item.status}</span>}
                  </div>
                  {item.endereco && (
                    <div class="addr">📍 {item.enderecoUrl
                      ? <a href={item.enderecoUrl} target="_blank" rel="noopener">{item.endereco}</a>
                      : item.endereco}</div>
                  )}
                  {item.meta && <div class="meta" set:html={mdInline(item.meta)} />}
                </div>
              </li>
            ))}
          </ul>
        )}
        {dia.tags && <div class="tags">{dia.tags.map((t: string) => <span class="tag">{t}</span>)}</div>}
      </li>
    ))}
  </ol>
</section>
<style>
  .dias { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .dia {
    background: var(--tiquete); border-radius: 12px; box-shadow: var(--sombra-mesa);
    border-left: 4px solid var(--cor); padding: 12px 16px;
  }
  .cab { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
  .data { font-weight: 700; font-size: .85rem; color: var(--cor); }
  .semana { font-size: .62rem; color: var(--muted-2); }
  .onde { font-weight: 700; font-size: .85rem; }
  .texto { font-size: .84rem; margin: 8px 0 0; }
  .itens { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 10px; }
  .item { display: grid; grid-template-columns: 52px 1fr; gap: 10px; font-size: .82rem; }
  .hora { color: var(--muted); font-size: .74rem; padding-top: 2px; }
  .linha1 { display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }
  .addr { color: var(--muted); font-size: .76rem; margin-top: 2px; overflow-wrap: anywhere; }
  .meta { color: var(--muted-2); font-size: .72rem; margin-top: 2px; }
  .tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
  .tag {
    font-size: .64rem; font-weight: 700; background: var(--papel);
    border-radius: 5px; padding: 2px 7px; white-space: nowrap;
  }
  .tag.ok { background: #dcfce7; color: var(--ok); }
</style>
```

- [ ] **Step 2: Criar src/components/Voos.astro**

```astro
---
import SecaoTitulo from './SecaoTitulo.astro';
import Notas from './Notas.astro';
interface Props { secao: any; cor: string }
const { secao, cor } = Astro.props;
---
<section style={`--cor:${cor}`}>
  <SecaoTitulo icone={secao.icone} titulo={secao.titulo} />
  {secao.trechos && (
    <div class="trechos">
      {secao.trechos.map((t: any) => (
        <article class="trecho">
          <h3>{t.titulo}</h3>
          {t.localizador && <p class="loc mono">LOCALIZADOR <span class="badge">{t.localizador}</span></p>}
          {t.pernas.map((p: any, i: number) => (
            <>
              {i > 0 && t.conexao && <p class="conexao mono">{t.conexao}</p>}
              <div class="perna">
                <div><div class="ap mono">{p.de} {p.deHora}</div><div class="nome">{p.deNome}</div></div>
                <div class="seta" aria-hidden="true">→</div>
                <div class="fim"><div class="ap mono">{p.para} {p.paraHora}</div><div class="nome">{p.paraNome}{p.voo && ` · ${p.voo}`}</div></div>
              </div>
            </>
          ))}
        </article>
      ))}
    </div>
  )}
  <Notas notas={secao.notas} />
</section>
<style>
  .trechos { display: grid; gap: 12px; }
  @media (min-width: 768px) { .trechos { grid-template-columns: 1fr 1fr; } }
  .trecho {
    background: var(--tiquete); border-radius: 12px; box-shadow: var(--sombra-mesa);
    border-left: 4px solid var(--cor); padding: 14px 16px;
  }
  h3 { font-size: .9rem; font-weight: 800; margin-bottom: 6px; }
  .loc { font-size: .64rem; color: var(--muted); margin: 0 0 10px; }
  .badge {
    background: var(--tinta); color: var(--papel); border-radius: 5px;
    padding: 2px 7px; letter-spacing: .12em;
  }
  .perna { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
  .ap { font-weight: 700; font-size: .95rem; }
  .nome { font-size: .7rem; color: var(--muted); }
  .fim { margin-left: auto; text-align: right; }
  .seta { color: var(--ambar); }
  .conexao {
    font-size: .64rem; color: var(--muted-2); text-align: center;
    border-top: 1.5px dashed var(--linha); border-bottom: 1.5px dashed var(--linha);
    padding: 3px 0; margin: 4px 0;
  }
</style>
```

- [ ] **Step 3: Adicionar os cases no Secoes.astro**

```astro
import Roteiro from './Roteiro.astro';
import Voos from './Voos.astro';
```
```astro
    case 'roteiro': return <Roteiro secao={secao} cor={cor} />;
    case 'voos': return <Voos secao={secao} cor={cor} />;
```

- [ ] **Step 4: Build + inspeção**

Run: `npm run build && grep -c 'WSFDPK' dist/viagens/nordeste-set2026.html && grep -c 'conexão no Rio · 2h15' dist/viagens/nordeste-set2026.html && grep -c 'Rota Ecológica' dist/viagens/nordeste-set2026.html`
Expected: localizador, conexão e roteiro presentes (≥1 cada).

- [ ] **Step 5: Conferir no dev server** — Nordeste completo menos hospedagem/gastos; voos lado a lado no desktop, empilhados no mobile; 375px sem scroll horizontal.

- [ ] **Step 6: Commit**

```bash
git add src/components/Roteiro.astro src/components/Voos.astro src/components/Secoes.astro
git commit -m "Adiciona secoes de roteiro e voos"
```

---

### Task 9: Seções Hospedagem e CupomGastos (com animação de impressão e mobile)

**Files:**
- Create: `src/components/Hospedagem.astro`, `src/components/CupomGastos.astro`
- Modify: `src/components/Secoes.astro` (2 cases finais)

**Interfaces:**
- Consumes: schema (Task 2), `formatBRL`/`mdInline` (Task 2), `Ficha`-like cartões, `SecaoTitulo`/`Notas`.
- Produces: cases `'hospedagem'` e `'gastos'`; dispatcher COMPLETO (o `default: return null` vira inalcançável para dados válidos).

- [ ] **Step 1: Criar src/components/Hospedagem.astro**

```astro
---
import { mdInline } from '../lib/format.js';
import SecaoTitulo from './SecaoTitulo.astro';
import Notas from './Notas.astro';
interface Props { secao: any; cor: string }
const { secao, cor } = Astro.props;
---
<section style={`--cor:${cor}`}>
  <SecaoTitulo icone={secao.icone} titulo={secao.titulo} />
  {secao.cartoes && secao.cartoes.map((c: any) => (
    <article class="cartao">
      {c.titulo && <h3>{c.titulo} {c.subtitulo && <span class="sub">{c.subtitulo}</span>}</h3>}
      <dl>
        {c.entradas.map((e: any) => (
          <div class="kv"><dt>{e.rotulo}</dt><dd set:html={mdInline(e.valor)} /></div>
        ))}
      </dl>
    </article>
  ))}
  {secao.checklist && (
    <ul class="areservar">
      {secao.checklist.map((item: string) => (
        <li><span class="box" aria-hidden="true"></span><span set:html={mdInline(item)} /></li>
      ))}
    </ul>
  )}
  {secao.destaque && <aside class="destaque" set:html={mdInline(secao.destaque)} />}
  <Notas notas={secao.notas} />
</section>
<style>
  .cartao {
    background: var(--tiquete); border-radius: 12px; box-shadow: var(--sombra-mesa);
    border-left: 4px solid var(--cor); padding: 14px 16px; margin-bottom: 12px;
  }
  h3 { font-size: .95rem; font-weight: 800; margin-bottom: 8px; }
  .sub { font-weight: 600; color: var(--muted); font-size: .78rem; }
  dl { margin: 0; display: grid; gap: 6px; }
  .kv { display: grid; grid-template-columns: minmax(90px, 130px) 1fr; gap: 10px; font-size: .82rem; }
  .kv dt { color: var(--muted); }
  .kv dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
  .areservar { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .areservar li {
    background: var(--tiquete); border-radius: 10px; box-shadow: var(--sombra-mesa);
    padding: 10px 14px; font-size: .84rem; display: flex; gap: 10px; align-items: baseline;
  }
  .box {
    flex: none; width: 12px; height: 12px; border: 2px solid var(--muted-2);
    border-radius: 4px; transform: translateY(1px);
  }
  .destaque {
    background: #ecfdf5; border: 1.5px dashed var(--ok); border-radius: 10px;
    padding: 10px 14px; font-size: .8rem; margin-top: 12px;
  }
</style>
```

- [ ] **Step 2: Criar src/components/CupomGastos.astro**

```astro
---
import { formatBRL, mdInline } from '../lib/format.js';
import SecaoTitulo from './SecaoTitulo.astro';
import Notas from './Notas.astro';
interface Props { secao: any; cor: string; tituloCard: string }
const { secao, cor, tituloCard } = Astro.props;
const rotuloStatus: Record<string, string> = { pago: 'Pago', recebido: 'Recebido', pendente: 'Pendente' };
---
<section style={`--cor:${cor}`}>
  <SecaoTitulo icone={secao.icone} titulo={secao.titulo} />
  <div class="cupom mono">
    <p class="cab">CUPOM DE GASTOS ★ {tituloCard.toUpperCase()}</p>
    <table>
      <thead>
        <tr><th scope="col">Categoria</th><th scope="col">Descrição</th><th scope="col">Status</th><th scope="col" class="val">Valor</th></tr>
      </thead>
      <tbody>
        {secao.linhas.length === 0 && (
          <tr><td colspan="4" class="vazio">Nenhum gasto lançado ainda.</td></tr>
        )}
        {secao.linhas.map((l: any) => (
          <tr>
            <td class="cat">{l.categoria}</td>
            <td class="desc" set:html={mdInline(l.descricao)} />
            <td class="st">{l.status ? <span class:list={['pill', l.status]}>{rotuloStatus[l.status]}</span> : ''}</td>
            <td class:list={['val', { credito: l.valor < 0 }]}>{formatBRL(l.valor)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        {(secao.totais.length ? secao.totais : [{ rotulo: 'Total', valor: 0 }]).map((t: any) => (
          <tr><td colspan="3" class="trot">{t.rotulo}</td><td class:list={['val', 'tval', { credito: t.valor < 0 }]}>{formatBRL(t.valor)}</td></tr>
        ))}
      </tfoot>
    </table>
    <Notas notas={secao.notas} />
    <p class="fecho">· · · OBRIGADO E BOA VIAGEM · · ·</p>
  </div>
</section>
<style>
  .cupom {
    background: var(--tiquete); box-shadow: var(--sombra-mesa); border-radius: 4px;
    padding: 16px 18px; font-size: .78rem;
  }
  @supports (animation-timeline: view()) {
    .cupom {
      animation: printout 1.2s steps(14, end) both;
      animation-timeline: view();
      animation-range: entry 0% entry 60%;
    }
  }
  .cab { text-align: center; font-weight: 700; letter-spacing: .14em; font-size: .72rem; margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    text-align: left; font-size: .62rem; color: var(--muted-2); font-weight: 700;
    border-bottom: 1.5px dashed var(--linha); padding: 4px 6px;
  }
  tbody td, tfoot td { padding: 6px; vertical-align: top; border-bottom: 1px dotted #f0efec; }
  .cat { white-space: nowrap; color: var(--muted); }
  .desc { font-family: var(--f-texto); font-size: .8rem; }
  .val { text-align: right; white-space: nowrap; font-weight: 700; }
  .val.credito { color: var(--ok); }
  .vazio { text-align: center; color: var(--muted-2); padding: 16px; }
  .pill { font-size: .6rem; border: 1.5px solid var(--ok); color: var(--ok); border-radius: 5px; padding: 1px 6px; }
  .pill.recebido { border-color: var(--cor); color: var(--cor); }
  .pill.pendente { border-color: var(--pend); color: var(--pend); }
  tfoot .trot { font-weight: 700; border-top: 1.5px dashed var(--linha); }
  tfoot .tval { border-top: 1.5px dashed var(--linha); font-size: .85rem; }
  .fecho { text-align: center; color: var(--muted-2); font-size: .66rem; margin: 12px 0 0; }

  /* Mobile: células empilham — sem scroll horizontal */
  @media (max-width: 639px) {
    thead { position: absolute; clip-path: inset(50%); height: 1px; width: 1px; overflow: hidden; }
    tbody tr { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; padding: 8px 0; border-bottom: 1px dotted #f0efec; }
    tbody td { border: 0; padding: 0; }
    .cat { font-size: .6rem; text-transform: uppercase; grid-column: 1; }
    .st { grid-column: 2; grid-row: 1; text-align: right; }
    .desc { grid-column: 1 / -1; }
    .val { grid-column: 1 / -1; text-align: right; }
    tfoot tr { display: flex; justify-content: space-between; gap: 10px; padding: 6px 0; }
    tfoot td { border: 0; padding: 0; }
  }
</style>
```

- [ ] **Step 3: Cases finais no Secoes.astro**

```astro
import Hospedagem from './Hospedagem.astro';
import CupomGastos from './CupomGastos.astro';
```
```astro
    case 'hospedagem': return <Hospedagem secao={secao} cor={cor} />;
    case 'gastos': return <CupomGastos secao={secao} cor={cor} tituloCard={tituloCard} />;
```

- [ ] **Step 4: Build + inspeção**

Run: `npm run build && grep -c 'CUPOM DE GASTOS ★ NORDESTE' dist/viagens/nordeste-set2026.html && grep -c 'R\$ 1.854,17' dist/viagens/nordeste-set2026.html && grep -c 'a reservar' dist/viagens/nordeste-set2026.html`
Expected: cupom com título da viagem, total formatado e checklist de hospedagem (≥1 cada).

- [ ] **Step 5: Conferir no dev server** — página do Nordeste 100%: hospedagem (4 itens a reservar), cupom imprime ao rolar até ele (Chrome), tabela vira lista empilhada em 375px sem scroll horizontal.

- [ ] **Step 6: Commit**

```bash
git add src/components/Hospedagem.astro src/components/CupomGastos.astro src/components/Secoes.astro
git commit -m "Adiciona secoes de hospedagem e cupom de gastos"
```

---

### Task 10: Port das viagens de show + Nova York (4 YAMLs)

**Files:**
- Create: `src/content/viagens/saopaulo-out2026.yaml`, `src/content/viagens/saopaulo-nov2026.yaml`, `src/content/viagens/brasilia-fev2027.yaml`, `src/content/viagens/newyork-2027.yaml`

**Interfaces:**
- Consumes: schema (Task 2). Fontes: `viagens/saopaulo-out2026.html`, `viagens/saopaulo-nov2026.html`, `viagens/brasilia-fev2027.html`, `viagens/newyork-2027.html` — transcrever TODO o conteúdo, seção por seção, na MESMA ordem do HTML.
- Produces: 4 entradas novas na collection (mural passa a ter 5 tíquetes).

- [ ] **Step 1: Criar saopaulo-out2026.yaml (exemplo completo — seguir este padrão nos demais)**

```yaml
titulo: "São Paulo — Iron Maiden"
tituloCard: "São Paulo — Iron Maiden"
emoji: "🤘"
subtitulo: "Run for Your Lives World Tour 2026"
rota:
  origem: "GYN"
  origemNome: "Goiânia"
  destino: "CGH"
  destinoNome: "São Paulo"
dataInicio: 2026-10-26
dataCard: "27 out 2026"
dataDisplay: "Terça, 27 de outubro de 2026 · 19:10"
pax: "Marcelo & Leandro"
status: confirmada
statusLabel: "Ingressos OK"
cor: "#7f1d1d"
resumoCard: "Run for Your Lives Tour, Allianz Parque. Setor 103, fileira E."
bilhete: 3
heroMeta:
  - { rotulo: "PEDIDO", valor: "1740356209" }
  - { rotulo: "LUGAR", valor: "PORTÃO A · SETOR 103 · FILEIRA E" }
footer: "Ingressos garantidos · voos e hospedagem a fechar 🤘"
secoes:
  - tipo: ficha
    titulo: "O show"
    icone: "🎸"
    cartoes:
      - titulo: "Iron Maiden · Allianz Parque (Nubank Parque)"
        entradas:
          - { rotulo: "Data", valor: "Terça, 27 de outubro de 2026 (show extra)" }
          - { rotulo: "Abertura (Alter Bridge)", valor: "19:10" }
          - { rotulo: "Iron Maiden", valor: "20:50" }
          - { rotulo: "Local", valor: "R. Palestra Itália, 200 — Água Branca, SP" }
          - { rotulo: "Ingressos", valor: "2× meia entrada — Cadeira Nível 1 Lateral" }
          - { rotulo: "Lugares", valor: "Portão A · Setor 103 · Fileira E · Assentos 9 e 10" }
          - { rotulo: "Pedido", valor: "1740356209 · Ticketdirect (PDF)" }
    notas:
      - "🎟️ Ingressos garantidos. Baixar os PDFs (Ticketdirect) antes da viagem."
  - tipo: roteiro
    dias:
      - data: "Seg 26/10"
        diaSemana: "Chegada"
        local: "São Paulo"
        texto: "Chegar a São Paulo e check-in. *Voos a definir.*"
        tags: ["✈️ Voo a definir", "🏨 Check-in"]
      - data: "Ter 27/10"
        diaSemana: "Dia do show"
        local: "Allianz Parque"
        texto: "Dia livre + **show do Iron Maiden** à noite (abertura 19:10, banda 20:50). Portão A — Setor 103, fileira E, assentos 9 e 10."
        tags: ["🤘 Iron Maiden"]
      - data: "Qua 28/10"
        diaSemana: "Volta"
        local: "Volta"
        texto: "Check-out e retorno. *Voo a definir.*"
        tags: ["✈️ Voo a definir"]
  - tipo: voos
    notas:
      - "A definir — alvo: ida 26/10 e volta 28/10. Inserir quando comprar."
  - tipo: hospedagem
    checklist:
      - "**São Paulo** — perto do Allianz Parque / Água Branca · 26–28/10 (2 noites) · *a reservar*"
  - tipo: gastos
    linhas:
      - { categoria: "Show", descricao: "Ingressos Iron Maiden (2× meia, Cadeira N1 — Setor 103)", status: pago, valor: 870.00 }
    totais:
      - { rotulo: "Total", valor: 870.00 }
    notas:
      - "Por ingresso: R$ 345,00 (meia) + taxa ADM R$ 21,00 + taxa de serviço R$ 69,00 = R$ 435,00 · entrega grátis · pedido 1740356209."
  - tipo: checklist
    titulo: "Próximos passos"
    itens:
      - { texto: "Baixar os ingressos em PDF (Ticketdirect) — pedido 1740356209" }
      - { texto: "Comprar voos Goiânia ⇄ São Paulo (26 e 28/10)" }
      - { texto: "Reservar hospedagem perto do Allianz (26–28/10)" }
```

- [ ] **Step 2: Criar saopaulo-nov2026.yaml** — mesma mecânica, com esta identidade e transcrevendo TODAS as seções de `viagens/saopaulo-nov2026.html` (O show → `ficha`; roteiro 5 dias; voos a definir → `voos` só com nota; hospedagem com cartão "Maestro Ibirapuera" (9 entradas) + `destaque` do cancelamento; gastos com 3 linhas incluindo o reembolso NEGATIVO `valor: -616.00` com `status: recebido` e 3 totais `4636.70 / -1394.35 / 3242.35`; próximos passos 5 itens):

```yaml
titulo: "São Paulo — Eddie Vedder"
tituloCard: "São Paulo — Eddie Vedder"
emoji: "🎸"
subtitulo: "Best of Blues and Rock 2026"
rota: { origem: "GYN", origemNome: "Goiânia", destino: "CGH", destinoNome: "São Paulo" }
dataInicio: 2026-11-19
dataCard: "19–23 nov 2026"
dataDisplay: "19 – 23 de novembro de 2026"
pax: "Marcelo, Sabrina, Edilson, Geovanka, Thaynara & Israel"
status: confirmada
statusLabel: "Ingressos + Airbnb OK"
cor: "#92400e"
resumoCard: "Best of Blues and Rock (show 22/11). Grupo de 6; Airbnb no Ibirapuera OK, voos a comprar."
bilhete: 4
heroMeta:
  - { rotulo: "SHOW", valor: "DOM 22/11 · ARENA (GRAMADO)" }
  - { rotulo: "AIRBNB", valor: "HMAWZKDF5S" }
footer: "Ingressos e Airbnb garantidos · voos a comprar 🎸"
```

- [ ] **Step 3: Criar brasilia-fev2027.yaml** — identidade abaixo + seções de `viagens/brasilia-fev2027.html` (O show → `ficha` com 6 entradas + nota EVENTIM.Pass; roteiro 3 dias; Transporte → `ficha` `icone: "🚗"` com um cartão sem título e SEM entradas?, NÃO — o HTML só tem uma nota: usar `ficha` com `cartoes: [{ entradas: [] }]` é inválido visualmente; em vez disso usar `voos`-like não cabe. Solução: `ficha` exige cartões; usar `checklist`? Também não. **Usar `hospedagem`?** Não. → Modelar como `ficha` com um cartão de 1 entrada: `{ rotulo: "Situação", valor: "Goiânia → Brasília ~210 km (~2h30 de carro). Avaliar ir de carro vs. voo curto. A definir." }`; hospedagem checklist 1 item; gastos 1 linha `934.64` + total + nota; próximos passos 3 itens):

```yaml
titulo: "Brasília — Rush"
tituloCard: "Brasília — Rush"
emoji: "🥁"
subtitulo: "Fifty Something — South American Tour"
rota: { origem: "GYN", origemNome: "Goiânia", destino: "BSB", destinoNome: "Brasília" }
dataInicio: 2027-02-03
dataCard: "4 fev 2027"
dataDisplay: "Quinta, 4 de fevereiro de 2027 · 20:00"
pax: "Marcelo & Sabrina"
status: confirmada
statusLabel: "Ingressos OK"
cor: "#3730a3"
resumoCard: "Fifty Something Tour, Arena BRB Mané Garrincha. Cadeira Inferior."
bilhete: 5
heroMeta:
  - { rotulo: "PEDIDO", valor: "1741554575 · EVENTIM.PASS" }
footer: "Ingressos garantidos · transporte e hospedagem a fechar 🥁"
```

- [ ] **Step 4: Criar newyork-2027.yaml** — identidade abaixo + seções de `viagens/newyork-2027.html` (Visão geral → `ficha` `icone: "🧭"` com 4 entradas + nota do Notion "Viagens e Milhas"; Roteiro → o HTML tem só nota "A montar..." → usar `ficha`? NÃO: usar `roteiro` exige dias. **Modelar como `ficha` com cartão de 1 entrada** `{ rotulo: "Roteiro", valor: "A montar. Definir datas, bairros, atrações e eventual bate-volta (ex.: Washington, Boston)." }` com `titulo: "Roteiro"`, `icone: "🗺️"`; Atrações → `checklist` `titulo: "Atrações e passeios"` `icone: "🎡"` com 4 itens usando `texto` (negrito) + `detalhe`; Voos → `voos` com nota; Hospedagem → checklist 1 item; Gastos → `linhas: []`, `totais: [{ rotulo: "Total", valor: 0 }]`; Próximos passos 4 itens):

```yaml
titulo: "Nova York"
tituloCard: "Nova York"
emoji: "🗽"
subtitulo: "A grande viagem de 2027"
rota: { origem: "GYN", origemNome: "Goiânia", destino: "JFK", destinoNome: "Nova York" }
dataInicio: 2027-03-01
dataCard: "mar/abr/mai 2027"
dataDisplay: "março, abril ou maio de 2027 (a definir)"
pax: "Marcelo & Sabrina · econômica"
status: planejando
statusLabel: "Planejando"
cor: "#1d4ed8"
resumoCard: "2 passageiros, econômica. Data a definir."
bilhete: 6
heroMeta:
  - { rotulo: "DURAÇÃO", valor: "~14 DIAS" }
footer: "Página em construção · a grande viagem 🗽"
```

- [ ] **Step 5: Build + paridade**

Run: `npm run build`
Expected: OK (schema valida os 4 novos).

Run:
```bash
grep -q 1740356209 src/content/viagens/saopaulo-out2026.yaml && \
grep -q 870 src/content/viagens/saopaulo-out2026.yaml && \
grep -q HMAWZKDF5S src/content/viagens/saopaulo-nov2026.yaml && \
grep -q 78264953 src/content/viagens/saopaulo-nov2026.yaml && \
grep -q -- -616.00 src/content/viagens/saopaulo-nov2026.yaml && \
grep -q 3242.35 src/content/viagens/saopaulo-nov2026.yaml && \
grep -q 1741554575 src/content/viagens/brasilia-fev2027.yaml && \
grep -q 934.64 src/content/viagens/brasilia-fev2027.yaml && \
grep -q "Woodbury" src/content/viagens/newyork-2027.yaml && \
echo PARIDADE_OK
```
Expected: `PARIDADE_OK`.

- [ ] **Step 6: Conferir no dev server** — mural com 5 tíquetes na ordem: Nordeste (set) → Iron Maiden (out) → Eddie Vedder (nov) → Rush (fev) → NY (planejando, carimbo tracejado). Página do Eddie Vedder: reembolso em verde no cupom; NY: cupom "Nenhum gasto lançado ainda".

- [ ] **Step 7: Commit**

```bash
git add src/content/viagens/
git commit -m "Porta viagens de shows e Nova York para YAML"
```

---

### Task 11: Port de São Paulo jul/2026 (a viagem realizada, a mais densa)

**Files:**
- Create: `src/content/viagens/saopaulo-jul2026.yaml`

**Interfaces:**
- Consumes: schema (Task 2). Fonte: `viagens/saopaulo-jul2026.html` (310 linhas) — transcrição integral.
- Produces: 6ª entrada; mural completo com a realizada apagada no fim.

- [ ] **Step 1: Criar saopaulo-jul2026.yaml** — identidade:

```yaml
titulo: "São Paulo"
tituloCard: "São Paulo"
emoji: "🏙️"
subtitulo: "Capital paulista"
rota: { origem: "GYN", origemNome: "Goiânia", destino: "CGH", destinoNome: "São Paulo" }
dataInicio: 2026-07-21
dataCard: "21–24 jul 2026"
dataDisplay: "21 – 24 de julho de 2026"
pax: "Marcelo, Sabrina & Thaynara (Maple Bear)"
status: realizada
statusLabel: "Finalizada"
cor: "#334155"
resumoCard: "Realizada com a Thaynara (Maple Bear). Total R$ 4.876,46 · a receber R$ 81,25 da Thaynara (⅓ do Airbnb)."
bilhete: 1
heroMeta:
  - { rotulo: "LOC", valor: "MEFCBQ" }
  - { rotulo: "CARRO", valor: "MOVIDA CGH · MV4HN1LPU6VBR" }
footer: "Viagem finalizada · gastos conciliados com o extrato em 02/08/2026 🏙️"
```

Seções, na ordem do HTML:
1. `roteiro` — 4 dias (21 a 24/07), TODOS com `itens[]` detalhados (hora, titulo, tag com emoji, status quando houver ["confirmada"/"realizado"], endereco/enderecoUrl dos links de maps, meta). Ex. do primeiro item (seguir o padrão para os ~17 itens):

```yaml
  - tipo: roteiro
    dias:
      - data: "21/07"
        diaSemana: "Terça"
        local: "Chegada"
        itens:
          - hora: "10:20"
            titulo: "Voo Goiânia → São Paulo"
            tag: "✈️ Voo"
            endereco: "GYN (Santa Genoveva) → CGH (Congonhas) · chega 11:55"
            meta: "GOL · G3-1433 · localizador MEFCBQ · sem bagagem despachada"
```

2. `voos` `titulo: "Voos · GOL"` — 2 trechos de 1 perna cada (ida G3-1433 GYN 10:20 → CGH 11:55; volta G3-1438 CGH 20:40 → GYN 22:25), ambos `localizador: "MEFCBQ"`, nota dos passageiros/tarifa LIGHT.
3. `ficha` `titulo: "Carro · Movida"` `icone: "🚗"` — cartão "SUV compacto automático" `subtitulo: "(Grupo H · Fiat Pulse, Renault Kardian ou similar)"`, 6 entradas (Código, Status, Retirada, Devolução, Diárias, Total pago), `total: "R$ 730,72"`, 3 lembretes.
4. `hospedagem` — 2 cartões (Flat Consolação Airbnb com 8 entradas incl. Wi-Fi; Meliá Tatuapé com 6 entradas), `destaque` do rateio ÷3.
5. `gastos` — **23 linhas** transcritas 1:1 (categorias: Carro ×3, Hospedagem ×2, Alimentação ×7, Mercado ×3, Voo ×1, Coworking ×2, Estacionamento ×4, Transporte ×1; todas `status: pago`), `totais`: `[{ rotulo: "Total da viagem", valor: 4876.46 }, { rotulo: "A receber — Thaynara (⅓ do Airbnb da 1ª noite)", valor: -81.25 }, { rotulo: "Custo final previsto", valor: 4795.21 }]`, e as **4 notas** (Maple Bear/assento extra; rateio; cauções; conciliação com o projeto de finanças trip `sp-jul2026`).
6. `checklist` `titulo: "Pendências pós-viagem"` — 3 itens.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Paridade dos códigos e valores críticos**

Run:
```bash
for c in MEFCBQ MV4HN1LPU6VBR HM5W2ANRZR 6155366952 G3-1433 G3-1438 4876.46 -81.25 4795.21 730.72 sp-jul2026; do
  grep -q -- "$c" src/content/viagens/saopaulo-jul2026.yaml && echo "OK $c" || echo "FALTA $c"
done
```
Expected: 11× OK. Conferir também a contagem de linhas de gasto: `grep -c 'categoria:' src/content/viagens/saopaulo-jul2026.yaml` → `23`.

- [ ] **Step 4: Conferir no dev server** — mural: 6 tíquetes, SP jul no FIM, apagado, carimbo "Realizada". Página: roteiro com itens de hora, cupom com 23 linhas + 3 totais (a receber em verde), pendências.

- [ ] **Step 5: Commit**

```bash
git add src/content/viagens/saopaulo-jul2026.yaml
git commit -m "Porta Sao Paulo jul/2026 completa com conciliacao para YAML"
```

---

### Task 12: Sweep de responsividade e acessibilidade (critério do spec §7)

**Files:**
- Modify: qualquer componente/página que falhar o sweep (ajustes pontuais de CSS).

**Interfaces:**
- Consumes: as 7 páginas prontas (Tasks 5–11).
- Produces: aceite formal — zero scroll horizontal em 375/768/1280 nas 7 páginas.

- [ ] **Step 1: Build + preview**

Run: `npm run build && npm run preview` (background; serve em `http://localhost:4321/ferias/`).

- [ ] **Step 2: Matriz de verificação (se MCP de browser disponível — chrome-devtools/playwright — usar; senão, DevTools manual)**

Para CADA página (`/ferias/` + 6 de `/ferias/viagens/*.html`) em CADA largura (375, 768, 1280): após autenticar no gate, avaliar
`document.documentElement.scrollWidth <= document.documentElement.clientWidth` → deve ser `true`.
Checar também: mural 1/2/3 colunas; cupom empilhado em 375; meta do hero em 2 colunas no mobile; nada cortado.
Expected: 21/21 checks `true`. Anotar falhas.

- [ ] **Step 3: Toque e navegação por teclado**

Na home (375px): alvos de toque dos tíquetes ≥ 44px de altura (são cards grandes — OK por construção); back-link com `min-height: 44px` (já no CSS); Tab percorre tíquetes com foco visível (outline âmbar).
Expected: confirmado.

- [ ] **Step 4: Contraste (AA)**

Verificar pares principais: tinta/papel (13.9:1 ✓), tinta/tiquete (15.5:1 ✓), muted `#78716c`/tiquete (4.7:1 ✓), botão do gate `#1c1917` sobre `#f59e0b` (≈8.4:1 ✓). `muted-2 #a8a29e` é usado só em texto decorativo (números de bilhete, fechos) — aceito.
Expected: nenhum texto informativo abaixo de 4.5:1.

- [ ] **Step 5: Corrigir o que falhar** — aplicar ajustes mínimos de CSS no componente culpado (ex.: `overflow-wrap: anywhere` em célula que estoura; reduzir fonte de `.cod` em 320px). Rebuildar e repetir o check da página corrigida.

- [ ] **Step 6: Commit (se houve ajustes)**

```bash
git add -A src/
git commit -m "Ajusta responsividade e acessibilidade no sweep de aceite"
```

---

### Task 13: Remover o site antigo + reescrever docs + workflow de deploy

**Files:**
- Delete: `index.html` (raiz), `viagens/*.html` (6), `assets/styles.css`, `assets/auth.js`
- Modify: `.github/workflows/pages.yml`, `CLAUDE.md`, `AGENTS.md`, `README.md`

**Interfaces:**
- Consumes: site novo completo (Tasks 1–12).
- Produces: repo sem duplicação velho/novo; deploy buildando Astro; docs refletindo o novo contrato.

- [ ] **Step 1: Remover o site antigo**

```bash
git rm index.html viagens/saopaulo-jul2026.html viagens/nordeste-set2026.html viagens/saopaulo-out2026.html viagens/saopaulo-nov2026.html viagens/brasilia-fev2027.html viagens/newyork-2027.html assets/styles.css assets/auth.js
rmdir assets 2>/dev/null; rmdir viagens 2>/dev/null; true
```

- [ ] **Step 2: Build sanity**

Run: `npm run build && test -f dist/index.html && test -f dist/viagens/nordeste-set2026.html && echo BUILD_OK`
Expected: `BUILD_OK` (o site novo não dependia dos arquivos antigos).

- [ ] **Step 3: Reescrever .github/workflows/pages.yml**

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Instala dependencias
        run: npm ci

      - name: Build do site (Astro)
        run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Reescrever CLAUDE.md**

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

Site estático pessoal de planejamento de viagens (Marcelo & Sabrina), construído com **Astro** e publicado no GitHub Pages (`https://marcelo-cklabs.github.io/ferias/`). Todo o conteúdo é em pt-BR. O dono usa o site somente para leitura; todas as edições são feitas via Claude Code — otimize para edições corretas de primeira.

Design "cartão de embarque": home é um mural de tíquetes, cada viagem é um cartão de embarque com carimbos, cupom de gastos e etiquetas de bagagem. Animações são CSS puro e respeitam `prefers-reduced-motion`. **Responsividade é requisito**: qualquer mudança precisa funcionar em 375px, 768px e 1280px sem scroll horizontal.

## Comandos

- `npm run dev` — dev server em `http://localhost:4321/ferias/` (note o base path)
- `npm run build` — build + validação dos dados (zod); DEVE passar antes de qualquer commit
- `npm run preview` — serve o `dist/` como em produção

## Arquitetura — o contrato central

**Uma viagem = um arquivo YAML** em `src/content/viagens/<slug>.yaml` (slug: destino + mês/ano, ex. `saopaulo-out2026`). O tíquete da home E a página `viagens/<slug>.html` são GERADOS desse arquivo — não existe mais duplicação de status/datas/cores entre home e página. **Nunca edite HTML de viagem à mão; ele não existe no repo.**

- Schema dos dados: `src/content.config.ts` (zod). Dado inválido = build falha — esse é o teste do projeto.
- Seções da página vêm de `secoes[]` no YAML (tipos: `ficha`, `roteiro`, `voos`, `hospedagem`, `gastos`, `checklist`), renderizadas por `src/components/Secoes.astro`.
- Valores monetários em `gastos` são números (negativo = crédito/reembolso, exibido em verde); a formatação BRL é do componente (`src/lib/format.js`).
- Strings de conteúdo aceitam markdown inline restrito: `**negrito**`, `*itálico*`, `[texto](url)`.
- Tokens de design (cores/fontes/sombras): `src/styles/global.css`. Cor de cada viagem: campo `cor` do YAML.
- Layout comum (head, favicon, noindex, gate de auth): `src/layouts/Base.astro` — toda página passa por ele.

## Checklist de viagem nova

1. Criar `src/content/viagens/<slug>.yaml` copiando a estrutura de um existente (identidade + `secoes[]`).
2. Escolher `cor` nova (hex) e o próximo número de `bilhete`.
3. `npm run build` — se passar, card na home, página, gate e navegação vêm de graça.

## Deploy

Push na `main` → GitHub Actions (`.github/workflows/pages.yml`) roda `npm ci && npm run build` e publica `dist/` no Pages. Config do Astro: `base: '/ferias'`, `build.format: 'file'` (URLs `viagens/<slug>.html`). Links internos SEMPRE via `import.meta.env.BASE_URL`.

## Segurança — leia antes de mexer no auth

`public/auth.js` é uma **cortina visual, não segurança**: o conteúdo é servido integralmente independente do gate, e a senha está hardcoded nesse arquivo (único lugar permitido). O véu fail-closed (`#gate-veil` no `Base.astro`) esconde o conteúdo até autenticar, inclusive na impressão. A proteção real planejada é Basic Auth no nginx (servidor "TATOOINE"). Não trate dados como protegidos pelo gate, não "reforce" a proteção no client-side, e não exponha a senha em novos lugares. O site tem `noindex` e `robots.txt` com `Disallow: /`.

## Histórico

Relatórios de análise/revisão em `ai-docs/`. Specs e planos de features em `docs/superpowers/`.
```

- [ ] **Step 5: Reescrever AGENTS.md** — mesmo conteúdo do CLAUDE.md novo, trocando apenas a primeira linha do cabeçalho por: `This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.`

- [ ] **Step 6: Atualizar README.md**

```markdown
# ferias

Site de planejamento de viagens (Marcelo & Sabrina) — Astro, design "cartão de embarque", publicado no GitHub Pages.

- `npm run dev` — desenvolver (http://localhost:4321/ferias/)
- `npm run build` — buildar + validar dados
- Conteúdo: 1 YAML por viagem em `src/content/viagens/`

Guia completo de edição: `CLAUDE.md`.
```

- [ ] **Step 7: Verificação final da task**

Run: `npm run build && git status --short`
Expected: build OK; deleções + 4 arquivos modificados, nada inesperado.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Remove site antigo, atualiza deploy para build Astro e reescreve docs"
```

---

### Task 14: Verificação final (spec §13) + PR

**Files:**
- Nenhum novo (correções pontuais se a verificação reprovar algo).

**Interfaces:**
- Consumes: tudo.
- Produces: branch publicado + PR para `main` com a lista de divergências de conteúdo.

- [ ] **Step 1: Checklist do spec §13, na ordem**

1. `npm run build` limpo.
2. Greps de paridade das Tasks 3, 10 e 11 novamente (6/6 viagens) — todos OK.
3. `npm run preview` + matriz 375/768/1280 nas 7 páginas (mesma mecânica da Task 12) — zero scroll horizontal.
4. Gate: senha correta; incorreta; com espaço no fim (deve aceitar por causa do trim); Ctrl+P na tela de senha → páginas em branco; navegar home→viagem→home sem re-pedir senha.
5. Animações: deal-in/carimbo/aviãozinho na home 1× por load; cupom imprime ao rolar; com `prefers-reduced-motion`, nada anima.
6. Links: todos os hrefs do `dist/` começam com `/ferias/` ou são externos — `grep -roh 'href="[^"]*"' dist/ | sort -u` e inspecionar; links de maps abrem em aba nova.
Expected: tudo verde; corrigir e re-rodar o item que falhar.

- [ ] **Step 2: Push do branch**

```bash
git push -u origin claude/redesign-astro
```

- [ ] **Step 3: Abrir o PR** (CONFIRMAR com o usuário antes se a sessão permitir; corpo já pronto):

```bash
gh pr create --base main --head claude/redesign-astro \
  --title "Redesign: Astro + cartao de embarque" \
  --body "$(cat <<'EOF'
## O que muda

Reconstrução completa do site conforme spec aprovado (`docs/superpowers/specs/2026-08-07-redesign-astro-cartao-embarque-design.md`):

- **Astro 5** estático, zero JS client-side (exceto o gate), base `/ferias`, URLs `viagens/<slug>.html` preservadas
- **1 YAML por viagem** (`src/content/viagens/`) gera tíquete da home + página — fim da duplicação apontada na revisão de 04/07
- Design "cartão de embarque": mural de tíquetes, hero-bilhete, cupom de gastos, etiquetas de bagagem, animações CSS com `prefers-reduced-motion`
- Responsivo (375/768/1280, zero scroll horizontal — verificado nas 7 páginas)
- Gate re-tematizado 🛂 e endurecido: véu fail-closed (tela e impressão), try/catch no storage, trim, autocomplete, `noindex` + robots.txt
- Deploy: workflow passa a rodar `npm ci && npm run build` (Node 22)
- CLAUDE.md/AGENTS.md/README reescritos para o novo contrato de edição

## Divergências de conteúdo pré-existentes (portadas como estão — decidir depois)

- Brasília: hospedagem diz "1 a 2 noites", roteiro fixa 2 noites (03–05/02) — achado 12 da revisão
- Eddie Vedder: local "a confirmar (Parque Ibirapuera?)" e horário do show pendentes
- Senha do gate mantida por decisão de escopo; a revisão a considera comprometida (trocar = 1 linha em `public/auth.js`)

## Como conferir

`npm install && npm run dev` → http://localhost:4321/ferias/ (senha do gate de sempre)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Reportar** — URL do PR + resumo do checklist final para o usuário. O deploy NÃO muda até o merge.

---

## Self-Review (executado na escrita do plano)

- **Spec coverage:** §2 decisões → Tasks 4–9 (visual/animações), 5 (mural), 12 (responsividade); §4 arquitetura → Tasks 1, 2, 6; §5 dados → Tasks 2, 3, 10, 11; §6 design system → Tasks 4–9; §7 responsividade → CSS por componente + Task 12; §8 animações → Tasks 4, 5, 9 (+ View Transitions Task 6); §9 auth → Task 4; §10 deploy → Task 13; §11 docs → Task 13; §12 migração/paridade → Tasks 3, 10, 11; §13 verificação → Task 14; §14 riscos → corpo do PR (Task 14). Sem lacunas.
- **Placeholder scan:** nenhum TBD/TODO; os YAMLs das Tasks 10–11 têm identidade completa no plano + fonte exata (HTML no repo até a Task 13) + regras de mapeamento + greps de aceite com valores reais.
- **Type consistency:** nomes de campos do schema (Task 2) conferidos contra todos os usos nos componentes (`viagem.data.*`, `secao.*`, `formatBRL`, `mdInline`, props `{secao, cor}` e `{secoes, cor, tituloCard}`); `view-transition-name: ticket-{id}` idêntico na Task 5 e na Task 6; tokens CSS da Task 4 usados nas Tasks 5–9 com os mesmos nomes.
