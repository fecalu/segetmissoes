package com.frota.checklist.dto;

import com.frota.checklist.entity.TipoDeslocamentoMissao;

import java.util.List;

public record EstatisticasGrupoMissoesResponse(
        TipoDeslocamentoMissao tipoDeslocamento,
        String titulo,
        long totalMissoes,
        double totalHorasMissao,
        List<MissaoMotoristaStatsResponse> rankingPorMissoes,
        List<MissaoMotoristaStatsResponse> rankingPorTempo
) {
}
