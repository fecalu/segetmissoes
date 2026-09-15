package com.frota.checklist.security;

import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class CustomUserDetails implements UserDetails {

    private final Long motoristaId;
    private final String nome;
    private final String login;
    private final String senha;
    private final Perfil perfil;
    private final boolean acessoHabilitado;
    private final long versaoAcesso;
    private final boolean deveAlterarSenha;
    private final boolean cadastroCompleto;
    private final boolean motoristaOperacional;

    public CustomUserDetails(Motorista motorista) {
        this.motoristaId = motorista.getId();
        this.nome = motorista.getNome();
        this.login = motorista.getLogin();
        this.senha = motorista.getSenha();
        this.perfil = motorista.getPerfil();
        this.acessoHabilitado = motorista.isAcessoHabilitado();
        this.versaoAcesso = motorista.getVersaoAcesso();
        this.deveAlterarSenha = motorista.isDeveAlterarSenha();
        this.cadastroCompleto = motorista.isCadastroCompleto();
        this.motoristaOperacional = motorista.isMotoristaOperacional();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (perfil == null || !acessoHabilitado) return List.of();
        var authorities = new java.util.ArrayList<GrantedAuthority>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + perfil.name()));
        if (motoristaOperacional && perfil != Perfil.MOTORISTA) {
            authorities.add(new SimpleGrantedAuthority("ROLE_MOTORISTA"));
        }
        perfil.permissoes().forEach(p -> authorities.add(new SimpleGrantedAuthority(p.name())));
        return authorities;
    }

    @Override
    public boolean isEnabled() { return acessoHabilitado && perfil != null; }

    @Override
    public String getPassword() {
        return senha;
    }

    @Override
    public String getUsername() {
        return login;
    }
}
