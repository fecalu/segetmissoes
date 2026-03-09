package com.frota.checklist.dto;

import com.frota.checklist.entity.StatusVeiculo;

public record RotuloStatusVeiculoResponse(
        StatusVeiculo status,
        String rotulo,
        String rotuloPadrao,
        boolean personalizado
) {
}
