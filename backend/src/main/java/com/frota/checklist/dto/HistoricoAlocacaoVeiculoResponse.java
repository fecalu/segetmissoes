package com.frota.checklist.dto;

import com.frota.checklist.entity.TipoEventoAlocacaoVeiculo;

import java.time.LocalDateTime;

public record HistoricoAlocacaoVeiculoResponse(
        Long id,
        TipoEventoAlocacaoVeiculo tipo,
        String veiculoAnteriorPlaca,
        String veiculoNovoPlaca,
        String responsavelAnterior,
        String responsavelNovo,
        String limiteAnterior,
        String limiteNovo,
        String observacao,
        LocalDateTime dataHora,
        String administradorNome
) {
}
