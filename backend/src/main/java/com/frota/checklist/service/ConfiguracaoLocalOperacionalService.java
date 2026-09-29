package com.frota.checklist.service;

import com.frota.checklist.dto.LocalOperacionalRequest;
import com.frota.checklist.dto.LocalOperacionalResponse;
import com.frota.checklist.entity.ConfiguracaoLocalOperacional;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.ConfiguracaoLocalOperacionalRepository;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.security.AutorizacaoService;
import com.frota.checklist.security.Permissao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConfiguracaoLocalOperacionalService {

    private final AutorizacaoService autorizacao;
    private final ConfiguracaoLocalOperacionalRepository configuracaoRepository;
    private final MotoristaRepository motoristaRepository;

    @Transactional(readOnly = true)
    public List<LocalOperacionalResponse> listar() {
        return configuracaoRepository.findAllByOrderByOrdemExibicaoAscNomeAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<LocalOperacionalResponse> salvar(Long administradorId, List<LocalOperacionalRequest> requests) {
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));
        autorizacao.exigir(administrador.getId(), Permissao.CONFIGURACAO_GERIR);

        List<LocalOperacionalRequest> normalizados = normalizar(requests);
        Map<Long, ConfiguracaoLocalOperacional> existentes = configuracaoRepository.findAll()
                .stream()
                .collect(Collectors.toMap(ConfiguracaoLocalOperacional::getId, Function.identity()));

        Set<Long> idsMantidos = new HashSet<>();
        for (LocalOperacionalRequest request : normalizados) {
            ConfiguracaoLocalOperacional configuracao = request.id() == null
                    ? new ConfiguracaoLocalOperacional()
                    : existentes.get(request.id());
            if (configuracao == null) {
                throw new NotFoundException("Local operacional nao encontrado");
            }
            configuracao.setNome(request.nome().trim());
            configuracao.setCor(request.cor().trim());
            configuracao.setOrdemExibicao(request.ordemExibicao());
            configuracao.setAtivo(request.ativo());
            configuracao.setAtualizadoPor(administrador);
            ConfiguracaoLocalOperacional salvo = configuracaoRepository.save(configuracao);
            idsMantidos.add(salvo.getId());
        }

        List<ConfiguracaoLocalOperacional> remover = existentes.values().stream()
                .filter(item -> !idsMantidos.contains(item.getId()))
                .toList();
        configuracaoRepository.deleteAll(remover);

        return listar();
    }

    private List<LocalOperacionalRequest> normalizar(List<LocalOperacionalRequest> requests) {
        if (requests == null) {
            return List.of();
        }
        if (requests.size() > 30) {
            throw new BusinessException("Cadastre no maximo 30 locais operacionais");
        }

        Set<String> nomes = new LinkedHashSet<>();
        List<LocalOperacionalRequest> resultado = new ArrayList<>();
        int ordem = 1;
        for (LocalOperacionalRequest request : requests) {
            String nome = request.nome() == null ? "" : request.nome().trim();
            String cor = request.cor() == null ? "" : request.cor().trim();
            if (nome.isBlank()) {
                throw new BusinessException("Nome do local operacional nao pode ser vazio");
            }
            if (nome.length() > 80) {
                throw new BusinessException("Nome do local operacional deve ter no maximo 80 caracteres");
            }
            if (!cor.matches("^#[0-9A-Fa-f]{6}$")) {
                throw new BusinessException("Cor do local operacional deve estar no formato hexadecimal");
            }
            if (!nomes.add(nome.toUpperCase())) {
                throw new BusinessException("Local operacional duplicado: " + nome);
            }
            resultado.add(new LocalOperacionalRequest(request.id(), nome, cor, ordem++, request.ativo()));
        }
        return resultado.stream()
                .sorted(Comparator.comparing(LocalOperacionalRequest::ordemExibicao))
                .toList();
    }

    private LocalOperacionalResponse toResponse(ConfiguracaoLocalOperacional configuracao) {
        return new LocalOperacionalResponse(
                configuracao.getId(),
                configuracao.getNome(),
                configuracao.getCor(),
                configuracao.getOrdemExibicao(),
                configuracao.isAtivo()
        );
    }
}
