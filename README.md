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
