CREATE TABLE IF NOT EXISTS controle_vagas_administrativas (
    id                   BIGSERIAL PRIMARY KEY,
    numero_controle      INTEGER      NOT NULL UNIQUE,
    secretaria_orgao     VARCHAR(160) NOT NULL,
    setor                VARCHAR(160) NOT NULL,
    limite_autorizado    VARCHAR(60)  NOT NULL,
    documento_referencia VARCHAR(180),
    observacao           VARCHAR(500),
    status               VARCHAR(20)  NOT NULL DEFAULT 'LIVRE',
    criada_em            TIMESTAMP    NOT NULL DEFAULT NOW(),
    encerrada_em         TIMESTAMP,
    CONSTRAINT controle_vagas_administrativas_status_check
        CHECK (status IN ('LIVRE', 'OCUPADA', 'DESATIVADA'))
);

ALTER TABLE controle_alocacoes
    ADD COLUMN IF NOT EXISTS vaga_administrativa_id BIGINT;

INSERT INTO controle_vagas_administrativas (
    numero_controle,
    secretaria_orgao,
    setor,
    limite_autorizado,
    documento_referencia,
    observacao,
    status,
    criada_em,
    encerrada_em
)
SELECT
    numero_controle,
    secretaria_orgao,
    setor,
    limite_autorizado,
    documento_referencia,
    observacao,
    CASE WHEN ativa = TRUE THEN 'OCUPADA' ELSE 'LIVRE' END,
    COALESCE(criada_em, NOW()),
    CASE WHEN ativa = TRUE THEN NULL ELSE encerrada_em END
FROM controle_alocacoes
ON CONFLICT (numero_controle) DO NOTHING;

UPDATE controle_alocacoes alocacao
SET vaga_administrativa_id = vaga.id
FROM controle_vagas_administrativas vaga
WHERE vaga.numero_controle = alocacao.numero_controle
  AND alocacao.vaga_administrativa_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_controle_alocacoes_vaga_administrativa'
    ) THEN
        ALTER TABLE controle_alocacoes
            ADD CONSTRAINT fk_controle_alocacoes_vaga_administrativa
            FOREIGN KEY (vaga_administrativa_id)
            REFERENCES controle_vagas_administrativas(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_controle_alocacoes_vaga
    ON controle_alocacoes (vaga_administrativa_id);

CREATE INDEX IF NOT EXISTS idx_controle_vagas_orgao_setor
    ON controle_vagas_administrativas (secretaria_orgao, setor);

CREATE INDEX IF NOT EXISTS idx_controle_vagas_status
    ON controle_vagas_administrativas (status);
