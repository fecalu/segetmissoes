package com.frota.checklist.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CorrigirMotoristaMissaoFinalizadaRequest(
        @NotNull Long motoristaId,
        @NotBlank @Size(min = 10, max = 700) String justificativa
) {
}
