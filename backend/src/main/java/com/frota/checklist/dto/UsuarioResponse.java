package com.frota.checklist.dto;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;

public record UsuarioResponse(
        Long id,
        String nome,
        String login,
        String cpf,
        Perfil perfil,
        boolean acessoHabilitado,
        boolean deveAlterarSenha,
        boolean cadastroCompleto
) {
    public static UsuarioResponse from(Motorista usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getLogin(), usuario.getCpf(),
                usuario.getPerfil(), usuario.isAcessoHabilitado(), usuario.isDeveAlterarSenha(),
                usuario.isCadastroCompleto());
    }
}
