package com.frota.checklist.service;

import com.frota.checklist.dto.VeiculoResponse;
import com.frota.checklist.repository.VeiculoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VeiculoService {

    private final VeiculoRepository veiculoRepository;
    private final VeiculoStatusResolver veiculoStatusResolver;

    public List<VeiculoResponse> listar() {
        return veiculoRepository.findAll(Sort.by(Sort.Direction.ASC, "placa")).stream()
                .filter(v -> !Boolean.TRUE.equals(v.getDesativado()))
                .map(this::toResponse)
                .toList();
    }

    private VeiculoResponse toResponse(com.frota.checklist.entity.Veiculo veiculo) {
        VeiculoStatusSnapshot snapshot = veiculoStatusResolver.resolver(veiculo);
        return new VeiculoResponse(
                veiculo.getId(),
                veiculo.getPlaca(),
                veiculo.getModelo(),
                veiculo.getMarca(),
                Boolean.TRUE.equals(veiculo.getDesativado()),
                snapshot.statusAtual(),
                snapshot.statusAutomatico(),
                snapshot.statusAdministrativo(),
                snapshot.motoristaAtualId(),
                snapshot.motoristaAtualNome()
        );
    }
}
