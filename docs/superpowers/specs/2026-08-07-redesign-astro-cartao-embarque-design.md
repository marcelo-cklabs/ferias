# Redesign do site de viagens — Astro + "Cartão de Embarque"

> **Data:** 07/08/2026 · **Status:** aprovado pelo dono (brainstorming com mockups no visual companion)
> **Branch:** `claude/redesign-astro` · **Deploy:** GitHub Pages (`https://marcelo-cklabs.github.io/ferias/`)

## 1. Contexto e objetivo

O site atual é HTML/CSS/JS puro, sem build — restrição que **deixa de existir por decisão do dono** nesta reconstrução. Objetivo: um "stunning website" estático com framework moderno, mantendo 100% do conteúdo das 6 viagens e o modelo de proteção atual (cortina de senha client-side).

Motivação técnica além do visual: o relatório `ai-docs/revisao-2026-07-04.md` apontou como principal fonte de erros a **duplicação de dados por design** (status/datas/título/cores de cada viagem em 2+ lugares, achados 14–15). A reconstrução elimina isso na raiz com dados estruturados e páginas geradas.

## 2. Decisões de produto (aprovadas no brainstorming)

| Decisão | Escolha |
|---|---|
| Framework | **Astro** (site estático, zero JS por padrão) |
| Direção visual | **"Cartão de embarque"** — vibrante e lúdico: tíquetes, carimbos, código de barras |
| Home | **Mural de tíquetes** — grade de cartões de embarque, um por viagem |
| Animações | Sim — CSS puro, sutis, com `prefers-reduced-motion` (seção 8) |
| Responsividade | **Requisito imprescindível** — celular, tablet e desktop (seção 7) |
| Tema | Claro apenas (modo escuro fica como evolução futura) |
| Fotos | Não — a identidade é gráfica (tíquetes/carimbos), sem fotografia |
| Conteúdo | Port 1:1 das 6 viagens, sem alterações editoriais |
| Auth | Mesma mecânica e senha; cortina re-tematizada e endurecida (seção 9) |

## 3. Escopo

**Entra:** projeto Astro completo no lugar do site atual; 6 viagens portadas; design system novo; animações; auth re-tematizado; workflow de deploy atualizado; CLAUDE.md/AGENTS.md/README reescritos; `.gitignore` de projeto Node.

**Fica fora (anotado como evolução):** modo escuro; fotos de destinos; "painel de partidas" como visão alternativa da home; Basic Auth no nginx do TATOOINE (proteção real — decisão pendente do dono, fora deste repo); troca da senha do gate; correções editoriais de conteúdo (contradições pré-existentes são portadas como estão e listadas no PR como observação, não corrigidas silenciosamente).

## 4. Arquitetura técnica

```
astro.config.mjs        site: 'https://marcelo-cklabs.github.io', base: '/ferias',
                        build.format: 'file'  ← preserva URLs viagens/<slug>.html
package.json            astro + @fontsource (fontes self-hosted); sem framework de UI
src/
  content.config.ts     schema zod das collections (validação no build)
  content/viagens/      1 arquivo YAML por viagem (fonte única de verdade)
    saopaulo-jul2026.yaml, nordeste-set2026.yaml, saopaulo-out2026.yaml,
    saopaulo-nov2026.yaml, brasilia-fev2027.yaml, newyork-2027.yaml
  layouts/Base.astro    head comum: charset, viewport, title, favicon ✈️ (SVG inline),
                        noindex, fontes, estilo global, gate de auth SEMPRE incluído
  styles/global.css     tokens (cores, fontes, sombras) + resets + utilitários
  components/           TicketCard, BoardingHero, Roteiro, Voos, Ficha, Hospedagem,
                        CupomGastos, Checklist (etiquetas), Stamp, Barcode
  pages/index.astro     home (mural) — gerada das collections
  pages/viagens/[slug].astro  página de viagem — gerada da MESMA entrada
public/
  auth.js               gate re-tematizado (checkpoint 🛂)
```

- **Slugs e URLs preservados**: os 6 slugs atuais não mudam; `build.format: 'file'` gera `viagens/<slug>.html` idêntico às URLs de hoje. Bookmarks continuam válidos.
- **Base path**: todo link/asset interno respeita `import.meta.env.BASE_URL` (site em `/ferias/`). Assets passam pelo pipeline do Astro (hash + base automáticos).
- **Zero JS no site final**, exceto o `auth.js` (gate). Nenhum framework de UI client-side; animações são CSS puro (seção 8).
- **Arquivos antigos removidos no branch**: `index.html`, `viagens/*.html`, `assets/` (substituídos pela estrutura acima). `ai-docs/` permanece intacto.

## 5. Modelo de dados (content collections)

