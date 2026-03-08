package com.frota.checklist.entity;

import java.util.List;

public enum StatusExcecaoMissao {
    EXCECAO_ABERTA,
    ATRASADA,
    REGULARIZADA_POR_CHECKLIST,
    REGULARIZADA_SEM_CHECKLIST,
    ENCERRADA_ADMIN;

    public boolean isAberta() {
        return this == EXCECAO_ABERTA || this == ATRASADA;
    }

    public static List<StatusExcecaoMissao> abertas() {
        return List.of(EXCECAO_ABERTA, ATRASADA);
    }
}
