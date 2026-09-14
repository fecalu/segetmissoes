package com.frota.checklist.config;

import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.repository.MotoristaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class OfficialUsersInitializer implements CommandLineRunner {

    private final MotoristaRepository motoristaRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.official-users-seed-enabled:true}")
    private boolean enabled;

    @Value("${app.initial-user-password:123456}")
    private String initialPassword;

    @Override
    public void run(String... args) {
        if (!enabled) return;
        if (initialPassword == null || initialPassword.length() < 6) {
            throw new IllegalStateException("Configure APP_INITIAL_USER_PASSWORD com pelo menos 6 caracteres");
        }

        List<SeedUser> users = List.of(
                new SeedUser("jose.amaro", "JOSE AMARO DE ANDRADE LEITÃO", Perfil.GESTOR),
                new SeedUser("elda.vieira", "ELDA VIEIRA MIRANDA DOS SANTOS", Perfil.OPERADOR),
                new SeedUser("nayanne.reis", "NAYANNE PAURA REIS", Perfil.OPERADOR),
                new SeedUser("juliana", "JULIANA", Perfil.OPERADOR),
                new SeedUser("thiago.estrela", "THIAGO ESTRELA", Perfil.VISUALIZADOR),
                new SeedUser("joao.luna", "JOÃO FELIPE CAMPOS LUNA", Perfil.MOTORISTA),
                new SeedUser("ribamar.almeida", "JOSE RIBAMAR DE ALMEIDA", Perfil.MOTORISTA),
                new SeedUser("leilson.silva", "LEILSON AZEVEDO SILVA", Perfil.MOTORISTA),
                new SeedUser("fabio.araujo", "FABIO PIMENTEL ARAUJO", Perfil.MOTORISTA),
                new SeedUser("francisco.costa", "FRANCISCO FERREIRA COSTA", Perfil.MOTORISTA),
                new SeedUser("alan.ribeiro", "ALAN KARDEC RIBEIRO", Perfil.MOTORISTA),
                new SeedUser("damiao.brito", "DAMIÃO LOPES DE BRITO", Perfil.MOTORISTA),
                new SeedUser("josivan.conceicao", "JOSIVAN SILVA CONCEIÇÃO", Perfil.MOTORISTA),
                new SeedUser("manoel.barros", "MANOEL DE JESUS BARROS", Perfil.MOTORISTA),
                new SeedUser("marcio.coelho", "MARCIO ROBERTO F. COELHO", Perfil.MOTORISTA),
                new SeedUser("fabiano.silva", "FABIANO PORCINO DA SILVA", Perfil.MOTORISTA),
                new SeedUser("frederico.sousa", "FREDERICO RIBEIRO DE SOUSA", Perfil.MOTORISTA),
                new SeedUser("iarlyson.lino", "IARLYSON DA SILVA LINO", Perfil.MOTORISTA),
                new SeedUser("werlys.goncalves", "WERLYS PINHEIRO GONÇALVES", Perfil.MOTORISTA),
                new SeedUser("marcos.rios", "MARCOS ANTONIO MIRANDA RIOS", Perfil.MOTORISTA),
                new SeedUser("hamilton.leitao", "HAMILTON DA COSTA CONCEIÇÃO LEITÃO", Perfil.MOTORISTA)
        );

        String encodedPassword = passwordEncoder.encode(initialPassword);
        for (SeedUser user : users) {
            criarSeAusente(user, encodedPassword);
        }
    }

    private void criarSeAusente(SeedUser user, String encodedPassword) {
        if (motoristaRepository.existsByLogin(user.login())) return;
        Motorista motorista = new Motorista();
        motorista.setLogin(user.login());
        motorista.setNome(user.nome());
        motorista.setSenha(encodedPassword);
        motorista.setCpf(null);
        motorista.setPerfil(user.perfil());
        motorista.setAcessoHabilitado(true);
        motorista.setDeveAlterarSenha(true);
        motorista.setCadastroCompleto(false);
        motoristaRepository.save(motorista);
    }

    private record SeedUser(String login, String nome, Perfil perfil) {}
}

