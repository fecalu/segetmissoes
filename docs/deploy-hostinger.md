# Deploy Hostinger VPS

Este guia sobe o SEGET na VPS sem interferir nos projetos existentes. O Nginx da VPS continua sendo o proxy público nas portas 80/443, e os containers do SEGET ficam acessíveis apenas em `127.0.0.1`.

## Arquitetura

- Frontend Angular/Nginx: `127.0.0.1:4320`
- Backend Spring Boot: `127.0.0.1:8092`
- PostgreSQL: somente na rede Docker `seget_net`
- Uploads: volume Docker persistente `seget_uploads`
- Banco: volume Docker persistente `seget_pgdata`

## DNS

No painel DNS do domínio, aponte:

- `segetmissoes.com.br` para `177.7.53.222`
- `www.segetmissoes.com.br` para `177.7.53.222`
- `api.segetmissoes.com.br` para `177.7.53.222`

Use registros `A`. Se houver Cloudflare, deixe como `DNS only` durante a emissão do certificado.

## Primeiro Deploy

Entre na VPS:

```bash
ssh root@177.7.53.222
```

Crie a pasta do projeto:

```bash
mkdir -p /opt/segetmissoes
cd /opt/segetmissoes
```

Clone o repositório:

```bash
git clone git@github.com:fecalu/segetmissoes.git .
```

Crie o arquivo real de ambiente:

```bash
cp .env.prod.example .env
nano .env
```

Troque principalmente:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `API_ORIGIN`
- `CORS_ALLOWED_ORIGINS`

Suba os containers:

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Confira:

```bash
docker compose -f docker-compose.prod.yml ps
docker logs --tail=100 seget_backend
docker logs --tail=100 seget_frontend
```

## Nginx

Copie a configuração:

```bash
cp /opt/segetmissoes/deploy/nginx/segetmissoes.conf /etc/nginx/sites-available/segetmissoes
ln -s /etc/nginx/sites-available/segetmissoes /etc/nginx/sites-enabled/segetmissoes
nginx -t
systemctl reload nginx
```

Gere HTTPS com Certbot:

```bash
certbot --nginx -d segetmissoes.com.br -d www.segetmissoes.com.br -d api.segetmissoes.com.br
```

Teste:

```bash
curl -I https://segetmissoes.com.br
curl -I https://api.segetmissoes.com.br/api/veiculos
```

O endpoint `/api/veiculos` deve retornar `401` ou `403` sem token. Isso já confirma que a API está respondendo.

## Atualização

Para atualizar depois de um novo commit:

```bash
cd /opt/segetmissoes
git pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker image prune -f
```

Ou use o script versionado no projeto:

```bash
bash deploy/scripts/update-hostinger.sh
```

## Backup

Backup do banco:

```bash
mkdir -p /opt/segetmissoes/backups
docker exec seget_db pg_dump -U frota_user frota_db > /opt/segetmissoes/backups/seget-$(date +%Y%m%d-%H%M%S).sql
```

Backup dos uploads:

```bash
docker run --rm -v seget_uploads:/uploads -v /opt/segetmissoes/backups:/backup alpine tar czf /backup/seget-uploads-$(date +%Y%m%d-%H%M%S).tar.gz /uploads
```

Ou use o script versionado no projeto:

```bash
bash deploy/scripts/backup-hostinger.sh
```

## Cuidados

- Não rode `docker system prune -a --volumes`, pois isso pode apagar volumes de outros projetos.
- Não publique o PostgreSQL na internet.
- Mantenha o `.env` fora do Git.
- Troque a senha SSH compartilhada após finalizar a migração.
