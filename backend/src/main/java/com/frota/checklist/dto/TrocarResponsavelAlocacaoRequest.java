package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TrocarResponsavelAlocacaoRequest(
        @NotBlank @Size(max = 160) String responsavelNome,
        @NotBlank @Size(max = 500) String motivo
) {
}
