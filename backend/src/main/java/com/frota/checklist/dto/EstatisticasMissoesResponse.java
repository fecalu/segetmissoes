package com.frota.checklist.dto;

import java.time.LocalDate;
import java.util.List;

public record EstatisticasMissoesResponse(
        LocalDate dataInicial,
        LocalDate dataFinal,
        long totalMissoes,
        double totalHorasMissao,
        long totalMissoesUrbanas,
        double totalHorasMissaoUrbana,
        long totalViagens,
        double totalHorasViagem,
        List<MissaoMotoristaStatsResponse> rankingPorMissoes,
        List<MissaoMotoristaStatsResponse> rankingPorTempo,
        EstatisticasGrupoMissoesResponse missoesUrbanas,
        EstatisticasGrupoMissoesResponse viagens
) {
}
