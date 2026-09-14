package com.frota.checklist.entity;

import com.frota.checklist.security.Permissao;
import java.util.Set;
import java.util.EnumSet;

public enum Perfil {
    ADMIN,
    GESTOR,
    OPERADOR,
    VISUALIZADOR,
    MOTORISTA;

    public Set<Permissao> permissoes() {
        return switch (this) {
            case ADMIN -> Set.copyOf(EnumSet.allOf(Permissao.class));
            case GESTOR -> Set.of(Permissao.FROTA_CONSULTAR, Permissao.FROTA_OPERAR,
                    Permissao.VEICULO_GERIR, Permissao.VEICULO_LIBERAR, Permissao.MISSAO_REGISTRAR,
                    Permissao.MISSAO_COMPLEMENTAR, Permissao.MISSAO_CORRIGIR, Permissao.MISSAO_ENCERRAR_EXCECAO,
                    Permissao.VISTORIA_CONSULTAR, Permissao.VISTORIA_CORRIGIR, Permissao.MOTORISTA_GERIR,
                    Permissao.ALOCACAO_CONSULTAR, Permissao.ALOCACAO_GERIR,
                    Permissao.RELATORIO_EXPORTAR, Permissao.ESTATISTICA_CONSULTAR);
            case OPERADOR -> Set.of(Permissao.FROTA_CONSULTAR, Permissao.FROTA_OPERAR,
                    Permissao.MISSAO_REGISTRAR, Permissao.MISSAO_COMPLEMENTAR,
                    Permissao.VISTORIA_CONSULTAR, Permissao.ALOCACAO_CONSULTAR, Permissao.RELATORIO_EXPORTAR);
            case VISUALIZADOR -> Set.of(Permissao.FROTA_CONSULTAR, Permissao.VISTORIA_CONSULTAR,
                    Permissao.ALOCACAO_CONSULTAR, Permissao.RELATORIO_EXPORTAR,
                    Permissao.ESTATISTICA_CONSULTAR);
            case MOTORISTA -> Set.of();
        };
    }
}
