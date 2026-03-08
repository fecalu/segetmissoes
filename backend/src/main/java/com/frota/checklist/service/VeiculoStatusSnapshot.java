package com.frota.checklist.service;

import com.frota.checklist.entity.StatusVeiculo;

public record VeiculoStatusSnapshot(
        StatusVeiculo statusAutomatico,
        StatusVeiculo statusAdministrativo,
        StatusVeiculo statusAtual,
        Long motoristaAtualId,
        String motoristaAtualNome
) {
}
