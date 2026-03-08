package com.frota.checklist.dto;

public record MissaoMotoristaStatsResponse(
        Long motoristaId,
        String motoristaNome,
        long quantidadeMissoes,
        long tempoTotalSegundos,
        double tempoTotalHoras
) {
}
