DO $$
DECLARE regra record;
BEGIN
    IF to_regclass('public.motoristas') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM motoristas WHERE perfil IS NULL
                   OR perfil NOT IN ('ADMIN', 'GESTOR', 'OPERADOR', 'VISUALIZADOR', 'MOTORISTA')) THEN
            RAISE EXCEPTION 'Existem contas com perfil invalido. Revise os dados antes de migrar.';
        END IF;
        FOR regra IN SELECT conname FROM pg_constraint
                     WHERE conrelid = 'public.motoristas'::regclass AND contype = 'c'
                     AND pg_get_constraintdef(oid) ~ '\mperfil\M'
        LOOP
            EXECUTE format('ALTER TABLE motoristas DROP CONSTRAINT %I', regra.conname);
        END LOOP;
        ALTER TABLE motoristas ADD CONSTRAINT motoristas_perfil_check
            CHECK (perfil IN ('ADMIN', 'GESTOR', 'OPERADOR', 'VISUALIZADOR', 'MOTORISTA'));
    END IF;
END $$;
