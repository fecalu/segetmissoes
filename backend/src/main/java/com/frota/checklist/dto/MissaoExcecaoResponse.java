package com.frota.checklist.dto;

import com.frota.checklist.entity.MotivoExcecaoMissao;
import com.frota.checklist.entity.StatusExcecaoMissao;

import java.time.LocalDateTime;

public record MissaoExcecaoResponse(
        Long id,
        StatusExcecaoMissao status,
        String statusRegularizacao,
        LocalDateTime dataHoraAbertura,
        LocalDateTime prazoRegularizacao,
        LocalDateTime dataHoraRegularizacao,
        boolean atrasada,
        long minutosEmAberto,
        Long motoristaId,
        String motoristaNome,
        Long veiculoId,
        String veiculoPlaca,
        MotivoExcecaoMissao motivo,
        String justificativa,
        String justificativaEncerramentoAdmin,
        Long administradorId,
        String administradorNome,
        Long checklistRegularizacaoId,
        String ipOrigem,
        String dispositivo,
        String localizacao
) {
}
