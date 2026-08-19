# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository. Este arquivo é espelho de CLAUDE.md — mudou um, mude o outro.

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
- Campos de texto livre (`texto`, `meta`, `notas`, `descricao`, `valor` de entradas, `destaque`, `detalhe`, itens de checklist) aceitam markdown inline restrito: `**negrito**`, `*itálico*`, `[texto](url)`.
- Tokens de design (cores/fontes/sombras): `src/styles/global.css`. Cor de cada viagem: campo `cor` do YAML.
- Layout comum (head, favicon, noindex, gate de auth): `src/layouts/Base.astro` — toda página passa por ele.
- O véu do gate funciona por herança de visibility: NUNCA use `visibility: visible` em componente (vaza conteúdo pré-auth). Os ids `ck-pass`, `ck-form`, `ck-err` e `gate-veil` são reservados do `auth.js`.
- YAML de viagem NUNCA pode ter as chaves `$schema:` ou `slug:` (o schema strict derruba o build). Validação de editor: comentário `# yaml-language-server` no topo (ver YAMLs existentes).
- URLs com parênteses em campos de link: escrever `(` `)` como `%28` `%29` (o markdown inline trunca no primeiro parêntese).
- Animações de entrada novas devem seguir o padrão do gate: `animation-play-state: paused` + regra `:global(html.embarcado) ... { running }` (a classe `embarcado` é adicionada pelo `auth.js` no desbloqueio).

## Painel de milhas — contrato

A página `milhas.html` é gerada de `src/content/milhas/painel.yaml` (collection `milhas`, entrada única `painel`). **Esse YAML é escrito todos os dias pela tarefa agendada do claude.ai** (briefing de milhas) via conector GitHub — commits `milhas: briefing AAAA-MM-DD` na main. Não brigar com ela: edição manual nesse arquivo será sobrescrita na próxima execução; o dado canônico vem da página Notion "✈️ Viagens e Milhas".

- **Schema e prompt são acoplados:** mudou o schema da collection `milhas` (`src/content.config.ts`), atualize `docs/prompt-tarefa-agendada-milhas.md` no MESMO commit — e o dono precisa recolar o prompt na tarefa do claude.ai.
- `painel.yaml` NÃO leva comentário `# yaml-language-server` (arquivo escrito por máquina — exceção deliberada à regra dos YAMLs de viagem).
- Conteúdo estático da página (Manual de voo, member card, tier do clube) é hardcoded em `src/pages/milhas.astro` e `src/components/milhas/` — editar lá, não no YAML.
- O cartão da home vem de `src/components/milhas/MilhasCard.astro` ("CARTÃO Nº 001", numeração própria — não usa `bilhete` das viagens).

## Checklist de viagem nova

1. Criar `src/content/viagens/<slug>.yaml` copiando a estrutura de um existente (identidade + `secoes[]`).
2. Escolher `cor` nova (hex) e o próximo número de `bilhete`.
3. `npm run build` — se passar, card na home, página, gate e navegação vêm de graça.

## Deploy

Push na `main` → GitHub Actions (`.github/workflows/pages.yml`) roda `npm ci && npm run build` e publica `dist/` no Pages. Config do Astro: `base: '/ferias'`, `build.format: 'file'` (URLs `viagens/<slug>.html`). Links internos SEMPRE via `import.meta.env.BASE_URL`.

## Segurança — leia antes de mexer no auth

`public/auth.js` é uma **cortina visual, não segurança**: o conteúdo é servido integralmente independente do gate, e a senha está hardcoded nesse arquivo (único lugar permitido). O véu fail-closed (`#gate-veil` no `Base.astro`) esconde o conteúdo até autenticar, inclusive na impressão. A proteção real planejada é Basic Auth no nginx (servidor "TATOOINE"). Não trate dados como protegidos pelo gate, não "reforce" a proteção no client-side, e não exponha a senha em novos lugares. O site tem `noindex` em toda página (mecanismo real); o `robots.txt` sai em `/ferias/robots.txt` e é inerte no GitHub Pages (crawlers leem só a raiz do origin).

## Histórico

Relatórios de análise/revisão em `ai-docs/`. Specs e planos de features em `docs/superpowers/`.
