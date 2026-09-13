package com.frota.checklist.dto;

import com.frota.checklist.entity.TipoEventoVagaAdministrativa;

import java.time.LocalDateTime;

public record HistoricoVagaAdministrativaResponse(
        Long id,
        TipoEventoVagaAdministrativa tipo,
        String placaAnterior,
        String placaNova,
        String responsavelAnterior,
        String responsavelNovo,
        String dadosAnteriores,
        String dadosNovos,
        String observacao,
        LocalDateTime dataHora,
        String administradorNome
) {
}
