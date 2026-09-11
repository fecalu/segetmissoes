package com.frota.checklist.config;

import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.repository.MotoristaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.bootstrap-admin.enabled", havingValue = "true")
public class BootstrapAdminInitializer implements CommandLineRunner {
    private final MotoristaRepository repository;
    private final PasswordEncoder encoder;
    @Value("${app.bootstrap-admin.login}") private String login;
    @Value("${app.bootstrap-admin.nome}") private String nome;
    @Value("${app.bootstrap-admin.cpf}") private String cpf;
    @Value("${app.bootstrap-admin.senha}") private String senha;

    @Override public void run(String... args) {
        if (repository.countByPerfilAndAcessoHabilitadoTrue(Perfil.ADMIN) > 0) return;
        if (login.isBlank() || nome.isBlank() || !cpf.matches("\\d{11}") || senha.length() < 12)
            throw new IllegalStateException("Configure os dados do primeiro Administrador e uma senha de pelo menos 12 caracteres");
        if (repository.existsByLogin(login) || repository.existsByCpf(cpf))
            throw new IllegalStateException("O bootstrap nao pode sobrescrever uma conta existente");
        Motorista usuario = new Motorista();
        usuario.setLogin(login); usuario.setNome(nome); usuario.setCpf(cpf); usuario.setPerfil(Perfil.ADMIN);
        usuario.setSenha(encoder.encode(senha));
        repository.save(usuario);
    }
}
