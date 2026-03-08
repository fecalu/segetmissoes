package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ExclusaoDefinitivaVeiculoRequest(
        @NotBlank @Size(min = 6, max = 120) String senhaAdmin,
        @NotBlank @Size(min = 10, max = 700) String justificativa
) {
}
