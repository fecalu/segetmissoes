package com.frota.checklist.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SchemaCompatibilityInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        atualizarConstraintsStatusVeiculo();
        atualizarConstraintsHistoricoStatusVeiculo();
        atualizarConstraintsConfigRotuloStatusVeiculo();
        atualizarConstraintsConfigSugestaoMissao();
        atualizarConstraintsMissaoExcecao();
        atualizarConstraintsMissoes();
        atualizarConstraintsAuditoriaMissao();
    }

    private void atualizarConstraintsStatusVeiculo() {
        executarSilencioso("alter table veiculos drop constraint if exists veiculos_status_check");
        executarSilencioso("""
                alter table veiculos
                add constraint veiculos_status_check
                check (status in (
                    'CIRCULANDO',
                    'BASE_JOAO_GOULART',
                    'NO_PATIO',
                    'AGUARDANDO_REALOCACAO',
                    'OFICINA',
                    'EM_VIAGEM',
                    'MANUTENCAO',
                    'BLOQUEADO',
                    'ATIVO',
                    'INATIVO'
                ))
                """);
    }

    private void atualizarConstraintsHistoricoStatusVeiculo() {
        executarSilencioso("alter table historico_status_veiculo drop constraint if exists historico_status_veiculo_status_anterior_check");
        executarSilencioso("alter table historico_status_veiculo drop constraint if exists historico_status_veiculo_status_novo_check");

        String allowed = """
                ('CIRCULANDO','BASE_JOAO_GOULART','NO_PATIO','AGUARDANDO_REALOCACAO','OFICINA','EM_VIAGEM','MANUTENCAO','BLOQUEADO','ATIVO','INATIVO')
                """;
        executarSilencioso("""
                alter table historico_status_veiculo
                add constraint historico_status_veiculo_status_anterior_check
                check (status_anterior in
                """ + allowed + ")");
        executarSilencioso("""
                alter table historico_status_veiculo
                add constraint historico_status_veiculo_status_novo_check
                check (status_novo in
                """ + allowed + ")");
    }

    private void atualizarConstraintsConfigRotuloStatusVeiculo() {
        executarSilencioso("alter table config_rotulo_status_veiculo drop constraint if exists config_rotulo_status_veiculo_status_check");
        executarSilencioso("""
                alter table config_rotulo_status_veiculo
                add constraint config_rotulo_status_veiculo_status_check
                check (status in (
                    'CIRCULANDO',
                    'BASE_JOAO_GOULART',
                    'NO_PATIO',
                    'AGUARDANDO_REALOCACAO',
                    'OFICINA',
                    'EM_VIAGEM',
                    'MANUTENCAO',
                    'BLOQUEADO',
                    'ATIVO',
                    'INATIVO'
                ))
                """);
    }

    private void atualizarConstraintsConfigSugestaoMissao() {
        executarSilencioso("alter table config_sugestao_missao drop constraint if exists config_sugestao_missao_campo_check");
        executarSilencioso("""
                alter table config_sugestao_missao
                add constraint config_sugestao_missao_campo_check
                check (campo in (
                    'DESTINO',
                    'SETOR_SOLICITANTE',
                    'SOLICITANTE',
                    'JUSTIFICATIVA_REGISTRO_MANUAL'
                ))
                """);
    }

    private void atualizarConstraintsMissaoExcecao() {
        executarSilencioso("alter table missoes_excecao drop constraint if exists missoes_excecao_status_check");
        executarSilencioso("""
                alter table missoes_excecao
                add constraint missoes_excecao_status_check
                check (status in (
                    'EXCECAO_ABERTA',
                    'ATRASADA',
                    'REGULARIZADA_POR_CHECKLIST',
                    'REGULARIZADA_SEM_CHECKLIST',
                    'ENCERRADA_ADMIN'
                ))
                """);
    }

    private void atualizarConstraintsMissoes() {
        executarSilencioso("alter table missoes drop constraint if exists missoes_status_check");
        executarSilencioso("alter table missoes drop constraint if exists missoes_origem_abertura_check");
        executarSilencioso("alter table missoes drop constraint if exists missoes_origem_encerramento_check");
        executarSilencioso("alter table missoes drop constraint if exists missoes_status_documental_check");
        executarSilencioso("alter table missoes drop constraint if exists missoes_motivo_contingencia_check");

        executarSilencioso("""
                alter table missoes
                add constraint missoes_status_check
                check (status in (
                    'ATIVA',
                    'FINALIZADA'
                ))
                """);

        executarSilencioso("""
                alter table missoes
                add constraint missoes_origem_abertura_check
                check (origem_abertura in (
                    'CHECKLIST',
                    'SEM_CHECKLIST',
                    'CONTINGENCIA_ADMIN'
                ))
                """);

        executarSilencioso("""
                alter table missoes
                add constraint missoes_origem_encerramento_check
                check (origem_encerramento in (
                    'CHECKLIST',
                    'SEM_CHECKLIST',
                    'ADMINISTRATIVO'
                ))
                """);

        executarSilencioso("""
                alter table missoes
                add constraint missoes_status_documental_check
                check (status_documental in (
                    'PENDENTE_DADOS_ADMIN',
                    'DADOS_ADMIN_COMPLETOS'
                ))
                """);

        executarSilencioso("""
                alter table missoes
                add constraint missoes_motivo_contingencia_check
                check (motivo_contingencia in (
                    'CHUVA_FORTE',
                    'TROCA_RAPIDA_VEICULO',
                    'URGENCIA_OPERACIONAL',
                    'SEM_TEMPO_OPERACIONAL',
                    'FALHA_CAMERA',
                    'SEM_INTERNET',
                    'SEM_CELULAR',
                    'BATERIA_DESCARREGADA',
                    'APP_INDISPONIVEL',
                    'OUTROS'
                ))
                """);
    }

    private void atualizarConstraintsAuditoriaMissao() {
        executarSilencioso("alter table auditoria_missoes drop constraint if exists auditoria_missoes_acao_check");
        executarSilencioso("""
                alter table auditoria_missoes
                add constraint auditoria_missoes_acao_check
                check (acao in (
                    'ABERTURA_CHECKLIST',
                    'ABERTURA_SEM_CHECKLIST',
                    'ABERTURA_CONTINGENCIA_ADMIN',
                    'ABERTURA_LEGADO_RECONSTRUIDA',
                    'ENCERRAMENTO_CHECKLIST',
                    'ENCERRAMENTO_SEM_CHECKLIST',
                    'ENCERRAMENTO_PENDENTE_ADMIN',
                    'ENCERRAMENTO_ADMINISTRATIVO',
                    'ATUALIZACAO_DADOS_ADMINISTRATIVOS'
                ))
                """);
    }

    private void executarSilencioso(String sql) {
        try {
            jdbcTemplate.execute(sql);
        } catch (Exception ex) {
            log.warn("Nao foi possivel executar ajuste de schema: {}", ex.getMessage());
        }
    }
}
