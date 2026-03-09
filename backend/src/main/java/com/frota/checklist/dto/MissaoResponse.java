package com.frota.checklist.dto;

import com.frota.checklist.entity.OrigemAberturaMissao;
import com.frota.checklist.entity.OrigemEncerramentoMissao;
import com.frota.checklist.entity.StatusDocumentalMissao;
import com.frota.checklist.entity.StatusMissao;

import java.time.LocalDateTime;

public record MissaoResponse(
        Long id,
        StatusMissao status,
        StatusDocumentalMissao statusDocumental,
        LocalDateTime dataHoraInicio,
        LocalDateTime dataHoraFim,
        long duracaoSegundos,
        OrigemAberturaMissao origemAbertura,
        OrigemEncerramentoMissao origemEncerramento,
        Long motoristaId,
        String motoristaNome,
        Long veiculoId,
        String veiculoPlaca,
        String veiculoMarca,
        String veiculoModelo,
        Long checklistSaidaId,
        Long checklistChegadaId,
        Long missaoExcecaoId,
        Long administradorEncerramentoId,
        String administradorEncerramentoNome,
        String localDestino,
        String setorSolicitante,
        String solicitanteNome
) {
}
