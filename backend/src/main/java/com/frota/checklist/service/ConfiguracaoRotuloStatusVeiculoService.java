package com.frota.checklist.service;

import com.frota.checklist.dto.RotuloStatusVeiculoRequest;
import com.frota.checklist.dto.RotuloStatusVeiculoResponse;
import com.frota.checklist.entity.ConfiguracaoRotuloStatusVeiculo;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.ConfiguracaoRotuloStatusVeiculoRepository;
import com.frota.checklist.repository.MotoristaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ConfiguracaoRotuloStatusVeiculoService {

    private static final List<StatusVeiculo> STATUS_EDITAVEIS = List.of(
            StatusVeiculo.CIRCULANDO,
            StatusVeiculo.BASE_JOAO_GOULART,
            StatusVeiculo.NO_PATIO,
            StatusVeiculo.OFICINA,
            StatusVeiculo.EM_VIAGEM,
            StatusVeiculo.MANUTENCAO,
            StatusVeiculo.BLOQUEADO
    );

    private static final Map<StatusVeiculo, String> ROTULOS_PADRAO = criarRotulosPadrao();

    private final ConfiguracaoRotuloStatusVeiculoRepository configuracaoRepository;
    private final MotoristaRepository motoristaRepository;

    @Transactional(readOnly = true)
    public List<RotuloStatusVeiculoResponse> listar() {
        Map<StatusVeiculo, ConfiguracaoRotuloStatusVeiculo> configuracoes = new EnumMap<>(StatusVeiculo.class);
        configuracaoRepository.findAll().forEach(config -> configuracoes.put(config.getStatus(), config));

        return STATUS_EDITAVEIS.stream()
                .map(status -> {
                    ConfiguracaoRotuloStatusVeiculo config = configuracoes.get(status);
                    String rotuloPadrao = ROTULOS_PADRAO.get(status);
                    String rotuloAtual = config != null ? config.getRotulo() : rotuloPadrao;
                    boolean personalizado = config != null && !rotuloPadrao.equals(rotuloAtual);
                    return new RotuloStatusVeiculoResponse(status, rotuloAtual, rotuloPadrao, personalizado);
                })
                .toList();
    }

    @Transactional
    public List<RotuloStatusVeiculoResponse> salvar(Long administradorId, List<RotuloStatusVeiculoRequest> requests) {
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));
        if (administrador.getPerfil() != Perfil.ADMIN) {
            throw new BusinessException("Somente administrador pode alterar rotulos de status");
        }

        validarDuplicidadeStatus(requests);

        for (RotuloStatusVeiculoRequest request : requests) {
            if (!STATUS_EDITAVEIS.contains(request.status())) {
                throw new BusinessException("Status nao permitido para edicao: " + request.status());
            }
            String novoRotulo = normalizarRotulo(request.rotulo());
            ConfiguracaoRotuloStatusVeiculo config = configuracaoRepository.findById(request.status())
                    .orElseGet(() -> {
                        ConfiguracaoRotuloStatusVeiculo nova = new ConfiguracaoRotuloStatusVeiculo();
                        nova.setStatus(request.status());
                        return nova;
                    });
            config.setRotulo(novoRotulo);
            config.setAtualizadoPor(administrador);
            configuracaoRepository.save(config);
        }

        return listar();
    }

    private String normalizarRotulo(String rotulo) {
        String normalizado = rotulo == null ? "" : rotulo.trim();
        if (normalizado.isBlank()) {
            throw new BusinessException("Rotulo de status nao pode ser vazio");
        }
        if (normalizado.length() > 80) {
            throw new BusinessException("Rotulo de status deve ter no maximo 80 caracteres");
        }
        return normalizado.toUpperCase();
    }

    private void validarDuplicidadeStatus(List<RotuloStatusVeiculoRequest> requests) {
        Set<StatusVeiculo> vistos = new HashSet<>();
        for (RotuloStatusVeiculoRequest request : requests) {
            if (!vistos.add(request.status())) {
                throw new BusinessException("Status duplicado no envio: " + request.status());
            }
        }
    }

    private static Map<StatusVeiculo, String> criarRotulosPadrao() {
        Map<StatusVeiculo, String> map = new EnumMap<>(StatusVeiculo.class);
        map.put(StatusVeiculo.CIRCULANDO, "NA RUA (MISSAO)");
        map.put(StatusVeiculo.BASE_JOAO_GOULART, "DISPONIVEL");
        map.put(StatusVeiculo.NO_PATIO, "NO PATIO");
        map.put(StatusVeiculo.OFICINA, "OFICINA");
        map.put(StatusVeiculo.EM_VIAGEM, "EM VIAGEM");
        map.put(StatusVeiculo.MANUTENCAO, "MANUTENCAO");
        map.put(StatusVeiculo.BLOQUEADO, "BLOQUEADO");
        return map;
    }
}
