# MVP - Controle de Frota com Checklist Fotográfico

MVP full stack para prevenção de furto de pneus com checklist obrigatório de 4 fotos (painel, estepe, lateral esquerda e lateral direita) na saída e chegada.

## Stack

- Backend: Java 17, Spring Boot 3, Spring Data JPA, Spring Security + JWT
- Banco: PostgreSQL
- Frontend: Angular + Angular Material
- Infra: Docker + Docker Compose

## Estrutura do projeto

```text
.
├── backend
├── frontend
├── docker-compose.yml
└── README.md
```

## Como subir com Docker

```bash
docker compose up --build
```

Serviços:

- Backend API: `http://localhost:8080`
- Frontend: `http://localhost:4200`
- PostgreSQL: `localhost:5432`
- PgAdmin: `http://localhost:5050` (`admin@frota.local` / `admin123`)

## Credenciais iniciais

- Login: `motorista1`
- Senha: `123456`

## Endpoints principais

### 1. Login

`POST /api/auth/login`

Request:

```json
{
  "login": "motorista1",
  "senha": "123456"
}
```

Response:

```json
{
  "token": "<jwt>",
  "motoristaId": 1,
  "nome": "Motorista Teste"
}
```

### 2. Listar veículos

`GET /api/veiculos`

Header:

`Authorization: Bearer <jwt>`

### 3. Criar checklist com fotos (multipart/form-data)

`POST /api/checklists`

Headers:

- `Authorization: Bearer <jwt>`
- `Content-Type: multipart/form-data`

Campos:

- `veiculoId`
- `quilometragem`
- `tipoOperacao` (`SAIDA` ou `ENTRADA`)
- `fotoPainel`
- `fotoEstepe`
- `fotoLateralEsq`
- `fotoLateralDir`

Exemplo de resposta:

```json
{
  "id": 10,
  "dataHora": "2026-03-07T16:30:11.123",
  "tipoOperacao": "SAIDA",
  "quilometragem": 150230,
  "motoristaId": 1,
  "motoristaNome": "Motorista Teste",
  "veiculoId": 2,
  "veiculoPlaca": "QWE4R56",
  "fotos": [
    { "id": 101, "tipoFoto": "PAINEL", "caminhoArquivo": "/uploads/checklists/..." },
    { "id": 102, "tipoFoto": "ESTEPE", "caminhoArquivo": "/uploads/checklists/..." },
    { "id": 103, "tipoFoto": "LATERAL_ESQ", "caminhoArquivo": "/uploads/checklists/..." },
    { "id": 104, "tipoFoto": "LATERAL_DIR", "caminhoArquivo": "/uploads/checklists/..." }
  ]
}
```

## Teste via Postman/Insomnia

1. Fazer login em `/api/auth/login` e copiar o token.
2. Chamar `GET /api/veiculos` com header `Authorization: Bearer <token>`.
3. Chamar `POST /api/checklists` com `multipart/form-data`:
   - Campos de texto: `veiculoId`, `quilometragem`, `tipoOperacao`
   - 4 campos de arquivo: `fotoPainel`, `fotoEstepe`, `fotoLateralEsq`, `fotoLateralDir`

## Regras implementadas

- Checklist só salva se as 4 fotos obrigatórias forem enviadas.
- Arquivos são salvos no filesystem (`/uploads/checklists` no container).
- Banco guarda apenas caminho do arquivo.
- Checklist sempre vinculado ao motorista autenticado (JWT) e a um veículo.

## Rodando local sem Docker

Backend:

```bash
cd backend
mvn spring-boot:run
```

Frontend:

```bash
cd frontend
npm install
npm start
```

## Deploy no Render

O projeto ja esta preparado para deploy com Blueprint usando o arquivo `render.yaml` na raiz.

### 1. Publicar no GitHub

```bash
git add .
git commit -m "chore: prepare render deployment"
git push
```

### 2. Criar no Render via Blueprint

1. No Render, clique em `New +` -> `Blueprint`.
2. Conecte o repositorio `segetmissoes`.
3. O Render vai ler o arquivo `render.yaml` e criar:
   - `seget-db` (PostgreSQL)
   - `seget-backend` (Spring Boot em Docker)
   - `seget-frontend` (Angular + Nginx em Docker)
4. Confirme e execute o deploy.

### 3. Variaveis importantes

No backend (ja configuradas no `render.yaml`):
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` (vindas do banco)
- `JWT_SECRET` (gerada automaticamente)
- `UPLOAD_BASE_DIR=/tmp/uploads` (ephemero no plano free)
- `CORS_ALLOWED_ORIGINS=https://*.onrender.com`

No frontend:
- `API_ORIGIN` vem automaticamente do `RENDER_EXTERNAL_URL` do backend.

### 4. Persistencia de fotos

No plano `free`, os uploads ficam em `/tmp/uploads` e podem ser perdidos em restart/redeploy.

Se quiser persistencia real de fotos no Render:
1. Troque o backend para plano `starter`.
2. Adicione `disk` no servico backend (ex.: `/var/data`).
3. Mude `UPLOAD_BASE_DIR` para `/var/data/uploads`.

## Dominio proprio (Registro.br)

O `render.yaml` ja esta configurado com:
- Frontend: `segetmissoes.com.br`
- Backend API: `api.segetmissoes.com.br`

No Registro.br, configure o DNS assim:
1. Dominio raiz (`segetmissoes.com.br`): registro `A` apontando para `216.24.57.1`.
2. Subdominio da API (`api`): registro `CNAME` para o host padrao do backend no Render (valor exibido na aba `Custom Domains` do servico backend).
3. Remova `AAAA` do dominio/subdominio se existirem.

Depois, no Render:
1. Abra o servico `seget-frontend` e confirme o dominio `segetmissoes.com.br`.
2. Abra o servico `seget-backend` e confirme o dominio `api.segetmissoes.com.br`.
3. Aguarde emissao do certificado TLS (SSL) e propagacao do DNS.

## Deploy na Hostinger VPS

O projeto tambem esta preparado para rodar em VPS propria usando Docker Compose de producao.

Arquivos principais:

- `docker-compose.prod.yml`: sobe frontend, backend e PostgreSQL em rede isolada.
- `.env.prod.example`: modelo das variaveis reais de producao.
- `deploy/nginx/segetmissoes.conf`: proxy Nginx para dominio e API.
- `docs/deploy-hostinger.md`: passo a passo completo para subir na VPS.

Resumo do fluxo:

```bash
cp .env.prod.example .env
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Na VPS atual, a configuracao sugerida usa:

- Frontend interno: `127.0.0.1:4320`
- Backend interno: `127.0.0.1:8092`
- Dominio: `segetmissoes.com.br`
- API: `api.segetmissoes.com.br`

## Fluxo profissional de desenvolvimento

Para usar este projeto como base de estudos e simular uma rotina de empresa, foi documentado um fluxo simples com branches, Pull Requests, CI e deploy manual para VPS.

Leia:

- `docs/dev-setup.md`
- `docs/git-workflow.md`

Resumo:

- `main`: producao.
- `develop`: integracao/testes.
- `feature/*`, `fix/*`, `chore/*`: branches de trabalho.
- GitHub Actions `CI`: valida backend, frontend e Docker Compose.
- GitHub Actions `Deploy VPS`: publica manualmente na VPS usando SSH.
