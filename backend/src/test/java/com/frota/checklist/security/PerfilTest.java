package com.frota.checklist.security;

import com.frota.checklist.entity.Perfil;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class PerfilTest {
    @Test void administradorMantemTodasAsPermissoes() {
        assertThat(Perfil.ADMIN.permissoes()).containsExactlyInAnyOrder(Permissao.values());
    }
    @Test void gestorNaoAdministraAcessosConfiguracoesOuExclusoes() {
        assertThat(Perfil.GESTOR.permissoes()).contains(Permissao.MISSAO_CORRIGIR, Permissao.VEICULO_LIBERAR)
                .doesNotContain(Permissao.ACESSO_GERIR, Permissao.CONFIGURACAO_GERIR, Permissao.CADASTRO_EXCLUIR);
    }
    @Test void operadorNaoHerdaPermissoesDeGestao() {
        assertThat(Perfil.OPERADOR.permissoes()).contains(Permissao.MISSAO_REGISTRAR, Permissao.RELATORIO_EXPORTAR)
                .doesNotContain(Permissao.MISSAO_CORRIGIR, Permissao.MISSAO_ENCERRAR_EXCECAO,
                        Permissao.VEICULO_LIBERAR, Permissao.ALOCACAO_GERIR, Permissao.MOTORISTA_GERIR);
        assertThat(Perfil.MOTORISTA.permissoes()).isEmpty();
        assertThatThrownBy(() -> Perfil.OPERADOR.permissoes().add(Permissao.ACESSO_GERIR))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test void visualizadorSomenteConsultaEExporta() {
        assertThat(Perfil.VISUALIZADOR.permissoes()).contains(
                Permissao.FROTA_CONSULTAR,
                Permissao.VISTORIA_CONSULTAR,
                Permissao.ALOCACAO_CONSULTAR,
                Permissao.RELATORIO_EXPORTAR,
                Permissao.ESTATISTICA_CONSULTAR
        ).doesNotContain(
                Permissao.FROTA_OPERAR,
                Permissao.MISSAO_REGISTRAR,
                Permissao.MISSAO_COMPLEMENTAR,
                Permissao.MISSAO_CORRIGIR,
                Permissao.VEICULO_GERIR,
                Permissao.ALOCACAO_GERIR,
                Permissao.ACESSO_GERIR
        );
    }
}
