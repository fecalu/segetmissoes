package com.frota.checklist.dto;

import com.frota.checklist.entity.MotivoExcecaoMissao;
import com.frota.checklist.entity.OrigemAberturaMissao;
import com.frota.checklist.entity.OrigemEncerramentoMissao;
import com.frota.checklist.entity.ResultadoVistoriaCompleta;
import com.frota.checklist.entity.StatusDocumentalMissao;
import com.frota.checklist.entity.StatusExcecaoMissao;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.TipoOperacao;

import java.time.LocalDateTime;
import java.util.List;

public record HistoricoVeiculoResponse(
        Long veiculoId,
        String placa,
        String marca,
        String modelo,
        StatusVeiculo statusAtual,
        String statusAtualRotulo,
        String motoristaAtualNome,
        LocalDateTime ultimaMovimentacaoEm,
        Resumo resumo,
        List<Evento> eventos
) {
    public record Resumo(
            int totalEventos,
            int totalMissoes,
            int totalChecklists,
            int totalExcecoes,
            int totalVistoriasCompletas,
            int totalUsosExternos,
            int totalIdasOficina,
            LocalDateTime ultimaMissaoEm,
            LocalDateTime ultimaVistoriaEm
    ) {}

    public record Evento(
            String idExibicao,
            TipoEventoHistoricoVeiculo tipo,
            LocalDateTime dataHora,
            String titulo,
            String descricao,
            String motoristaNome,
            String responsavelNome,
            boolean possuiFotos,
            int quantidadeFotos,
            boolean possuiAvarias,
            int quantidadeAvarias,
            Long missaoId,
            Long checklistId,
            Long missaoExcecaoId,
            Long vistoriaCompletaId,
            Long historicoStatusId,
            Detalhe detalhe
    ) {}

    public record Detalhe(
            TipoOperacao tipoOperacao,
            OrigemAberturaMissao origemAberturaMissao,
            OrigemEncerramentoMissao origemEncerramentoMissao,
            StatusDocumentalMissao statusDocumentalMissao,
            StatusExcecaoMissao statusExcecaoMissao,
            ResultadoVistoriaCompleta resultadoVistoria,
            MotivoExcecaoMissao motivoExcecao,
            String localDestino,
            String setorSolicitante,
            String solicitanteNome,
            String justificativa,
            String justificativaEncerramento,
            String nomeContraparte,
            Long quilometragem,
            String localizacao,
            String observacaoGeral,
            StatusVeiculo statusAnterior,
            StatusVeiculo statusNovo
    ) {}
}
