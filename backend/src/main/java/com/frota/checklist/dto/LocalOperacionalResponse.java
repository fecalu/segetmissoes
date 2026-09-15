package com.frota.checklist.dto;

public record LocalOperacionalResponse(
        Long id,
        String nome,
        String cor,
        Integer ordemExibicao,
        boolean ativo
) {
}
