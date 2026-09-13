package com.frota.checklist.config;

import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.repository.VeiculoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final VeiculoRepository veiculoRepository;
    private final MotoristaRepository motoristaRepository;
    private final PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Value("${app.demo-data-enabled:false}")
    private boolean demoDataEnabled;

    @Override
    public void run(String... args) {
        if (demoDataEnabled && veiculoRepository.count() == 0) {
            Veiculo v1 = new Veiculo();
            v1.setPlaca("BRA2E19");
            v1.setModelo("Cargo 2429");
            v1.setMarca("Ford");
            v1.setStatusAdministrativo(null);

            Veiculo v2 = new Veiculo();
            v2.setPlaca("QWE4R56");
            v2.setModelo("Atego 1719");
            v2.setMarca("Mercedes");
            v2.setStatusAdministrativo(null);

            Veiculo v3 = new Veiculo();
            v3.setPlaca("XYZ9K12");
            v3.setModelo("Delivery 11.180");
            v3.setMarca("Volkswagen");
            v3.setStatusAdministrativo(null);

            veiculoRepository.saveAll(List.of(v1, v2, v3));
        }
        veiculoRepository.findAll().forEach(v -> {
            if (v.getDesativado() == null) {
                v.setDesativado(false);
                veiculoRepository.save(v);
            }
            StatusVeiculo statusNormalizado = StatusVeiculo.normalizarStatusAdministrativo(v.getStatusAdministrativo());
            if (v.getStatusAdministrativo() != statusNormalizado) {
                v.setStatusAdministrativo(statusNormalizado);
                veiculoRepository.save(v);
            }
        });

        if (!demoDataEnabled) return;
        criarDemonstracaoSeAusente("motorista1", "Motorista Teste", "12345678901", "123456", Perfil.MOTORISTA);
        criarDemonstracaoSeAusente("admin", "Administrador", "99999999999", "admin123", Perfil.ADMIN);
    }

    private void criarDemonstracaoSeAusente(String login, String nome, String cpf, String senha, Perfil perfil) {
        if (motoristaRepository.existsByLogin(login)) return;
        Motorista usuario = new Motorista();
        usuario.setLogin(login); usuario.setNome(nome); usuario.setCpf(cpf);
        usuario.setSenha(passwordEncoder.encode(senha)); usuario.setPerfil(perfil);
        motoristaRepository.save(usuario);
    }
}
