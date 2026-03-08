package com.frota.checklist.dto;

import java.time.LocalDate;
import java.util.List;

public record EstatisticasMissoesResponse(
        LocalDate dataInicial,
        LocalDate dataFinal,
        long totalMissoes,
        double totalHorasMissao,
        List<MissaoMotoristaStatsResponse> rankingPorMissoes,
        List<MissaoMotoristaStatsResponse> rankingPorTempo
) {
}
