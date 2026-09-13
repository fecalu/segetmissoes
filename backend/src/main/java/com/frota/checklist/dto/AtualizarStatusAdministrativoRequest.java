package com.frota.checklist.dto;

import com.frota.checklist.entity.StatusVeiculo;

public record AtualizarStatusAdministrativoRequest(
        StatusVeiculo statusAdministrativo,
        @jakarta.validation.constraints.Size(max = 700) String justificativa
) {
}
