# Guia de contribuicao

Este guia descreve o fluxo simples de trabalho usado neste repositorio.

## Tipos de tarefa

- `bug`: correcao de erro.
- `enhancement`: melhoria ou nova funcionalidade.
- `chore`: tarefa tecnica, documentacao ou infraestrutura.
- `frontend`: mudancas no Angular.
- `backend`: mudancas no Spring Boot.
- `infra`: Docker, VPS, Nginx, CI/CD.
- `docs`: documentacao.

## Padrao de branch

Use nomes curtos e claros:

```text
codex/ajuste-login-mobile
fix/relatorio-pdf-vazio
feature/painel-missoes
chore/documentacao-onboarding
```

## Padrao de commit

Use mensagens objetivas:

```text
feat: add mission report export
fix: correct vehicle status after patio departure
chore: update onboarding docs
```

Prefixos recomendados:

- `feat`: nova funcionalidade.
- `fix`: correcao.
- `chore`: manutencao/configuracao.
- `docs`: documentacao.
- `refactor`: melhoria interna sem mudar comportamento.
- `style`: ajuste visual sem regra nova.

## Pull Request

Todo PR deve responder:

- O que mudou?
- Como foi validado?
- Existe impacto em banco, deploy ou ambiente?

## Criterios minimos para merge

- CI verde.
- Sem mudancas fora do escopo.
- Sem secrets no codigo.
- Sem arquivos temporarios commitados.
- Regra de negocio descrita com clareza quando houver mudanca funcional.

## Deploy

Deploy de producao e manual.

Caminho:

```text
GitHub > Actions > Deploy VPS > Run workflow
```

Use `main` como referencia para producao.
