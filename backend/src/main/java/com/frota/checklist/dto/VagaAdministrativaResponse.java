package com.frota.checklist.dto;

import com.frota.checklist.entity.StatusVagaAdministrativa;

import java.time.LocalDateTime;

public record VagaAdministrativaResponse(
        Long id,
        Integer numeroControle,
        String secretariaOrgao,
        String setor,
        String limiteAutorizado,
        String documentoReferencia,
        String observacao,
        StatusVagaAdministrativa status,
        LocalDateTime criadaEm,
        LocalDateTime encerradaEm,
        Long alocacaoAtivaId,
        String placaAtual,
        String modeloAtual,
        String responsavelAtual
) {
}
