package com.frota.checklist.dto;

import com.frota.checklist.entity.StatusVeiculo;

public record VeiculoResponse(
        Long id,
        String placa,
        String modelo,
        String marca,
        StatusVeiculo status
) {
}
