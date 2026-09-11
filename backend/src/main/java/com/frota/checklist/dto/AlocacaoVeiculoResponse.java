package com.frota.checklist.dto;

import java.time.LocalDateTime;

public record AlocacaoVeiculoResponse(
        Long id,
        Integer numeroControle,
        String placa,
        String modelo,
        String marca,
        String responsavelNome,
        String secretariaOrgao,
        String setor,
        String limiteAutorizado,
        String documentoReferencia,
        String linkConsulta,
        String observacao,
        Boolean ativa,
        LocalDateTime criadaEm,
        LocalDateTime encerradaEm
) {
}
