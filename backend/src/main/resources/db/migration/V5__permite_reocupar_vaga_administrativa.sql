DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT c.conname
      INTO constraint_name
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public'
       AND t.relname = 'controle_alocacoes'
       AND c.contype = 'u'
       AND pg_get_constraintdef(c.oid) = 'UNIQUE (numero_controle)'
     LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE controle_alocacoes DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_controle_alocacoes_numero_controle
    ON controle_alocacoes(numero_controle);
