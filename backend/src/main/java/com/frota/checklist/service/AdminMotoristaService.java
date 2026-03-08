package com.frota.checklist.service;

import com.frota.checklist.dto.AdminMotoristaRequest;
import com.frota.checklist.dto.MotoristaResponse;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.MotoristaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminMotoristaService {

    private final MotoristaRepository motoristaRepository;
    private final PasswordEncoder passwordEncoder;

    public List<MotoristaResponse> listar(String busca) {
        String filtro = busca == null ? "" : busca.trim().toLowerCase(Locale.ROOT);
        return motoristaRepository.findAll().stream()
                .filter(m -> filtro.isBlank() || contemBusca(m, filtro))
                .map(this::toResponse)
                .toList();
    }

    public MotoristaResponse criar(AdminMotoristaRequest request) {
        validarCpf(request.cpf());
        validarDuplicidadesParaCriacao(request.login(), request.cpf());
        if (request.senha() == null || request.senha().isBlank()) {
            throw new BusinessException("Senha e obrigatoria para criar motorista");
        }

        Motorista motorista = new Motorista();
        motorista.setNome(request.nome());
        motorista.setLogin(request.login());
        motorista.setCpf(request.cpf());
        motorista.setPerfil(request.perfil());
        motorista.setSenha(passwordEncoder.encode(request.senha()));
        return toResponse(motoristaRepository.save(motorista));
    }

    public MotoristaResponse editar(Long id, AdminMotoristaRequest request) {
        validarCpf(request.cpf());
        Motorista motorista = motoristaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Motorista nao encontrado"));

        if (motoristaRepository.existsByLoginAndIdNot(request.login(), id)) {
            throw new BusinessException("Login ja utilizado");
        }
        if (motoristaRepository.existsByCpfAndIdNot(request.cpf(), id)) {
            throw new BusinessException("CPF ja utilizado");
        }

        motorista.setNome(request.nome());
        motorista.setLogin(request.login());
        motorista.setCpf(request.cpf());
        motorista.setPerfil(request.perfil());
        if (request.senha() != null && !request.senha().isBlank()) {
            motorista.setSenha(passwordEncoder.encode(request.senha()));
        }

        return toResponse(motoristaRepository.save(motorista));
    }

    public void excluir(Long id) {
        Motorista motorista = motoristaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Motorista nao encontrado"));
        if ("admin".equalsIgnoreCase(motorista.getLogin())) {
            throw new BusinessException("Nao e permitido excluir o usuario admin padrao");
        }
        motoristaRepository.delete(motorista);
    }

    private boolean contemBusca(Motorista motorista, String filtro) {
        return motorista.getNome().toLowerCase(Locale.ROOT).contains(filtro)
                || motorista.getCpf().contains(filtro)
                || motorista.getLogin().toLowerCase(Locale.ROOT).contains(filtro);
    }

    private void validarDuplicidadesParaCriacao(String login, String cpf) {
        if (motoristaRepository.existsByLogin(login)) {
            throw new BusinessException("Login ja cadastrado");
        }
        if (motoristaRepository.existsByCpf(cpf)) {
            throw new BusinessException("CPF ja cadastrado");
        }
    }

    private void validarCpf(String cpf) {
        if (cpf == null || !cpf.matches("\\d{11}") || todosDigitosIguais(cpf) || !digitosValidosCpf(cpf)) {
            throw new BusinessException("CPF invalido");
        }
    }

    private boolean todosDigitosIguais(String cpf) {
        char c = cpf.charAt(0);
        for (int i = 1; i < cpf.length(); i++) {
            if (cpf.charAt(i) != c) {
                return false;
            }
        }
        return true;
    }

    private boolean digitosValidosCpf(String cpf) {
        int d1 = calcularDigito(cpf, 9, 10);
        int d2 = calcularDigito(cpf, 10, 11);
        return d1 == Character.getNumericValue(cpf.charAt(9))
                && d2 == Character.getNumericValue(cpf.charAt(10));
    }

    private int calcularDigito(String cpf, int tamanho, int pesoInicial) {
        int soma = 0;
        int peso = pesoInicial;
        for (int i = 0; i < tamanho; i++) {
            soma += Character.getNumericValue(cpf.charAt(i)) * peso--;
        }
        int resto = 11 - (soma % 11);
        return resto > 9 ? 0 : resto;
    }

    private MotoristaResponse toResponse(Motorista motorista) {
        return new MotoristaResponse(
                motorista.getId(),
                motorista.getNome(),
                motorista.getLogin(),
                motorista.getCpf(),
                motorista.getPerfil()
        );
    }
}
