# Painel de Milhas — página + pipeline diário da tarefa agendada

> **Data:** 19/08/2026 · **Status:** aprovado pelo dono (brainstorming + wireframe validado)
> **Wireframe de referência:** https://claude.ai/code/artifact/2504da91-b07f-4015-94a7-bcc28cc4675e
> **Deploy:** o mesmo do site — push na `main` → GitHub Actions → Pages

## 1. Contexto e objetivo

O dono acompanha um portfólio de milhas/pontos com fonte da verdade na página Notion **"✈️ Viagens e Milhas"** e recebe um briefing matinal de oportunidades via **tarefa agendada do claude.ai** (Notion + Gmail label "Milhas & Pontos" + varredura web, com pisos de bônus e meta ativa). Objetivo: uma nova página `milhas.html` no site ferias que mostre **carteira de pontos, meta ativa, radar diário de oportunidades e manual de decisão** — atualizada todo dia **sem ação manual**, aproveitando a tarefa agendada que já existe.

Princípio central: **o Notion continua sendo a fonte da verdade; o site é um espelho diário dela.** A tarefa já lê o Notion toda manhã — ela ganha um passo final de publicação no repo.

## 2. Decisões de produto (aprovadas no brainstorming, 19/08/2026)

| Decisão | Escolha |
|---|---|
| Integração | **A própria tarefa claude.ai grava no repo** via conector GitHub (`create_or_update_file` na `main`) |
| Privacidade | **Dados reais publicados** — repo é público; mesma postura dos gastos/localizadores já no site |
| Home | **Cartão especial no fim do mural** — member card escuro/dourado, "CARTÃO Nº" em vez de "BILHETE Nº" |
| Identidade visual | Extensão do sistema "cartão de embarque": a página de milhas é o **cartão de fidelidade** (escuro + dourado) |
| Histórico | **Git é o arquivo** — 1 commit/dia sobrescrevendo `painel.yaml`; sem arquivos por dia no v1 |
| Conteúdo estático | "Manual de voo" **hardcoded na página** (síntese própria do resumo do ebook + aula + régua do Notion — nunca texto do ebook, que tem marca d'água/copyright) |
| Tema | Claro apenas, como o resto do site |

## 3. Escopo

**Entra:** collection `milhas` + `painel.yaml` (seed com dados do Notion de 16/08); página `milhas.html` com as 5 seções do wireframe; cartão de milhas no mural da home; tokens novos do tema escuro/dourado; helpers de formatação; prompt completo da tarefa agendada versionado no repo (pronto para colar); CLAUDE.md/AGENTS.md atualizados.

**Fica fora (evolução):** gráfico de evolução de saldos; arquivo de briefings por dia; leitura do Notion no build; modo escuro; automação da *edição* do prompt no claude.ai (é colar manual, uma vez).

## 4. Arquitetura — fluxo de dados

```
Notion "✈️ Viagens e Milhas" (fonte da verdade — inalterada)
        │ passo 0 da tarefa (já existe): ler saldos, metas, pisos
        ▼
Tarefa agendada claude.ai ──Gmail+web──▶ briefing (formato de entrega atual, inalterado)
        │ passo NOVO: conector GitHub
        │ get_file_contents(painel.yaml) → editar só o que mudou →
        │ create_or_update_file na main · commit "milhas: briefing AAAA-MM-DD"
        ▼
src/content/viagens/…  (intocado)
src/content/milhas/painel.yaml   ← ÚNICO arquivo que a tarefa pode tocar
        │ push → .github/workflows/pages.yml → npm run build (zod valida)
        ▼
/ferias/milhas.html + cartão na home   (gate herdado do Base.astro)
```

**Fail-safe:** YAML inválido → build falha → **o site continua no ar com a versão anterior**; o dono recebe o e-mail de falha do Actions. Mesmo contrato de "build é o teste" das viagens.

## 5. Contrato de dados — `src/content/milhas/painel.yaml`

Nova collection `milhas` em `content.config.ts`, loader `glob({ pattern: 'painel.yaml', base: './src/content/milhas' })` → entrada única de id `painel` (`getEntry('milhas', 'painel')`). Schema zod **strict**. Sem comentário `# yaml-language-server` no topo (arquivo escrito por máquina; menos superfície de quebra — exceção documentada no CLAUDE.md).

```yaml
atualizadoEm: "2026-08-19"        # ISO AAAA-MM-DD; exibido como 19/08/2026
saldos:                           # min 1
  - programa: "Livelo"
    saldo: 15547                  # INTEIRO sem separador (15.547 vira float e derruba o build — de propósito)
    unidade: "pts"                # texto livre: pts | milhas | átomos (exibido em caixa alta via CSS)
    tipo: flexivel                # enum: flexivel | terminal (muda o selo/estilo do card)
    nota: "Clube ativo — **não expiram** · +9.477 a receber a partir de 02/09"   # opcional, md inline
alertas:                          # pendências/validades; default []
  - "**Contestação Smiles/Esfera:** bônus de ~31.500 milhas não creditado — 2º contato 16/08"
meta:
  destino: "Nova York"
  alvo: "março/2027"
  pax: "2"
  cabine: "econômica"             # opcional
  duracao: "14 dias"              # opcional
  situacao: "**Saldo cobre** … gargalo é **volta saver em 2027 com 2 assentos**…"  # md inline
  gatilhos: ["volta saver 2027 · 2 assentos", "bônus Esfera → Iberia (Avios)"]     # default []
pisos:                            # espelho da seção 4 do Notion; default []
  - "Livelo→Smiles ≥ 70%"
oportunidades:                    # default [] (dia seco = lista vazia, NUNCA omitir a chave)
  - titulo: "Livelo → Smiles"
    bonus: "80%"                  # opcional (sem % claro → omitir; página exibe "—")
    prazo: "21/08"                # obrigatório (regra do briefing: sem prazo claro, não reporta)
    detalhe: "teto p/ assinantes de Clube · fecha o milheiro a ~R$ 12,22"  # opcional, md inline
    url: "https://…"              # opcional, z.string().url()
    recomendacao: "AGIR HOJE"     # enum: AGIR HOJE | MONITORAR (mesmos literais do briefing)
    tag: "🎯 META NY"             # opcional, vira o chip dourado
```

Regras de desenho do schema:

- **Enum só onde a renderização ramifica** (`tipo`, `recomendacao`); todo o resto é string livre — typo do LLM degrada exibição, não derruba build.
- **`saldo` é o único número** (`z.number().int().nonnegative()`): pega o erro clássico de `15.547` (float) e permite formatação pt-BR pelo componente.
- Campos de texto aceitam o **markdown inline restrito** já existente (`mdInline`).
- Proibições herdadas do projeto: nunca chaves `$schema:`/`slug:`; schema strict derruba chave desconhecida.
- `atualizadoEm` formatado por manipulação de string (split/join), **nunca via `new Date()`** — evita deslocamento de fuso.

`src/lib/format.js` ganha `fmtInt(n)` (agrupamento pt-BR: `276117 → "276.117"`, via `Intl.NumberFormat('pt-BR')`) e `fmtDataIso(s)` (`"2026-08-19" → "19/08/2026"`).

## 6. A página `src/pages/milhas.astro` (URL `/ferias/milhas.html`)

Estrutura conforme o wireframe validado, via `Base.astro` (gate, noindex e fontes herdados). Title: `Milhas & Pontos — CK-Labs`. Componentes novos em `src/components/milhas/`:

| Componente | Papel | Dados |
|---|---|---|
| `MemberCard.astro` | Hero: cartão de fidelidade escuro/dourado + carimbo "Verificado DD/MM/AAAA" | `atualizadoEm`, nº de programas |
| `SaldoCard.astro` | Card de programa: saldo tabular, selo FLEXÍVEL (dourado sólido) / TERMINAL (tracejado cinza), nota | `saldos[]` |
| `MetaBoard.astro` | Letreiro de aeroporto escuro: destino, alvo/pax/cabine/duração, situação, gatilhos 📡 | `meta` |
| `Radar.astro` | Oportunidades (carimbo AGIR HOJE sólido âmbar / MONITORAR tracejado), estado "céu limpo" quando vazio, caixa ⚠️ de alertas (padrão `.lembretes`), chips de pisos | `oportunidades[]`, `alertas[]`, `pisos[]`, `atualizadoEm` |
| `ManualVoo.astro` | Estático: as duas moedas, hierarquia do acúmulo (1–5), régua de decisão em cupom (tabela com overflow próprio), regras de ouro, emissão em 3 passos | — (hardcoded) |
| `MilhasCard.astro` | Cartão do mural da home (seção 7) | `atualizadoEm`, `saldos.length` |

**Tokens novos no `global.css`:** `--card-escuro: #211d1a`, `--card-escuro-2: #2c2724`, `--dourado: #ca8a04`, `--gold-fio: #e3b341` (dourado sobre escuro ≈ 8,6:1, AA ok; texto de corpo no escuro `#e9e0cd`). Bronze reusa `--pend`.

**Animações:** padrão do gate — `animation-play-state: paused` + `:global(html.embarcado) … { running }`. Carimbo "Verificado" usa `stampin`; cards de saldo usam `deal` com stagger como os tíquetes. `prefers-reduced-motion` já é global.

**Acessibilidade:** caixa alta sempre via `text-transform` (nunca no dado — regra do projeto); rodapé mono do cartão escuro segue o precedente do `.num` do TicketCard (decorativo, `aria-hidden`); chips/selos com borda ≥ 3:1.

**Responsividade (requisito):** grid da carteira 1 → 2 → 3 colunas (640px/1024px, como o mural); letreiro da meta quebra em coluna no mobile; tabela da régua rola dentro do próprio cupom (`overflow-x: auto`); zero scroll horizontal em 375/768/1280.

## 7. Home — cartão no mural

`MilhasCard.astro` entra **no fim do mural** em `index.astro` (depois das realizadas), com a mesma malha/hover dos tíquetes: fundo `--card-escuro`, faixa superior em degradê dourado, rota "ACÚMULO ✈ EMISSÃO", nome "💳 Milhas & Pontos", linha "radar diário · N programas" (N = `saldos.length`), carimbo dourado "Verificado DD/MM", rodapé "CARTÃO Nº 001" + código de barras em tom dourado apagado. `view-transition-name: ticket-milhas`. Link para `${base}/milhas.html`.

## 8. Mudança na tarefa agendada (claude.ai)

O repo passa a versionar **o prompt completo da tarefa** em `docs/prompt-tarefa-agendada-milhas.md` — o texto atual (passos 0–5, inalterados) + o passo novo. O dono cola o arquivo inteiro no lugar do prompt da tarefa **uma vez** e habilita o conector GitHub nela. Prompt e schema são acoplados: **mudou o schema do `painel.yaml`, muda o prompt no mesmo commit** (regra vai para o CLAUDE.md).

Contrato do passo novo ("6) PUBLICAR NO SITE"):

- Ferramenta: conector GitHub · repo `marcelo-cklabs/ferias` · branch `main` · path `src/content/milhas/painel.yaml`.
- Fluxo: `get_file_contents` do arquivo atual → **copiar e editar apenas o que mudou** (estrutura e chaves intactas) → `create_or_update_file` com o `sha` atual e mensagem `milhas: briefing AAAA-MM-DD`.
- Conteúdo: `saldos`/`alertas`/`meta`/`pisos` espelham o Notion lido no passo 0; `oportunidades` = as que passaram no filtro HOJE **+ anteriores cujo prazo ainda não venceu** (remover vencidas); dia seco → `oportunidades: []`.
- Formato: template exato no prompt (com exemplo preenchido); inteiros sem separador de milhar; nunca criar chaves; nunca tocar outro arquivo; **na dúvida sobre o formato, não gravar** e avisar no briefing.
- Entrega ao dono: o formato atual do briefing continua igual, com uma linha final "📟 Painel do site atualizado" (ou o motivo de não ter atualizado). A regra do dia seco muda de "responda exatamente e somente 'Nenhuma oportunidade relevante hoje.'" para permitir essa linha de status a mais.

## 9. Riscos e salvaguardas

| Risco | Salvaguarda |
|---|---|
| Conector GitHub indisponível dentro da tarefa agendada | Validar no 1º dia (rodar a tarefa manualmente). Plano B decidido: rotina do Claude Code na nuvem só para a etapa de publicação |
| LLM quebra o YAML | Schema mínimo + template com exemplo + "copie e edite" + fail-safe do build (site fica na versão anterior; e-mail do Actions) |
| `15.547` como float | `z.number().int()` derruba o build — comportamento desejado |
| Drift schema ↔ prompt | Prompt versionado no repo + regra "mudam juntos" no CLAUDE.md |
| ~365 commits/ano na main | Aceito; prefixo `milhas:` mantém o log filtrável |

## 10. Critérios de aceite

1. `npm run build` passa com o seed; mutação inválida proposital (ex.: `saldo: 15.547`) derruba o build e, revertida, volta a passar.
2. `/ferias/milhas.html` renderiza atrás do gate, com as 5 seções do wireframe e sem scroll horizontal em 375/768/1280.
3. Home exibe o cartão de milhas no fim do mural, com hover/transição consistentes.
4. `docs/prompt-tarefa-agendada-milhas.md` contém o prompt completo pronto para colar.
5. CLAUDE.md e AGENTS.md (espelhos) documentam: a collection `milhas`, quem escreve o `painel.yaml` (a tarefa na nuvem — não brigar com ela), o acoplamento schema↔prompt e a exceção do comentário de editor.
6. Ponta a ponta (passo do dono, com instruções entregues): colar o prompt, habilitar o conector, rodar a tarefa manualmente → commit `milhas: briefing …` → Actions verde → página com `atualizadoEm` novo.