Uma viagem = um YAML validado por zod (collection `viagens`, tipo `data`). Dado inválido/faltante = **build falha** (este é o teste do projeto).

**Identidade** (gera o tíquete da home E o hero da página — fim da duplicação):

```yaml
titulo: "Férias no Nordeste"          # h1 da página
tituloCard: "Nordeste — Maceió & Costa" # nome no tíquete
emoji: "🌴"
subtitulo: "Maceió · São Miguel dos Milagres · Maragogi · Porto de Galinhas"
rota: { origem: "GYN", origemNome: "Goiânia", destino: "MCZ", destinoNome: "Maceió",
        retorno: "REC", retornoNome: "Recife" }   # retorno opcional (one-way de carro etc.)
dataInicio: 2026-09-04                # ordenação do mural (aproximada quando indefinida)
dataCard: "4–12 set 2026"             # texto curto do tíquete
dataDisplay: "4 – 12 de setembro de 2026"  # texto longo do hero
pax: "Marcelo & Sabrina"
status: confirmada                    # planejando | confirmada | realizada
statusLabel: "Voos + carro OK"        # texto do carimbo
cor: "#0e7490"                        # acento único da viagem (faixa, borda, carimbo)
resumoCard: "Maceió, São Miguel, Maragogi e Porto de Galinhas."
bilhete: 2                            # nº do tíquete ("BILHETE Nº 002")
heroMeta:                             # linha impressa do cartão de embarque
  - { rotulo: "LOC", valor: "WSFDPK · OZHNBN" }
  - { rotulo: "CARRO", valor: "LOCALIZA MCZ→REC" }
footer: "Voos e carro confirmados · Distâncias aproximadas · Atualizar conforme o plano evoluir 🌴"
```

**Seções** (`secoes[]`, array ordenado — a ordem no YAML é a ordem na página; união discriminada por `tipo`):

| `tipo` | Cobre hoje | Campos |
|---|---|---|
| `ficha` | "O show", "Visão geral", "Carro", "Transporte" | `titulo`, `icone`, `cartoes[]: {titulo?, subtitulo?, entradas[]: {rotulo, valor}, total?}`, `lembretes[]?` (lista do bloco ⚠️), `notas[]?` |
| `roteiro` | "Roteiro dia a dia" | `dias[]: {data, diaSemana, local, texto?, itens[]?: {hora, titulo, tag?, status?, endereco?, enderecoUrl?, meta?}, tags[]?}` |
| `voos` | "Voos · GOL" e "Voos: a definir" | `trechos[]?: {titulo, localizador, pernas[]: {de, deHora, deNome, para, paraHora, paraNome, voo}, conexao?}`, `notas[]?` |
| `hospedagem` | fichas de reserva E checklists "a reservar" | `cartoes[]?` (mesmo formato da ficha), `checklist[]?`, `notas[]?`, `destaque?` (bloco ✅/🤝) |
| `gastos` | tabela de gastos | `linhas[]: {categoria, descricao, status?: pago\|recebido\|pendente, valor}` (número; negativo permitido), `totais[]: {rotulo, valor}` (linhas do rodapé), `notas[]?` (markdown inline p/ negrito) |
| `checklist` | "Próximos passos", "Pendências pós-viagem", "Atrações e passeios" | `titulo`, `icone`, `itens[]: {texto, detalhe?}` |

Regras: todo campo de seção é opcional exceto os marcados; strings de valor aceitam um subconjunto de markdown inline (negrito e links), convertido em build por helper próprio — nunca HTML arbitrário vindo dos dados; `gastos.linhas` vazio renderiza o estado "Nenhum gasto lançado ainda" com total R$ 0,00; valores monetários são `number` em reais e a formatação BRL (R$ 1.234,56, sinal −) é do componente.

**Cores por viagem** (portadas do `--accent-a` atual): SP jul `#334155` · Nordeste `#0e7490` · Iron Maiden `#7f1d1d` · Eddie Vedder `#92400e` · Rush `#3730a3` · NY `#1d4ed8`.

## 6. Design system

**Tokens** (custom properties em `global.css`):
- Papel `#fef3c7` (fundo) · Tíquete `#fff` · Tinta `#1c1917` · Âmbar `#f59e0b` (marca) · neutros stone (`#78716c`, `#a8a29e`, `#e7e5e4`) · sucesso `#15803d` · pendente `#b45309`
- Sombra "de mesa": `0 5px 0 rgba(28,25,23,.12)` (deslocada, sem blur — estética de papel)
- Fontes self-hosted via @fontsource: **Archivo Black** (títulos/códigos de aeroporto), **Inter** (texto), **IBM Plex Mono** (tudo "impresso": horários, códigos, valores, labels), **Special Elite** (carimbos)

