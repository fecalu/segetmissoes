package com.frota.checklist.dto;

import com.frota.checklist.entity.StatusVeiculo;

public record AtualizarStatusAdministrativoRequest(
        StatusVeiculo statusAdministrativo
) {
}
