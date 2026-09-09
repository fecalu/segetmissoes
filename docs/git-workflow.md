# Fluxo profissional de Git e deploy

Este projeto usa um fluxo simples, parecido com o que voce encontraria em uma equipe pequena ou media.

## Branches principais

### `main`

Representa producao.

Regras:

- Deve estar sempre em estado publicavel.
- Recebe mudancas por Pull Request.
- Deploy em producao deve sair preferencialmente daqui.

### `develop`

Representa ambiente de integracao/testes.

Regras:

- Recebe funcionalidades antes de irem para producao.
- Serve para validar varias mudancas juntas.
- Quando estiver estavel, abre PR de `develop` para `main`.

## Branches de trabalho

Use branches curtas a partir de `develop`.

Exemplos:

```bash
git checkout develop
git pull
git checkout -b feature/cadastro-veiculos
```

Padroes recomendados:

- `feature/nome-da-funcionalidade`: nova funcionalidade.
- `fix/nome-do-problema`: correcao de bug.
- `chore/nome-da-tarefa`: configuracao, infra, limpeza.
- `refactor/nome-da-melhoria`: refatoracao sem mudar regra de negocio.

## Fluxo diario

1. Atualizar `develop`.
2. Criar branch de trabalho.
3. Fazer commits pequenos e claros.
4. Abrir Pull Request para `develop`.
5. Esperar o CI passar.
6. Revisar e fazer merge.

## Publicacao em producao

1. Abrir Pull Request de `develop` para `main`.
2. Conferir se o CI passou.
3. Fazer merge em `main`.
4. Executar o workflow manual `Deploy VPS` no GitHub Actions.
5. Selecionar `main` como `ref`.

## GitHub Actions

### CI

Arquivo:

```txt
.github/workflows/ci.yml
```

Roda automaticamente em:

- Pull Request para `main` ou `develop`.
- Push direto para `main` ou `develop`.

Valida:

- Build do backend Spring Boot.
- Build do frontend Angular.
- Sintaxe do `docker-compose.prod.yml`.

### Deploy VPS

Arquivo:

```txt
.github/workflows/deploy-vps.yml
```

Roda manualmente pelo GitHub.

Local:

```txt
GitHub > Actions > Deploy VPS > Run workflow
```

Secrets necessarios:

```txt
VPS_HOST=177.7.53.222
VPS_USER=root
VPS_APP_DIR=/opt/segetmissoes
VPS_SSH_PRIVATE_KEY=<chave privada SSH autorizada na VPS>
```

## Por que usar chave SSH em vez de senha?

Em empresa, deploy automatico nao deve depender de senha digitada.

A chave SSH permite:

- Deploy reproduzivel.
- Menos risco de vazar senha.
- Revogacao facil removendo a chave da VPS.
- Uso seguro em GitHub Actions Secrets.

## Comandos uteis

Criar `develop` a partir da `main`:

```bash
git checkout main
git pull
git checkout -b develop
git push -u origin develop
```

Criar branch de funcionalidade:

```bash
git checkout develop
git pull
git checkout -b feature/minha-funcionalidade
```

Enviar branch:

```bash
git push -u origin feature/minha-funcionalidade
```

Atualizar VPS manualmente, caso nao use GitHub Actions:

```bash
ssh root@177.7.53.222
cd /opt/segetmissoes
./deploy/scripts/update-hostinger.sh
```

## Regras de qualidade recomendadas

- Nunca desenvolver direto na `main`.
- Evitar commits gigantes.
- Cada Pull Request deve ter objetivo claro.
- Sempre rodar build antes de abrir PR quando possivel.
- Produção deve ser atualizada conscientemente, nao por acidente.
