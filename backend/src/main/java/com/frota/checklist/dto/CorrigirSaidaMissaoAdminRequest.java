package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CorrigirSaidaMissaoAdminRequest(
        @NotNull
        Long motoristaId,

        @NotNull
        Long veiculoId,

        @NotBlank
        @Size(min = 4, max = 700)
        String justificativa,

        Boolean confirmarTroca
) {
}
