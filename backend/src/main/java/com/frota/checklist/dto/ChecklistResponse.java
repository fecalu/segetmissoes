package com.frota.checklist.dto;

import com.frota.checklist.entity.TipoOperacao;

import java.time.LocalDateTime;
import java.util.List;

public record ChecklistResponse(
        Long id,
        LocalDateTime dataHora,
        TipoOperacao tipoOperacao,
        Long quilometragem,
        Long motoristaId,
        String motoristaNome,
        Long veiculoId,
        String veiculoPlaca,
        List<FotoResponse> fotos
) {
}
