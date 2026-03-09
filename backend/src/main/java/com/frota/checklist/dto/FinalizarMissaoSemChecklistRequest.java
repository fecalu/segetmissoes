package com.frota.checklist.dto;

import com.frota.checklist.entity.MotivoExcecaoMissao;
import jakarta.validation.constraints.NotNull;

public record FinalizarMissaoSemChecklistRequest(
        @NotNull Long veiculoId,
        @NotNull MotivoExcecaoMissao motivo,
        boolean aceiteResponsabilidade
) {
}
