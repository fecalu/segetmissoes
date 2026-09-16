package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DesfazerMissaoAdminRequest(
        @NotBlank
        @Size(min = 4, max = 700)
        String justificativa
) {
}
