-- Cria a tabela de auditoria administrativa caso ainda nao exista.
-- Em instalacoes existentes com ddl-auto: update, o Hibernate pode ter criado
-- a tabela antes desta migracao rodar. O IF NOT EXISTS garante idempotencia.
CREATE TABLE IF NOT EXISTS auditoria_administrativa (
    id               BIGSERIAL PRIMARY KEY,
    autor_id         BIGINT,
    autor_nome       VARCHAR(255) NOT NULL,
    autor_perfil     VARCHAR(20)  NOT NULL,
    entidade         VARCHAR(60)  NOT NULL,
    registro_id      BIGINT,
    acao             VARCHAR(100) NOT NULL,
    campo            VARCHAR(80),
    valor_anterior   VARCHAR(2000),
    valor_novo       VARCHAR(2000),
    justificativa    VARCHAR(700),
    data_hora        TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT auditoria_administrativa_autor_perfil_check
        CHECK (autor_perfil IN ('ADMIN', 'GESTOR', 'OPERADOR', 'MOTORISTA'))
);

CREATE INDEX IF NOT EXISTS idx_auditoria_admin_entidade_registro
    ON auditoria_administrativa (entidade, registro_id);

CREATE INDEX IF NOT EXISTS idx_auditoria_admin_data_hora
    ON auditoria_administrativa (data_hora DESC);
