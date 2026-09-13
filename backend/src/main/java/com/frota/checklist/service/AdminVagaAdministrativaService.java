package com.frota.checklist.service;

import com.frota.checklist.dto.AtualizarVagaAdministrativaRequest;
import com.frota.checklist.dto.CriarVagaAdministrativaRequest;
import com.frota.checklist.dto.HistoricoVagaAdministrativaResponse;
import com.frota.checklist.dto.VagaAdministrativaResponse;
import com.frota.checklist.entity.AlocacaoVeiculo;
import com.frota.checklist.entity.HistoricoVagaAdministrativa;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.StatusVagaAdministrativa;
import com.frota.checklist.entity.TipoEventoVagaAdministrativa;
import com.frota.checklist.entity.VagaAdministrativa;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.AlocacaoVeiculoRepository;
import com.frota.checklist.repository.HistoricoVagaAdministrativaRepository;
import com.frota.checklist.repository.MotoristaRepository;
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
    private final HistoricoVagaAdministrativaRepository historicoRepository;
    private final MotoristaRepository motoristaRepository;

    public List<VagaAdministrativaResponse> listar(String busca, Boolean incluirDesativadas) {
        String filtro = busca == null ? "" : busca.trim().toLowerCase();
        boolean mostrarDesativadas = Boolean.TRUE.equals(incluirDesativadas);
        return vagaRepository.findAll(Sort.by(Sort.Direction.ASC, "numeroControle")).stream()
                .filter(vaga -> mostrarDesativadas || vaga.getStatus() != StatusVagaAdministrativa.DESATIVADA)
                .filter(vaga -> filtro.isBlank() || correspondeBusca(vaga, filtro))
                .map(this::toResponse)
                .toList();
    }

    public List<HistoricoVagaAdministrativaResponse> listarHistorico(Long vagaId) {
        buscar(vagaId);
        return historicoRepository.findByVagaAdministrativaIdOrderByDataHoraDesc(vagaId).stream()
                .map(this::toHistoricoResponse)
                .toList();
    }

    @Transactional
    public VagaAdministrativaResponse criar(CriarVagaAdministrativaRequest request, Long administradorId) {
        Motorista administrador = buscarAdministrador(administradorId);
        VagaAdministrativa vaga = new VagaAdministrativa();
        vaga.setNumeroControle(proximoNumeroControle());
        preencherDados(vaga, request.secretariaOrgao(), request.setor(), request.limiteAutorizado(),
                request.documentoReferencia(), request.observacao());
        vaga.setStatus(StatusVagaAdministrativa.LIVRE);
        vaga.setCriadaEm(LocalDateTime.now());
        VagaAdministrativa salva = vagaRepository.save(vaga);
        registrarHistorico(salva, administrador, TipoEventoVagaAdministrativa.CRIACAO,
                null, resumoDados(salva), null, null, null, null, "Vaga administrativa criada.");
        return toResponse(salva);
    }

    @Transactional
    public VagaAdministrativaResponse atualizar(Long id, AtualizarVagaAdministrativaRequest request, Long administradorId) {
        Motorista administrador = buscarAdministrador(administradorId);
        VagaAdministrativa vaga = buscar(id);
        String antes = resumoDados(vaga);
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
        VagaAdministrativa salva = vagaRepository.save(vaga);
        String depois = resumoDados(salva);
        if (!antes.equals(depois)) {
            registrarHistorico(salva, administrador, TipoEventoVagaAdministrativa.ATUALIZACAO_DADOS,
                    antes, depois, null, null, null, null, "Dados da vaga atualizados.");
        }
        return toResponse(salva);
    }

    @Transactional
    public VagaAdministrativaResponse desativar(Long id, Long administradorId) {
        Motorista administrador = buscarAdministrador(administradorId);
        VagaAdministrativa vaga = buscar(id);
        if (vaga.getStatus() == StatusVagaAdministrativa.OCUPADA
                || alocacaoRepository.findByVagaAdministrativaIdAndAtivaTrue(id).isPresent()) {
            throw new BusinessException("Nao e possivel desativar uma vaga ocupada. Encerre ou transfira a alocacao primeiro.");
        }
        vaga.setStatus(StatusVagaAdministrativa.DESATIVADA);
        vaga.setEncerradaEm(LocalDateTime.now());
        VagaAdministrativa salva = vagaRepository.save(vaga);
        registrarHistorico(salva, administrador, TipoEventoVagaAdministrativa.DESATIVACAO,
                null, resumoDados(salva), null, null, null, null, "Vaga desativada.");
        return toResponse(salva);
    }

    @Transactional
    public VagaAdministrativaResponse reativar(Long id, Long administradorId) {
        Motorista administrador = buscarAdministrador(administradorId);
        VagaAdministrativa vaga = buscar(id);
        vaga.setStatus(StatusVagaAdministrativa.LIVRE);
        vaga.setEncerradaEm(null);
        VagaAdministrativa salva = vagaRepository.save(vaga);
        registrarHistorico(salva, administrador, TipoEventoVagaAdministrativa.REATIVACAO,
                null, resumoDados(salva), null, null, null, null, "Vaga reativada.");
        return toResponse(salva);
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

    private Motorista buscarAdministrador(Long administradorId) {
        return motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));
    }

    private String resumoDados(VagaAdministrativa vaga) {
        return vaga.getSecretariaOrgao() + "|" + vaga.getSetor() + "|" + vaga.getLimiteAutorizado()
                + "|" + opcional(vaga.getDocumentoReferencia()) + "|" + opcional(vaga.getObservacao())
                + "|" + vaga.getStatus().name();
    }

    private void registrarHistorico(VagaAdministrativa vaga, Motorista administrador, TipoEventoVagaAdministrativa tipo,
                                    String dadosAnteriores, String dadosNovos, String placaAnterior, String placaNova,
                                    String responsavelAnterior, String responsavelNovo, String observacao) {
        HistoricoVagaAdministrativa historico = new HistoricoVagaAdministrativa();
        historico.setVagaAdministrativa(vaga);
        historico.setTipo(tipo);
        historico.setDadosAnteriores(dadosAnteriores);
        historico.setDadosNovos(dadosNovos);
        historico.setPlacaAnterior(placaAnterior);
        historico.setPlacaNova(placaNova);
        historico.setResponsavelAnterior(responsavelAnterior);
        historico.setResponsavelNovo(responsavelNovo);
        historico.setObservacao(observacao);
        historico.setDataHora(LocalDateTime.now());
        historico.setAdministrador(administrador);
        historicoRepository.save(historico);
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

    private HistoricoVagaAdministrativaResponse toHistoricoResponse(HistoricoVagaAdministrativa historico) {
        return new HistoricoVagaAdministrativaResponse(
                historico.getId(),
                historico.getTipo(),
                historico.getPlacaAnterior(),
                historico.getPlacaNova(),
                historico.getResponsavelAnterior(),
                historico.getResponsavelNovo(),
                historico.getDadosAnteriores(),
                historico.getDadosNovos(),
                historico.getObservacao(),
                historico.getDataHora(),
                historico.getAdministrador() == null ? "Sistema" : historico.getAdministrador().getNome()
        );
    }
}
