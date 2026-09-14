ALTER TABLE motoristas ALTER COLUMN cpf DROP NOT NULL;

ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS deve_alterar_senha boolean NOT NULL DEFAULT false;
ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS cadastro_completo boolean NOT NULL DEFAULT true;

UPDATE motoristas
SET cadastro_completo = false
WHERE cpf IS NULL OR btrim(cpf) = '';