**Componentes** (todos server-rendered, sem JS):
- `TicketCard` — tíquete da home: faixa superior na cor da viagem, rota `GYN ✈ MCZ` com linha pontilhada, título+emoji, data, carimbo de status, divisória perfurada (dentes + tracejado), nº do bilhete e código de barras. Rotação sutil alternada (±0.7°). Viagem `realizada`: vai para o fim do mural, dessaturada, carimbo "REALIZADA".
- `BoardingHero` — hero da página: faixa "CK-LABS AIRLINES · CARTÃO DE EMBARQUE" na cor da viagem, códigos de rota grandes, paradas, título, linha de meta impressa (DATA/PAX/+heroMeta), rodapé perfurado com carimbo + barcode. Back-link "← VOLTAR AO MURAL".
- `Stamp` — carimbo Special Elite rotacionado: `confirmada` verde sólido, `planejando` âmbar tracejado, `realizada` cinza.
- `Roteiro` — cartões de dia com borda esquerda na cor da viagem; itens com coluna de hora em mono; tags de categoria coloridas (✈️ voo, 🚗 carro, 🍝 comida, 🏨 hospedagem, 💻 trabalho, 🤘 show — vocabulário atual mantido).
- `Voos` — trechos com badge de LOCALIZADOR, pernas `GYN 09:50 → GIG 11:40`, linha de conexão; sem dados → nota "a definir".
- `Ficha` — cartão branco com kv rows (rótulo cinza / valor forte), total destacado, bloco de lembretes ⚠️ e notas.
- `CupomGastos` — `<table>` semântica com skin de cupom fiscal: mono, cabeçalho "CUPOM DE GASTOS ★ <VIAGEM>", divisórias tracejadas, valores alinhados à direita, linhas de total no rodapé, notas como letra miúda, fecho "· · · BOA VIAGEM · · ·". Valores negativos em verde (créditos/reembolsos).
- `Checklist` — etiquetas de bagagem: furo à esquerda, rotação alternada sutil, numeração "ETIQUETA Nº NN".
- Home: hero "CK-LABS AIRLINES · ÁREA PRIVADA" + título Archivo Black com sombra âmbar deslocada + arco pontilhado com aviãozinho.

**Acessibilidade**: HTML semântico (uma `<table>` real nos gastos, `<ul>` nas checklists, landmarks, h1–h2 hierárquicos); contraste AA nos pares texto/fundo (inclusive o botão do gate, que hoje falha); foco visível; emojis decorativos com `aria-hidden`.

## 7. Responsividade (requisito imprescindível)

Mobile-first; o dono usa celular, tablet e desktop.

- **Breakpoints**: base ≤ 640px (1 coluna), `sm` ≥ 640px (mural em 2 colunas), `lg` ≥ 1024px (mural em 3 colunas; gastos + pendências lado a lado na página de viagem).
- **Tipografia fluida** com `clamp()` (ex.: título da home ~2.2rem → 4rem; códigos de rota do hero ~1.8rem → 2.6rem).
- **Cupom de gastos no celular**: sem scroll horizontal — abaixo de 640px as células da tabela empilham via CSS (categoria+descrição em cima, status+valor embaixo), mantendo o `<table>` semântico. Desktop mostra a tabela completa.
- **Hero**: linha de meta vira grid de 2 colunas no mobile; paradas quebram em linhas.
- **Toque**: alvos ≥ 44px; nenhuma informação exclusiva de hover (hover é bônus estético).
- **Critério de aceite**: zero scroll horizontal em 375px, 768px e 1280px nas 7 páginas (home + 6 viagens), verificado no preview antes do PR.

## 8. Animações (todas CSS, aprovadas em demo)

1. **Deal-in do mural**: tíquetes entram como cartas dadas na mesa (translateY+rotate+opacity, stagger ~130ms, cubic-bezier com leve overshoot), só no load da home.
2. **Carimbo**: bate depois dos tíquetes (scale 2.4→1 com rotação, ~380ms).
3. **Aviãozinho**: percorre o arco pontilhado do hero da home em loop lento (`offset-path`; decorativo, `aria-hidden`).
4. **Hover no tíquete**: levanta da mesa (translateY −5px, sombra real, endireita a rotação).
5. **Cupom "imprime"**: revelação top→down com `steps(14)` (dot-matrix) ao entrar na viewport — CSS scroll-driven animations (`animation-timeline: view()`); browsers sem suporte mostram o cupom estático (sem JS de fallback).
6. **Etiquetas balançam** no hover (rotação em torno do furo).
7. **View Transitions** (Astro): o tíquete clicado "voa" e vira o BoardingHero (`transition:name` por viagem); progressive enhancement — browsers sem suporte navegam normal.
8. **`prefers-reduced-motion: reduce` desliga todas** (media query global).

