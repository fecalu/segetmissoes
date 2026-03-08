package com.frota.checklist.service;

import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.dto.VeiculoResponse;
import com.frota.checklist.repository.VeiculoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VeiculoService {

    private final VeiculoRepository veiculoRepository;

    public List<VeiculoResponse> listar() {
        return veiculoRepository.findByStatus(StatusVeiculo.ATIVO).stream()
                .map(v -> new VeiculoResponse(v.getId(), v.getPlaca(), v.getModelo(), v.getMarca(), v.getStatus()))
                .toList();
    }
}
