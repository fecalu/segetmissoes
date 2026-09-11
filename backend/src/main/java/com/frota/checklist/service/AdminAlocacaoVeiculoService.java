package com.frota.checklist.service;

import com.frota.checklist.dto.AlocacaoVeiculoResponse;
import com.frota.checklist.dto.AtualizarDadosAlocacaoVeiculoRequest;
import com.frota.checklist.dto.CriarAlocacaoVeiculoRequest;
import com.frota.checklist.dto.HistoricoAlocacaoVeiculoResponse;
import com.frota.checklist.dto.TrocarResponsavelAlocacaoRequest;
import com.frota.checklist.dto.TrocarVeiculoAlocacaoRequest;
import com.frota.checklist.entity.AlocacaoVeiculo;
import com.frota.checklist.entity.HistoricoAlocacaoVeiculo;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.entity.TipoEventoAlocacaoVeiculo;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.AlocacaoVeiculoRepository;
import com.frota.checklist.repository.HistoricoAlocacaoVeiculoRepository;
import com.frota.checklist.repository.MotoristaRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminAlocacaoVeiculoService {

    private final AlocacaoVeiculoRepository alocacaoRepository;
    private final HistoricoAlocacaoVeiculoRepository historicoRepository;
    private final MotoristaRepository motoristaRepository;

    @Transactional
    public List<AlocacaoVeiculoResponse> listar(String busca, Boolean incluirEncerradas) {
        String filtro = normalizar(busca);
        return alocacaoRepository.findAll(Sort.by(Sort.Direction.ASC, "numeroControle")).stream()
                .filter(alocacao -> Boolean.TRUE.equals(incluirEncerradas) || Boolean.TRUE.equals(alocacao.getAtiva()))
                .filter(alocacao -> filtro == null || correspondeBusca(alocacao, filtro))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AlocacaoVeiculoResponse criar(CriarAlocacaoVeiculoRequest request, Long administradorId) {
        Motorista administrador = validarAdministrador(administradorId);
        String placa = normalizarPlaca(request.placa());
        if (alocacaoRepository.existsByPlacaIgnoreCaseAndAtivaTrue(placa)) {
            throw new BusinessException("Esta placa já possui uma alocação ativa");
        }

        AlocacaoVeiculo alocacao = new AlocacaoVeiculo();
        alocacao.setNumeroControle(proximoNumeroControle());
        alocacao.setPlaca(placa);
        alocacao.setModelo(obrigatorio(request.modelo()));
        alocacao.setMarca(opcional(request.marca()));
        alocacao.setResponsavelNome(obrigatorio(request.responsavelNome()));
        alocacao.setSecretariaOrgao(obrigatorio(request.secretariaOrgao()));
        alocacao.setSetor(obrigatorio(request.setor()));
        alocacao.setLimiteAutorizado(obrigatorio(request.limiteAutorizado()));
        alocacao.setDocumentoReferencia(opcional(request.documentoReferencia()));
        alocacao.setLinkConsulta(validarLinkConsulta(request.linkConsulta()));
        alocacao.setObservacao(opcional(request.observacao()));
        alocacao.setAtiva(true);
        alocacao.setCriadaEm(LocalDateTime.now());
        AlocacaoVeiculo salva = alocacaoRepository.save(alocacao);

        registrarHistorico(salva, administrador, TipoEventoAlocacaoVeiculo.CRIACAO,
                null, placa, null, salva.getResponsavelNome(), null, salva.getLimiteAutorizado(), salva.getObservacao());
        return toResponse(salva);
    }

    @Transactional
    public AlocacaoVeiculoResponse atualizarDados(Long id, AtualizarDadosAlocacaoVeiculoRequest request, Long administradorId) {
        Motorista administrador = validarAdministrador(administradorId);
        AlocacaoVeiculo alocacao = buscarAtiva(id);
        String limiteAnterior = alocacao.getLimiteAutorizado();
        String antes = resumoDados(alocacao);
        alocacao.setSecretariaOrgao(obrigatorio(request.secretariaOrgao()));
        alocacao.setSetor(obrigatorio(request.setor()));
        alocacao.setLimiteAutorizado(obrigatorio(request.limiteAutorizado()));
        alocacao.setDocumentoReferencia(opcional(request.documentoReferencia()));
        alocacao.setLinkConsulta(validarLinkConsulta(request.linkConsulta()));
        alocacao.setObservacao(opcional(request.observacao()));
        AlocacaoVeiculo salva = alocacaoRepository.save(alocacao);
        String depois = resumoDados(salva);
        if (!antes.equals(depois)) {
            registrarHistorico(salva, administrador, TipoEventoAlocacaoVeiculo.ATUALIZACAO_DADOS,
                    salva.getPlaca(), salva.getPlaca(), null, null, limiteAnterior, salva.getLimiteAutorizado(),
                    "Dados atualizados v2: " + antes + " -> " + depois);
        }
        return toResponse(salva);
    }

    @Transactional
    public AlocacaoVeiculoResponse trocarVeiculo(Long id, TrocarVeiculoAlocacaoRequest request, Long administradorId) {
        Motorista administrador = validarAdministrador(administradorId);
        AlocacaoVeiculo alocacao = buscarAtiva(id);
        String novaPlaca = normalizarPlaca(request.placa());
        if (alocacao.getPlaca().equalsIgnoreCase(novaPlaca)) {
            throw new BusinessException("Informe uma placa diferente da atual");
        }
        if (alocacaoRepository.existsByPlacaIgnoreCaseAndAtivaTrueAndIdNot(novaPlaca, alocacao.getId())) {
            throw new BusinessException("Esta placa já possui uma alocação ativa");
        }
        String anterior = alocacao.getPlaca();
        alocacao.setPlaca(novaPlaca);
        alocacao.setModelo(obrigatorio(request.modelo()));
        alocacao.setMarca(opcional(request.marca()));
        AlocacaoVeiculo salva = alocacaoRepository.save(alocacao);
        registrarHistorico(salva, administrador, TipoEventoAlocacaoVeiculo.TROCA_VEICULO,
                anterior, novaPlaca, null, null, null, null, obrigatorio(request.motivo()));
        return toResponse(salva);
    }

    @Transactional
    public AlocacaoVeiculoResponse trocarResponsavel(Long id, TrocarResponsavelAlocacaoRequest request, Long administradorId) {
        Motorista administrador = validarAdministrador(administradorId);
        AlocacaoVeiculo alocacao = buscarAtiva(id);
        String novoResponsavel = obrigatorio(request.responsavelNome());
        if (alocacao.getResponsavelNome().equalsIgnoreCase(novoResponsavel)) {
            throw new BusinessException("Informe um responsável diferente do atual");
        }
        String anterior = alocacao.getResponsavelNome();
        alocacao.setResponsavelNome(novoResponsavel);
        AlocacaoVeiculo salva = alocacaoRepository.save(alocacao);
        registrarHistorico(salva, administrador, TipoEventoAlocacaoVeiculo.TROCA_RESPONSAVEL,
                null, null, anterior, novoResponsavel, null, null, obrigatorio(request.motivo()));
        return toResponse(salva);
    }

    @Transactional
    public AlocacaoVeiculoResponse encerrar(Long id, String motivo, Long administradorId) {
        Motorista administrador = validarAdministrador(administradorId);
        AlocacaoVeiculo alocacao = buscarAtiva(id);
        alocacao.setAtiva(false);
        alocacao.setEncerradaEm(LocalDateTime.now());
        AlocacaoVeiculo salva = alocacaoRepository.save(alocacao);
        registrarHistorico(salva, administrador, TipoEventoAlocacaoVeiculo.ENCERRAMENTO,
                salva.getPlaca(), null, salva.getResponsavelNome(), null, salva.getLimiteAutorizado(), null, obrigatorio(motivo));
        return toResponse(salva);
    }

    @Transactional
    public List<HistoricoAlocacaoVeiculoResponse> listarHistorico(Long id) {
        if (!alocacaoRepository.existsById(id)) {
            throw new NotFoundException("Alocação não encontrada");
        }
        return historicoRepository.findByAlocacaoIdOrderByDataHoraDesc(id).stream()
                .map(evento -> new HistoricoAlocacaoVeiculoResponse(
                        evento.getId(), evento.getTipo(),
                        evento.getPlacaVeiculoAnterior(), evento.getPlacaVeiculoNovo(),
                        evento.getResponsavelAnterior(), evento.getResponsavelNovo(),
                        evento.getLimiteAnterior(), evento.getLimiteNovo(), evento.getObservacao(),
                        evento.getDataHora(), evento.getAdministrador().getNome()
                )).toList();
    }

    private void registrarHistorico(AlocacaoVeiculo alocacao, Motorista administrador, TipoEventoAlocacaoVeiculo tipo,
                                    String placaVeiculoAnterior, String placaVeiculoNovo, String responsavelAnterior,
                                    String responsavelNovo, String limiteAnterior, String limiteNovo, String observacao) {
        HistoricoAlocacaoVeiculo evento = new HistoricoAlocacaoVeiculo();
        evento.setAlocacao(alocacao);
        evento.setAdministrador(administrador);
        evento.setTipo(tipo);
        evento.setPlacaVeiculoAnterior(placaVeiculoAnterior);
        evento.setPlacaVeiculoNovo(placaVeiculoNovo);
        evento.setResponsavelAnterior(responsavelAnterior);
        evento.setResponsavelNovo(responsavelNovo);
        evento.setLimiteAnterior(limiteAnterior);
        evento.setLimiteNovo(limiteNovo);
        evento.setObservacao(opcional(observacao));
        evento.setDataHora(LocalDateTime.now());
        historicoRepository.save(evento);
    }

    private AlocacaoVeiculo buscarAtiva(Long id) {
        AlocacaoVeiculo alocacao = alocacaoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Alocação não encontrada"));
        if (!Boolean.TRUE.equals(alocacao.getAtiva())) {
            throw new BusinessException("Esta alocação já foi encerrada");
        }
        return alocacao;
    }

    private Motorista validarAdministrador(Long id) {
        Motorista administrador = motoristaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Administrador não encontrado"));
        if (administrador.getPerfil() != Perfil.ADMIN) {
            throw new BusinessException("Somente administradores podem alterar alocações");
        }
        return administrador;
    }

    private Integer proximoNumeroControle() {
        return alocacaoRepository.findAll(Sort.by(Sort.Direction.DESC, "numeroControle")).stream()
                .map(AlocacaoVeiculo::getNumeroControle)
                .findFirst().orElse(0) + 1;
    }

    private boolean correspondeBusca(AlocacaoVeiculo alocacao, String filtro) {
        return contem(alocacao.getNumeroControle().toString(), filtro)
                || contem(alocacao.getPlaca(), filtro)
                || contem(alocacao.getResponsavelNome(), filtro)
                || contem(alocacao.getSecretariaOrgao(), filtro)
                || contem(alocacao.getSetor(), filtro);
    }

    private boolean contem(String valor, String filtro) { return normalizar(valor).contains(filtro); }
    private String normalizar(String valor) { return valor == null ? null : valor.trim().toLowerCase(); }
    private String obrigatorio(String valor) {
        String normalizado = opcional(valor);
        if (normalizado == null) throw new BusinessException("Preencha os campos obrigatórios");
        return normalizado;
    }
    private String opcional(String valor) { return valor == null || valor.isBlank() ? null : valor.trim(); }
    private String normalizarPlaca(String placa) { return obrigatorio(placa).replace("-", "").toUpperCase(); }
    private String validarLinkConsulta(String valor) {
        String link = opcional(valor);
        if (link == null) return null;
        try {
            URI uri = URI.create(link);
            if (!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) {
                throw new BusinessException("O link de consulta deve começar com http:// ou https://");
            }
            return link;
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("Informe um link de consulta válido");
        }
    }
    private String resumoDados(AlocacaoVeiculo alocacao) {
        return alocacao.getSecretariaOrgao() + "|" + alocacao.getSetor() + "|" + alocacao.getLimiteAutorizado()
                + "|" + opcional(alocacao.getDocumentoReferencia()) + "|" + opcional(alocacao.getLinkConsulta())
                + "|" + opcional(alocacao.getObservacao());
    }
    private AlocacaoVeiculoResponse toResponse(AlocacaoVeiculo alocacao) {
        return new AlocacaoVeiculoResponse(alocacao.getId(), alocacao.getNumeroControle(), alocacao.getPlaca(),
                alocacao.getModelo(), alocacao.getMarca(), alocacao.getResponsavelNome(), alocacao.getSecretariaOrgao(),
                alocacao.getSetor(), alocacao.getLimiteAutorizado(), alocacao.getDocumentoReferencia(), alocacao.getLinkConsulta(), alocacao.getObservacao(),
                alocacao.getAtiva(), alocacao.getCriadaEm(), alocacao.getEncerradaEm());
    }
}
