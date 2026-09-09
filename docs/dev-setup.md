# Ambiente local de desenvolvimento

Este projeto usa:

- Java 17 para o backend Spring Boot.
- Node.js 22 para o frontend Angular.
- Docker e Docker Compose para PostgreSQL e execucao integrada.

## Conferir versoes

Backend:

```bash
java -version
mvn -version
```

O Java precisa aparecer como `17`.

Frontend:

```bash
node -v
npm -v
```

O Node recomendado e `22`.

## Observacao importante sobre Java

Se o Maven estiver usando Java 8, o backend nao compila porque o projeto usa recursos modernos da linguagem, como text blocks (`"""`).

Erro comum:

```txt
unclosed string literal
not a statement
```

Nesse caso, o problema nao e o codigo: e o Java local.

No Windows, ajuste o `JAVA_HOME` para apontar para o JDK 17 e garanta que o `PATH` use esse Java antes de qualquer Java 8.

## Subir tudo localmente

```bash
docker compose up -d --build
```

## Validar antes de abrir Pull Request

Backend:

```bash
cd backend
mvn -B clean package -DskipTests
```

Frontend:

```bash
cd frontend
npm ci
npm run build
```

Docker Compose de producao:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod.example config --quiet
```

## Login local inicial

Administrador:

```txt
login: admin
senha: admin123
```

Motorista:

```txt
login: motorista1
senha: 123456
```
