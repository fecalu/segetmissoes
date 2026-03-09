package com.frota.checklist.dto;

import com.frota.checklist.entity.MotivoExcecaoMissao;
import jakarta.validation.constraints.NotNull;

public record IniciarMissaoExcecaoRequest(
        @NotNull Long veiculoId,
        @NotNull MotivoExcecaoMissao motivo,
        boolean aceiteResponsabilidade
) {
}
