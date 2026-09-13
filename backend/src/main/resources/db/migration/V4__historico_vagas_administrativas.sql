CREATE TABLE IF NOT EXISTS controle_vagas_administrativas_historicos (
    id BIGSERIAL PRIMARY KEY,
    vaga_administrativa_id BIGINT NOT NULL REFERENCES controle_vagas_administrativas(id),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('CRIACAO', 'ATUALIZACAO_DADOS', 'OCUPACAO', 'LIBERACAO', 'DESATIVACAO', 'REATIVACAO')),
    placa_anterior VARCHAR(10),
    placa_nova VARCHAR(10),
    responsavel_anterior VARCHAR(160),
    responsavel_novo VARCHAR(160),
    dados_anteriores VARCHAR(600),
    dados_novos VARCHAR(600),
    observacao VARCHAR(500),
    data_hora TIMESTAMP NOT NULL,
    administrador_id BIGINT REFERENCES motoristas(id)
);

CREATE INDEX IF NOT EXISTS idx_controle_vagas_historicos_vaga_data
    ON controle_vagas_administrativas_historicos(vaga_administrativa_id, data_hora DESC);

INSERT INTO controle_vagas_administrativas_historicos (
    vaga_administrativa_id,
    tipo,
    dados_novos,
    observacao,
    data_hora
)
SELECT
    vaga.id,
    'CRIACAO',
    CONCAT(vaga.secretaria_orgao, '|', vaga.setor, '|', vaga.limite_autorizado, '|', COALESCE(vaga.documento_referencia, ''), '|', COALESCE(vaga.observacao, '')),
    'Histórico inicial criado automaticamente a partir dos dados existentes.',
    COALESCE(vaga.criada_em, NOW())
FROM controle_vagas_administrativas vaga
WHERE NOT EXISTS (
    SELECT 1
    FROM controle_vagas_administrativas_historicos historico
    WHERE historico.vaga_administrativa_id = vaga.id
      AND historico.tipo = 'CRIACAO'
);

INSERT INTO controle_vagas_administrativas_historicos (
    vaga_administrativa_id,
    tipo,
    placa_nova,
    responsavel_novo,
    observacao,
    data_hora
)
SELECT
    alocacao.vaga_administrativa_id,
    'OCUPACAO',
    alocacao.placa,
    alocacao.responsavel_nome,
    'Ocupação inicial criada automaticamente a partir da alocação existente.',
    COALESCE(alocacao.criada_em, NOW())
FROM controle_alocacoes alocacao
WHERE alocacao.vaga_administrativa_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM controle_vagas_administrativas_historicos historico
      WHERE historico.vaga_administrativa_id = alocacao.vaga_administrativa_id
        AND historico.tipo = 'OCUPACAO'
        AND historico.placa_nova = alocacao.placa
  );
