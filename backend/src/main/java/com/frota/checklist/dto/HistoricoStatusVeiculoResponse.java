package com.frota.checklist.dto;

import com.frota.checklist.entity.StatusVeiculo;

import java.time.LocalDateTime;

public record HistoricoStatusVeiculoResponse(
        Long id,
        Long veiculoId,
        String veiculoPlaca,
        StatusVeiculo statusAnterior,
        StatusVeiculo statusNovo,
        Long administradorId,
        String administradorNome,
        LocalDateTime dataHora
) {
}
