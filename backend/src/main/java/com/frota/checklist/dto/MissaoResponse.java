package com.frota.checklist.dto;

import com.frota.checklist.entity.OrigemAberturaMissao;
import com.frota.checklist.entity.OrigemEncerramentoMissao;
import com.frota.checklist.entity.MotivoExcecaoMissao;
import com.frota.checklist.entity.StatusDocumentalMissao;
import com.frota.checklist.entity.StatusMissao;
import com.frota.checklist.entity.TipoDeslocamentoMissao;

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
        TipoDeslocamentoMissao tipoDeslocamento,
        Long motoristaId,
        String motoristaNome,
        Long veiculoId,
        String veiculoPlaca,
        String veiculoMarca,
        String veiculoModelo,
        Long checklistSaidaId,
        Long checklistChegadaId,
        Long missaoExcecaoId,
        Long administradorAberturaId,
        String administradorAberturaNome,
        Long administradorEncerramentoId,
        String administradorEncerramentoNome,
        MotivoExcecaoMissao motivoContingencia,
        String justificativaContingenciaAbertura,
        String justificativaContingenciaEncerramento,
        String localDestino,
        String setorSolicitante,
        String solicitanteNome
) {
}
