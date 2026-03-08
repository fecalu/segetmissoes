package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EncerrarMissaoExcecaoRequest(
        @NotBlank @Size(min = 10, max = 700) String justificativaEncerramento
) {
}
