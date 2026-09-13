-- Reset controlado da base de producao preservando alocacoes administrativas atuais.
--
-- Objetivo:
-- - apagar dados operacionais do sistema de frota;
-- - preservar somente a tabela controle_alocacoes;
-- - apagar historicos antigos, incluindo controle_alocacoes_historicos;
-- - manter somente usuarios ADMIN.
--
-- Rode somente depois de fazer backup completo do banco.
-- Exemplo:
--   docker compose -f docker-compose.prod.yml exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup-before-reset.sql

BEGIN;

-- Fotos e checklists de missoes.
TRUNCATE TABLE fotos RESTART IDENTITY CASCADE;
TRUNCATE TABLE checklists RESTART IDENTITY CASCADE;

-- Vistorias completas e seus detalhes.
TRUNCATE TABLE vistorias_completas_avarias RESTART IDENTITY CASCADE;
TRUNCATE TABLE vistorias_completas_fotos RESTART IDENTITY CASCADE;
TRUNCATE TABLE vistorias_completas_itens RESTART IDENTITY CASCADE;
TRUNCATE TABLE vistorias_completas RESTART IDENTITY CASCADE;

-- Missoes, excecoes e auditorias ligadas a missoes.
TRUNCATE TABLE auditoria_missoes RESTART IDENTITY CASCADE;
TRUNCATE TABLE missoes_excecao RESTART IDENTITY CASCADE;
TRUNCATE TABLE missoes RESTART IDENTITY CASCADE;

-- Operacoes administrativas da frota.
TRUNCATE TABLE historico_status_veiculo RESTART IDENTITY CASCADE;
TRUNCATE TABLE registro_uso_externo_veiculo RESTART IDENTITY CASCADE;
TRUNCATE TABLE registro_viagem_veiculo RESTART IDENTITY CASCADE;
TRUNCATE TABLE auditoria_exclusao_veiculo RESTART IDENTITY CASCADE;
TRUNCATE TABLE auditoria_administrativa RESTART IDENTITY CASCADE;
TRUNCATE TABLE controle_alocacoes_historicos RESTART IDENTITY CASCADE;

-- Configuracoes operacionais editaveis. O sistema volta ao padrao do codigo.
TRUNCATE TABLE config_rotulo_status_veiculo RESTART IDENTITY CASCADE;
TRUNCATE TABLE config_sugestao_missao RESTART IDENTITY CASCADE;

-- Cadastro operacional de veiculos.
TRUNCATE TABLE veiculos RESTART IDENTITY CASCADE;

-- Cadastro de usuarios/motoristas:
-- Mantem somente administradores.
DELETE FROM motoristas
WHERE perfil <> 'ADMIN';

-- Garante que os administradores preservados possam acessar.
UPDATE motoristas
SET acesso_habilitado = true
WHERE perfil = 'ADMIN';

COMMIT;
