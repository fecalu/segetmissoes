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

    @Override
    public void run(String... args) {
        if (veiculoRepository.count() == 0) {
            Veiculo v1 = new Veiculo();
            v1.setPlaca("BRA2E19");
            v1.setModelo("Cargo 2429");
            v1.setMarca("Ford");
            v1.setStatus(StatusVeiculo.ATIVO);

            Veiculo v2 = new Veiculo();
            v2.setPlaca("QWE4R56");
            v2.setModelo("Atego 1719");
            v2.setMarca("Mercedes");
            v2.setStatus(StatusVeiculo.ATIVO);

            Veiculo v3 = new Veiculo();
            v3.setPlaca("XYZ9K12");
            v3.setModelo("Delivery 11.180");
            v3.setMarca("Volkswagen");
            v3.setStatus(StatusVeiculo.ATIVO);

            veiculoRepository.saveAll(List.of(v1, v2, v3));
        }
        veiculoRepository.findAll().forEach(v -> {
            if (v.getStatus() == null) {
                v.setStatus(StatusVeiculo.ATIVO);
                veiculoRepository.save(v);
            }
        });

        Optional<Motorista> motoristaOpt = motoristaRepository.findByLogin("motorista1");
        if (motoristaOpt.isPresent()) {
            Motorista motorista = motoristaOpt.get();
            motorista.setNome("Motorista Teste");
            motorista.setSenha(passwordEncoder.encode("123456"));
            if (motorista.getCpf() == null || motorista.getCpf().isBlank()) {
                motorista.setCpf("12345678901");
            }
            motorista.setPerfil(Perfil.MOTORISTA);
            motoristaRepository.save(motorista);
        } else {
            Motorista motorista = new Motorista();
            motorista.setNome("Motorista Teste");
            motorista.setLogin("motorista1");
            motorista.setSenha(passwordEncoder.encode("123456"));
            motorista.setCpf("12345678901");
            motorista.setPerfil(Perfil.MOTORISTA);
            motoristaRepository.save(motorista);
        }

        Optional<Motorista> adminOpt = motoristaRepository.findByLogin("admin");
        if (adminOpt.isPresent()) {
            Motorista admin = adminOpt.get();
            admin.setNome("Administrador");
            admin.setSenha(passwordEncoder.encode("admin123"));
            admin.setCpf("99999999999");
            admin.setPerfil(Perfil.ADMIN);
            motoristaRepository.save(admin);
        } else {
            Motorista admin = new Motorista();
            admin.setNome("Administrador");
            admin.setLogin("admin");
            admin.setSenha(passwordEncoder.encode("admin123"));
            admin.setCpf("99999999999");
            admin.setPerfil(Perfil.ADMIN);
            motoristaRepository.save(admin);
        }
    }
}
