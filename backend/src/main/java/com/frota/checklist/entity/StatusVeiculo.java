package com.frota.checklist.entity;

public enum StatusVeiculo {
    CIRCULANDO,
    BASE_JOAO_GOULART,
    NO_PATIO,
    OFICINA,
    EM_VIAGEM,
    MANUTENCAO,
    BLOQUEADO,

    // Legado (mantidos para compatibilidade de dados antigos)
    ATIVO,
    INATIVO;

    public boolean isAdministrativo() {
        return this == NO_PATIO || this == OFICINA || this == EM_VIAGEM || this == MANUTENCAO || this == BLOQUEADO;
    }

    public boolean isBloqueanteMissao() {
        return isAdministrativo();
    }

    public static StatusVeiculo normalizarStatusAdministrativo(StatusVeiculo status) {
        if (status == null || status == ATIVO || status == CIRCULANDO || status == BASE_JOAO_GOULART) {
            return null;
        }
        if (status == INATIVO) {
            return BLOQUEADO;
        }
        return status.isAdministrativo() ? status : null;
    }
}
