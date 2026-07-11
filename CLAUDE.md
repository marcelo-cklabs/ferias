# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

Site estático pessoal de planejamento de viagens (Marcelo & Sabrina), em HTML/CSS/JS puro, **sem build, sem dependências, sem frameworks** — restrição deliberada. Todo o conteúdo é em pt-BR. O dono usa o site somente para leitura; todas as edições são feitas via Claude Code, então otimize para edições corretas de primeira, não para abstrações.

Não há build, lint nem testes. Para conferir uma mudança, abra `index.html` no navegador (ou sirva a raiz com um servidor estático qualquer).

Relatórios de análise/revisão gerados por IA ficam em `ai-docs/` — leia o mais recente antes de mexer em pontos que ele marca como pendentes (auth, página do Nordeste, duplicações).

## Arquitetura

- `index.html` — home com um card (`a.tripcard`) por viagem, linkando para a página correspondente.
- `viagens/<slug>.html` — uma página por viagem. Slug: destino + mês/ano em minúsculas (`saopaulo-out2026`, `brasilia-fev2027`, `newyork-2027`).
- `assets/styles.css` — design system compartilhado por todas as páginas. Cores/temas via custom properties em `:root`; cada página sobrescreve o acento do hero por `--accent-a`/`--accent-b`.
- `assets/auth.js` — gate de senha client-side, incluído como **último elemento do `<body>` de toda página**.

Anatomia padrão de uma página de viagem (copiada de uma existente): hero com back-link `← Viagens` → seções `Roteiro dia a dia` (timeline), `Voos`, `Hospedagem`, `Gastos` (tabela `table.gastos`), `Próximos passos` (checklist `.todo`) → footer → include do auth. Status usa `st-plan` ("Planejando") ou `st-confirm`.

## Contratos entre arquivos (fáceis de quebrar)

- **Dados duplicados por design**: status, datas e título de cada viagem existem no card do `index.html` E no hero da página. Detalhes de show podem aparecer também na timeline e no card da home. Ao atualizar qualquer viagem, sincronize todos os pontos — o dono só lê o site e confia no resumo da home.
- **Par de acentos duplicado**: `--accent-a`/`--accent-b` de cada viagem está inline no card do index E no hero da página. Mudou a cor, mude nos dois.
- **Checklist de viagem nova**: criar `viagens/<slug>.html` (copiando uma página existente) + card no `index.html` com o mesmo par de acentos + garantir `<script src="../assets/auth.js">` no fim do body — sem o include, a página fica fora do gate silenciosamente.
- **Classes CSS "órfãs" não são código morto**: `.leg`, `.ap`, `.tm`, `.arrow`, `.conx`, `.badge`, `.loc`, `.grid`, `.t-car`, `.t-drive`, `.total`, `.pill-apagar`, `.note` pertencem à página do roteiro do Nordeste (`viagens/nordeste-set2026.html`), que está linkada no index mas ainda não foi adicionada ao repo. Não as remova.

## Segurança — leia antes de mexer no auth

`assets/auth.js` é uma **cortina visual, não segurança**: o conteúdo é servido integralmente independente do gate, e a senha está hardcoded no próprio JS. A proteção real planejada é Basic Auth no nginx (servidor "TATOOINE"). Não trate dados como protegidos pelo gate, não "reforce" a proteção no client-side, e não exponha a senha em novos lugares.
