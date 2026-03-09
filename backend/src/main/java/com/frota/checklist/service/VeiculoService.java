package com.frota.checklist.service;

import com.frota.checklist.dto.VeiculoResponse;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.repository.VeiculoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VeiculoService {

    private final VeiculoRepository veiculoRepository;
    private final VeiculoStatusResolver veiculoStatusResolver;

    public List<VeiculoResponse> listar() {
        List<Veiculo> veiculos = veiculoRepository.findAll(Sort.by(Sort.Direction.ASC, "placa")).stream()
                .filter(v -> !Boolean.TRUE.equals(v.getDesativado()))
                .toList();
        Map<Long, VeiculoStatusSnapshot> snapshots = veiculoStatusResolver.resolverPorVeiculos(veiculos);
        return veiculos.stream()
                .map(v -> toResponse(v, snapshots.get(v.getId())))
                .toList();
    }

    private VeiculoResponse toResponse(Veiculo veiculo, VeiculoStatusSnapshot snapshot) {
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
