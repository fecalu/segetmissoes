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

    public CustomUserDetails(Motorista motorista) {
        this.motoristaId = motorista.getId();
        this.nome = motorista.getNome();
        this.login = motorista.getLogin();
        this.senha = motorista.getSenha();
        this.perfil = motorista.getPerfil();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + perfil.name()));
    }

    @Override
    public String getPassword() {
        return senha;
    }

    @Override
    public String getUsername() {
        return login;
    }
}
