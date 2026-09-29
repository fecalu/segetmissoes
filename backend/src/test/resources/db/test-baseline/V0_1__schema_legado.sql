-- Legacy tables existed before Flyway. Recreate their prerequisites only in
-- the isolated integration database so all production migrations are tested.
CREATE TABLE IF NOT EXISTS motoristas (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    login VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    perfil VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS veiculos (
    id BIGSERIAL PRIMARY KEY,
    placa VARCHAR(10) NOT NULL UNIQUE,
    marca VARCHAR(255) NOT NULL,
    modelo VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS controle_alocacoes (
    id BIGSERIAL PRIMARY KEY,
    numero_controle INTEGER NOT NULL UNIQUE,
    placa VARCHAR(10) NOT NULL,
    modelo VARCHAR(180) NOT NULL,
    marca VARCHAR(120),
    responsavel_nome VARCHAR(160) NOT NULL,
    secretaria_orgao VARCHAR(160) NOT NULL,
    setor VARCHAR(160) NOT NULL,
    limite_autorizado VARCHAR(60) NOT NULL,
    documento_referencia VARCHAR(180),
    link_consulta VARCHAR(500),
    observacao VARCHAR(500),
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    criada_em TIMESTAMP NOT NULL,
    encerrada_em TIMESTAMP
);
