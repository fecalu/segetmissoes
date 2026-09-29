ALTER TABLE motoristas
    ADD COLUMN IF NOT EXISTS motorista_operacional boolean NOT NULL DEFAULT false;

UPDATE motoristas
SET motorista_operacional = true
WHERE perfil = 'MOTORISTA';
