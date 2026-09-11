-- Support both existing installations and a new database before Hibernate creates its tables.
DO $$
DECLARE regra record;
BEGIN
    IF to_regclass('public.motoristas') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM motoristas WHERE perfil IS NULL
                   OR perfil NOT IN ('ADMIN', 'GESTOR', 'OPERADOR', 'MOTORISTA')) THEN
            RAISE EXCEPTION 'Existem contas com perfil invalido. Revise os dados antes de migrar.';
        END IF;
        FOR regra IN SELECT conname FROM pg_constraint
                     WHERE conrelid = 'public.motoristas'::regclass AND contype = 'c'
                     AND pg_get_constraintdef(oid) ~ '\mperfil\M'
        LOOP
            EXECUTE format('ALTER TABLE motoristas DROP CONSTRAINT %I', regra.conname);
        END LOOP;
        ALTER TABLE motoristas ADD CONSTRAINT motoristas_perfil_check
            CHECK (perfil IN ('ADMIN', 'GESTOR', 'OPERADOR', 'MOTORISTA'));
        ALTER TABLE motoristas ALTER COLUMN perfil SET NOT NULL;
        ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS acesso_habilitado boolean NOT NULL DEFAULT true;
        ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS versao_acesso bigint NOT NULL DEFAULT 0;
    END IF;
END $$;
