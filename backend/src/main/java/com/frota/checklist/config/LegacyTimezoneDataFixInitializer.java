package com.frota.checklist.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class LegacyTimezoneDataFixInitializer implements CommandLineRunner {

    private static final String MIGRATION_KEY = "legacy_timezone_fix_v1";

    private final JdbcTemplate jdbcTemplate;
    private final PlatformTransactionManager transactionManager;

    @Value("${app.legacy-time-fix.enabled:false}")
    private boolean enabled;

    @Value("${app.legacy-time-fix.hours-offset:-3}")
    private int hoursOffset;

    @Override
    public void run(String... args) {
        if (!enabled) {
            return;
        }

        if (hoursOffset < -12 || hoursOffset > 12) {
            log.warn("Legacy timezone fix ignorado: offset invalido {} (esperado entre -12 e 12)", hoursOffset);
            return;
        }

        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.executeWithoutResult(status -> {
            criarTabelaControleSeNecessario();
            if (jaExecutado()) {
                log.info("Legacy timezone fix ja executado anteriormente. Nenhuma acao necessaria.");
                return;
            }

            List<String> operacoes = new ArrayList<>();
            operacoes.add(aplicarShift("checklists", "data_hora"));
            operacoes.add(aplicarShift("missoes_excecao", "data_hora_abertura"));
            operacoes.add(aplicarShift("missoes_excecao", "prazo_regularizacao"));
            operacoes.add(aplicarShift("missoes_excecao", "data_hora_regularizacao"));
            operacoes.add(aplicarShift("historico_status_veiculo", "data_hora"));
            operacoes.add(aplicarShift("auditoria_exclusao_veiculo", "data_hora"));
            operacoes.add(aplicarShift("veiculos", "data_hora_ultimo_encerramento_sem_checklist"));

            registrarExecucao();
            log.info("Legacy timezone fix aplicado com offset {}h. Detalhes: {}", hoursOffset, String.join(", ", operacoes));
        });
    }

    private void criarTabelaControleSeNecessario() {
        jdbcTemplate.execute("""
                create table if not exists app_migration_control (
                    migration_key varchar(120) primary key,
                    executed_at timestamp not null default now()
                )
                """);
    }

    private boolean jaExecutado() {
        Integer total = jdbcTemplate.queryForObject(
                "select count(*) from app_migration_control where migration_key = ?",
                Integer.class,
                MIGRATION_KEY
        );
        return total != null && total > 0;
    }

    private void registrarExecucao() {
        jdbcTemplate.update(
                "insert into app_migration_control (migration_key, executed_at) values (?, now())",
                MIGRATION_KEY
        );
    }

    private String aplicarShift(String table, String column) {
        if (!tabelaExiste(table) || !colunaExiste(table, column)) {
            return table + "." + column + "=skip";
        }

        String intervalExpression = "interval '" + hoursOffset + " hour'";
        int updated = jdbcTemplate.update(
                "update " + table + " set " + column + " = " + column + " + " + intervalExpression
        );
        return table + "." + column + "=" + updated;
    }

    private boolean tabelaExiste(String table) {
        Integer total = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from information_schema.tables
                        where table_schema = 'public' and table_name = ?
                        """,
                Integer.class,
                table
        );
        return total != null && total > 0;
    }

    private boolean colunaExiste(String table, String column) {
        Integer total = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from information_schema.columns
                        where table_schema = 'public'
                          and table_name = ?
                          and column_name = ?
                        """,
                Integer.class,
                table,
                column
        );
        return total != null && total > 0;
    }
}
