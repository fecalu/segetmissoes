package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AtualizarVagaAdministrativaRequest(
        @NotBlank @Size(max = 160) String secretariaOrgao,
        @NotBlank @Size(max = 160) String setor,
        @NotBlank @Size(max = 60) String limiteAutorizado,
        @Size(max = 180) String documentoReferencia,
        @Size(max = 500) String observacao
) {
}
