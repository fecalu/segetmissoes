# Reset de producao preservando alocacoes administrativas atuais

Este roteiro prepara o sistema para entrar em producao como uma instalacao limpa,
mantendo somente as alocacoes administrativas atuais e o acesso administrativo.

## O que sera preservado

- `controle_alocacoes`
- usuarios `ADMIN`

## O que sera apagado

- veiculos operacionais
- motoristas nao administrativos, exceto os referenciados pelo historico de alocacoes
- missoes
- checklists
- fotos
- vistorias
- viagens
- usos externos
- historicos operacionais de status
- historico de alocacoes administrativas
- auditorias operacionais
- configuracoes operacionais editaveis

## Passo seguro de execucao

1. Fazer commit e merge das alteracoes que vao para producao.
2. Acessar a VPS.
3. Entrar na pasta do projeto em producao.
4. Atualizar o codigo.
5. Conferir a quantidade atual de alocacoes administrativas.
6. Executar o script `deploy/scripts/reset-production-preserve-alocacoes.sql`.
7. Subir/recriar containers.
8. Validar login administrativo.
9. Validar a tela `Alocacoes administrativas`.
10. Validar que veiculos, motoristas, missoes, checklists e vistorias ficaram vazios.

## Comandos base

Backup completo opcional:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  > "backup-before-reset-$(date +%Y%m%d-%H%M%S).sql"
```

Backup separado das alocacoes, tambem opcional:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  -t controle_alocacoes \
  -t controle_alocacoes_historicos \
  > "backup-alocacoes-$(date +%Y%m%d-%H%M%S).sql"
```

Conferencia antes do reset:

```sql
select count(*) as alocacoes from controle_alocacoes;
select count(*) as historico_alocacoes from controle_alocacoes_historicos;
select count(*) as administradores from motoristas where perfil = 'ADMIN';
```

Execucao do reset:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < deploy/scripts/reset-production-preserve-alocacoes.sql
```

## Conferencias depois do reset

```sql
select count(*) as veiculos from veiculos;
select count(*) as motoristas from motoristas;
select count(*) as missoes from missoes;
select count(*) as checklists from checklists;
select count(*) as vistorias from vistorias_completas;
select count(*) as alocacoes from controle_alocacoes;
select count(*) as historico_alocacoes from controle_alocacoes_historicos;
```

Depois do reset, `historico_alocacoes` deve ficar `0`.
