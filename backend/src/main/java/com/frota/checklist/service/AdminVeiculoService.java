package com.frota.checklist.service;

import com.frota.checklist.dto.AdminVeiculoRequest;
import com.frota.checklist.dto.VeiculoResponse;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.VeiculoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminVeiculoService {

    private final VeiculoRepository veiculoRepository;

    public List<VeiculoResponse> listar(String buscaPlaca) {
        String filtro = buscaPlaca == null ? "" : normalizarPlaca(buscaPlaca);
        return veiculoRepository.findAll().stream()
                .filter(v -> filtro.isBlank() || normalizarPlaca(v.getPlaca()).contains(filtro))
                .map(this::toResponse)
                .toList();
    }

    public VeiculoResponse criar(AdminVeiculoRequest request) {
        String placa = normalizarPlaca(request.placa());
        if (veiculoRepository.existsByPlaca(placa)) {
            throw new BusinessException("Placa ja cadastrada");
        }

        Veiculo veiculo = new Veiculo();
        veiculo.setPlaca(placa);
        veiculo.setModelo(request.modelo().trim());
        veiculo.setMarca(request.marca().trim());
        veiculo.setStatus(request.status());

        return toResponse(veiculoRepository.save(veiculo));
    }

    public VeiculoResponse editar(Long id, AdminVeiculoRequest request) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));

        String placa = normalizarPlaca(request.placa());
        if (veiculoRepository.existsByPlacaAndIdNot(placa, id)) {
            throw new BusinessException("Placa ja cadastrada");
        }

        veiculo.setPlaca(placa);
        veiculo.setModelo(request.modelo().trim());
        veiculo.setMarca(request.marca().trim());
        veiculo.setStatus(request.status());

        return toResponse(veiculoRepository.save(veiculo));
    }

    public void excluir(Long id) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        veiculoRepository.delete(veiculo);
    }

    private String normalizarPlaca(String placa) {
        return placa == null ? "" : placa.replace("-", "").trim().toUpperCase(Locale.ROOT);
    }

    private VeiculoResponse toResponse(Veiculo veiculo) {
        return new VeiculoResponse(
                veiculo.getId(),
                veiculo.getPlaca(),
                veiculo.getModelo(),
                veiculo.getMarca(),
                veiculo.getStatus()
        );
    }
}
