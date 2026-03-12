package com.frota.checklist.dto;

import com.frota.checklist.entity.StatusVeiculo;

import java.time.LocalDateTime;

public record VeiculoResponse(
        Long id,
        String placa,
        String modelo,
        String marca,
        Boolean desativado,
        StatusVeiculo statusAtual,
        StatusVeiculo statusAutomatico,
        StatusVeiculo statusAdministrativo,
        Long motoristaAtualId,
        String motoristaAtualNome,
        String statusAtualRotulo,
        String statusAutomaticoRotulo,
        String statusAdministrativoRotulo,
        Long viagemId,
        Long viagemMotoristaId,
        String viagemMotoristaNome,
        String viagemLocalDestino,
        String viagemObservacao,
        LocalDateTime viagemDataHoraSaida
) {
}