## 9. Auth & privacidade

O modelo **não muda**: cortina visual client-side, mesma senha, mesma chave de `sessionStorage`, incluída em toda página via `Base.astro` (impossível esquecer o include — resolve o risco "página nova fora do gate"). Continua **não sendo segurança**: o conteúdo é servido integralmente; a proteção real segue sendo o plano de Basic Auth no TATOOINE (fora de escopo). Não expor a senha em lugares novos além do próprio `public/auth.js`.

Melhorias na cortina (do relatório, achados 3, 5, 6, 9, 11 + quick wins):
- **Fail-closed**: `<style>` inline no `<head>` esconde o conteúdo (`visibility:hidden`) até o gate liberar; auth.js remove o estilo após autenticar. JS quebrado/bloqueado → página fica oculta, não exposta. Inclui regra `@media print` — Ctrl+P na tela de senha imprime vazio.
- `try/catch` em `getItem`/`setItem` (storage bloqueado não abre o site sem senha nem trava o login com senha correta).
- `<form>` + `autocomplete="current-password"` (gerenciador de senhas funciona) + `trim()` na comparação + foco/Enter robustos.
- Visual: "CHECKPOINT DE EMBARQUE 🛂" no estilo do design system, contraste AA no botão.
- `<meta name="robots" content="noindex, nofollow">` em toda página (via layout) + `robots.txt` com `Disallow: /`.

## 10. Deploy (GitHub Pages)

`.github/workflows/pages.yml` atualizado: `actions/checkout` → `actions/setup-node` (Node 22, cache npm) → `npm ci` → `npm run build` → `upload-pages-artifact` (`dist/`) → `deploy-pages`. Gatilhos e concurrency como hoje (push na `main` + manual). O deploy só muda quando o PR for mergeado — a `main` continua publicando o site antigo até lá.

## 11. Docs e manutenção

- **CLAUDE.md reescrito**: novo contrato de edição — "uma viagem = um arquivo YAML; card e página são gerados; **nunca** editar HTML de viagem à mão". Checklist de viagem nova vira: criar 1 YAML (auth e card vêm de graça). Comandos (`npm run dev/build/preview`), pegadinha do base path, doutrina do auth (cortina, não segurança) mantida, requisito de responsividade.
- **AGENTS.md** espelha o CLAUDE.md (mesmo conteúdo, cabeçalho Codex).
- **README.md**: stack, comandos e link do site.
- **`.gitignore`**: `node_modules/`, `dist/`, `.astro/`, `.superpowers/` (substitui o template Node genérico atual).

## 12. Migração de conteúdo

Port 1:1 dos 6 HTML para YAML — todo dado preservado: localizadores, códigos de reserva, endereços+links de mapa, Wi-Fi, valores e as notas de conciliação com o projeto de finanças (SP jul: nota do relatório Open Finance→Supabase, trip `sp-jul2026`). Emojis e textos de footer mantidos por viagem. Contradições pré-existentes (ex.: Brasília "1 a 2 noites" vs roteiro de 2 noites; local do Eddie Vedder "a confirmar") são portadas como estão e **listadas na descrição do PR** para o dono decidir depois.

Paridade verificável: para cada viagem, os códigos críticos (localizadores, nº de pedido/confirmação, valores de total) devem aparecer no YAML — conferência por grep contra o HTML antigo antes do PR.

## 13. Verificação (sem framework de testes)

1. `npm run build` limpo — o schema zod é o teste dos dados.
2. Grep de paridade dos códigos críticos (seção 12) — 6/6 viagens.
3. Preview nas 7 páginas em 375/768/1280px — zero scroll horizontal, layout íntegro.
4. Gate: senha correta, incorreta, Enter, senha com espaço colado, Ctrl+P na tela de senha (imprime vazio), navegação entre páginas mantém sessão na aba.
5. Animações: rodam 1× no load da home; com `prefers-reduced-motion` ativado, nada se move.
6. Links: cards → páginas, back-links, links externos de mapa — todos com base `/ferias/` correto no build final.

## 14. Riscos e observações

- **Exposição pública inalterada**: GitHub Pages publica o site mesmo com repo privado (já é assim hoje). Este projeto não piora nem resolve — a mitigação real (Basic Auth/TATOOINE ou Pages privado via Enterprise) segue pendente com o dono, registrada no relatório de revisão.
- **Senha atual mantida** por decisão de escopo; o relatório a considera comprometida — trocar é 1 linha em `public/auth.js` quando o dono quiser.
- **View Transitions e scroll-driven animations** são progressive enhancement — nenhuma funcionalidade depende delas.
- **Build passa a existir**: editar conteúdo continua simples (YAML), mas visualizar exige `npm run dev` (documentado no CLAUDE.md novo).
