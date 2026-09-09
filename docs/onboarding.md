# Onboarding do desenvolvedor

Este documento simula o que um desenvolvedor receberia ao entrar no projeto SEGET Missoes.

## 1. O que e o sistema

O SEGET Missoes e um sistema full stack para controle de frota, checklists fotograficos e acompanhamento de missoes de veiculos.

Principais usuarios:

- Motorista: inicia/finaliza missoes e registra checklists.
- Administrador: gerencia frota, motoristas, missoes, relatorios e indicadores.

## 2. Tecnologias principais

- Backend: Java 17, Spring Boot 3, Spring Security, JWT, Spring Data JPA.
- Frontend: Angular, Angular Material, PWA.
- Banco: PostgreSQL.
- Infra: Docker, Docker Compose, Nginx e VPS Hostinger.
- CI/CD: GitHub Actions.

## 3. Primeiro dia no projeto

1. Clone o repositorio.
2. Leia `README.md`.
3. Leia `docs/dev-setup.md`.
4. Leia `docs/git-workflow.md`.
5. Suba o projeto localmente com Docker.
6. Escolha uma Issue simples para comecar.
7. Crie uma branch a partir da `develop`.
8. Abra um Pull Request para `develop`.

## 4. Branches

- `main`: producao.
- `develop`: integracao e testes.
- `codex/*`, `feature/*`, `fix/*`, `chore/*`: trabalho diario.

Exemplo:

```bash
git checkout develop
git pull origin develop
git checkout -b codex/minha-primeira-tarefa
```

## 5. Antes de abrir Pull Request

Rode pelo menos:

```bash
cd frontend
npm ci
npm run build
```

Se estiver com Java 17 configurado:

```bash
cd backend
mvn -B clean package -DskipTests
```

## 6. Como pedir ajuda

Ao abrir uma Issue ou PR, informe:

- O que voce tentou fazer.
- O que esperava acontecer.
- O que aconteceu de fato.
- Prints, logs ou mensagens de erro quando existir.

## 7. Regra de ouro

Nao trabalhe direto na `main`.

Toda mudanca deve passar por branch, Pull Request e CI.
