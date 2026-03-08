package com.frota.checklist.dto;

import com.frota.checklist.entity.MotivoExcecaoMissao;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record IniciarMissaoExcecaoRequest(
        @NotNull Long veiculoId,
        @NotNull MotivoExcecaoMissao motivo,
        @Size(max = 700) String justificativa,
        boolean aceiteResponsabilidade,
        @Size(max = 140) String localizacao
) {
}
