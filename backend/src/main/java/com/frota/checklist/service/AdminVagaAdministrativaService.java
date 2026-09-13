package com.frota.checklist.service;

import com.frota.checklist.dto.AtualizarVagaAdministrativaRequest;
import com.frota.checklist.dto.CriarVagaAdministrativaRequest;
import com.frota.checklist.dto.VagaAdministrativaResponse;
import com.frota.checklist.entity.AlocacaoVeiculo;
import com.frota.checklist.entity.StatusVagaAdministrativa;
import com.frota.checklist.entity.VagaAdministrativa;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.AlocacaoVeiculoRepository;
import com.frota.checklist.repository.VagaAdministrativaRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AdminVagaAdministrativaService {

    private final VagaAdministrativaRepository vagaRepository;
    private final AlocacaoVeiculoRepository alocacaoRepository;

    public List<VagaAdministrativaResponse> listar(String busca, Boolean incluirDesativadas) {
        String filtro = busca == null ? "" : busca.trim().toLowerCase();
        boolean mostrarDesativadas = Boolean.TRUE.equals(incluirDesativadas);
        return vagaRepository.findAll(Sort.by(Sort.Direction.ASC, "numeroControle")).stream()
                .filter(vaga -> mostrarDesativadas || vaga.getStatus() != StatusVagaAdministrativa.DESATIVADA)
                .filter(vaga -> filtro.isBlank() || correspondeBusca(vaga, filtro))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public VagaAdministrativaResponse criar(CriarVagaAdministrativaRequest request) {
        VagaAdministrativa vaga = new VagaAdministrativa();
        vaga.setNumeroControle(proximoNumeroControle());
        preencherDados(vaga, request.secretariaOrgao(), request.setor(), request.limiteAutorizado(),
                request.documentoReferencia(), request.observacao());
        vaga.setStatus(StatusVagaAdministrativa.LIVRE);
        vaga.setCriadaEm(LocalDateTime.now());
        return toResponse(vagaRepository.save(vaga));
    }

    @Transactional
    public VagaAdministrativaResponse atualizar(Long id, AtualizarVagaAdministrativaRequest request) {
        VagaAdministrativa vaga = buscar(id);
        preencherDados(vaga, request.secretariaOrgao(), request.setor(), request.limiteAutorizado(),
                request.documentoReferencia(), request.observacao());
        alocacaoRepository.findByVagaAdministrativaIdAndAtivaTrue(id).ifPresent(alocacao -> {
            alocacao.setSecretariaOrgao(vaga.getSecretariaOrgao());
            alocacao.setSetor(vaga.getSetor());
            alocacao.setLimiteAutorizado(vaga.getLimiteAutorizado());
            alocacao.setDocumentoReferencia(vaga.getDocumentoReferencia());
            alocacao.setObservacao(vaga.getObservacao());
            alocacaoRepository.save(alocacao);
        });
        return toResponse(vagaRepository.save(vaga));
    }

    @Transactional
    public VagaAdministrativaResponse desativar(Long id) {
        VagaAdministrativa vaga = buscar(id);
        if (vaga.getStatus() == StatusVagaAdministrativa.OCUPADA
                || alocacaoRepository.findByVagaAdministrativaIdAndAtivaTrue(id).isPresent()) {
            throw new BusinessException("Nao e possivel desativar uma vaga ocupada. Encerre ou transfira a alocacao primeiro.");
        }
        vaga.setStatus(StatusVagaAdministrativa.DESATIVADA);
        vaga.setEncerradaEm(LocalDateTime.now());
        return toResponse(vagaRepository.save(vaga));
    }

    @Transactional
    public VagaAdministrativaResponse reativar(Long id) {
        VagaAdministrativa vaga = buscar(id);
        vaga.setStatus(StatusVagaAdministrativa.LIVRE);
        vaga.setEncerradaEm(null);
        return toResponse(vagaRepository.save(vaga));
    }

    private VagaAdministrativa buscar(Long id) {
        return vagaRepository.findById(id).orElseThrow(() -> new NotFoundException("Vaga administrativa nao encontrada"));
    }

    private Integer proximoNumeroControle() {
        return vagaRepository.findTopByOrderByNumeroControleDesc()
                .map(VagaAdministrativa::getNumeroControle)
                .orElse(0) + 1;
    }

    private void preencherDados(VagaAdministrativa vaga, String secretariaOrgao, String setor, String limiteAutorizado,
                                String documentoReferencia, String observacao) {
        vaga.setSecretariaOrgao(obrigatorio(secretariaOrgao));
        vaga.setSetor(obrigatorio(setor));
        vaga.setLimiteAutorizado(obrigatorio(limiteAutorizado));
        vaga.setDocumentoReferencia(opcional(documentoReferencia));
        vaga.setObservacao(opcional(observacao));
    }

    private boolean correspondeBusca(VagaAdministrativa vaga, String filtro) {
        return contem(vaga.getNumeroControle().toString(), filtro)
                || contem(vaga.getSecretariaOrgao(), filtro)
                || contem(vaga.getSetor(), filtro)
                || contem(vaga.getLimiteAutorizado(), filtro)
                || contem(vaga.getDocumentoReferencia(), filtro)
                || contem(vaga.getObservacao(), filtro)
                || alocacaoRepository.findByVagaAdministrativaIdAndAtivaTrue(vaga.getId())
                .map(alocacao -> contem(alocacao.getPlaca(), filtro)
                        || contem(alocacao.getModelo(), filtro)
                        || contem(alocacao.getResponsavelNome(), filtro))
                .orElse(false);
    }

    private boolean contem(String valor, String filtro) {
        return valor != null && valor.toLowerCase().contains(filtro);
    }

    private String obrigatorio(String value) {
        String limpo = value == null ? "" : value.trim();
        if (limpo.isBlank()) {
            throw new BusinessException("Preencha todos os campos obrigatorios.");
        }
        return limpo;
    }

    private String opcional(String value) {
        String limpo = value == null ? "" : value.trim();
        return limpo.isBlank() ? null : limpo;
    }

    private VagaAdministrativaResponse toResponse(VagaAdministrativa vaga) {
        Optional<AlocacaoVeiculo> alocacaoAtiva = alocacaoRepository.findByVagaAdministrativaIdAndAtivaTrue(vaga.getId());
        return new VagaAdministrativaResponse(
                vaga.getId(),
                vaga.getNumeroControle(),
                vaga.getSecretariaOrgao(),
                vaga.getSetor(),
                vaga.getLimiteAutorizado(),
                vaga.getDocumentoReferencia(),
                vaga.getObservacao(),
                vaga.getStatus(),
                vaga.getCriadaEm(),
                vaga.getEncerradaEm(),
                alocacaoAtiva.map(AlocacaoVeiculo::getId).orElse(null),
                alocacaoAtiva.map(AlocacaoVeiculo::getPlaca).orElse(null),
                alocacaoAtiva.map(AlocacaoVeiculo::getModelo).orElse(null),
                alocacaoAtiva.map(AlocacaoVeiculo::getResponsavelNome).orElse(null)
        );
    }
}
