package com.frota.checklist.service;

import com.frota.checklist.security.AutorizacaoService;
import com.frota.checklist.security.Permissao;
import com.frota.checklist.dto.AlocacaoVeiculoResponse;
import com.frota.checklist.dto.AtualizarDadosAlocacaoVeiculoRequest;
import com.frota.checklist.dto.CriarAlocacaoVeiculoRequest;
import com.frota.checklist.dto.HistoricoAlocacaoVeiculoResponse;
import com.frota.checklist.dto.TrocarResponsavelAlocacaoRequest;
import com.frota.checklist.dto.TrocarVeiculoAlocacaoRequest;
import com.frota.checklist.entity.AlocacaoVeiculo;
import com.frota.checklist.entity.HistoricoAlocacaoVeiculo;
import com.frota.checklist.entity.HistoricoVagaAdministrativa;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.entity.StatusVagaAdministrativa;
import com.frota.checklist.entity.TipoEventoAlocacaoVeiculo;
import com.frota.checklist.entity.TipoEventoVagaAdministrativa;
import com.frota.checklist.entity.VagaAdministrativa;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.AlocacaoVeiculoRepository;
import com.frota.checklist.repository.HistoricoAlocacaoVeiculoRepository;
import com.frota.checklist.repository.HistoricoVagaAdministrativaRepository;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.repository.VagaAdministrativaRepository;
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

    private final AutorizacaoService autorizacao;

    private final AlocacaoVeiculoRepository alocacaoRepository;
    private final HistoricoAlocacaoVeiculoRepository historicoRepository;
    private final HistoricoVagaAdministrativaRepository historicoVagaRepository;
    private final MotoristaRepository motoristaRepository;
    private final VagaAdministrativaRepository vagaRepository;

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
        VagaAdministrativa vaga = resolverVagaParaNovaAlocacao(request);
        alocacao.setVagaAdministrativa(vaga);
        alocacao.setNumeroControle(vaga.getNumeroControle());
        alocacao.setPlaca(placa);
        alocacao.setModelo(obrigatorio(request.modelo()));
        alocacao.setMarca(opcional(request.marca()));
        alocacao.setResponsavelNome(obrigatorio(request.responsavelNome()));
        alocacao.setSecretariaOrgao(vaga.getSecretariaOrgao());
        alocacao.setSetor(vaga.getSetor());
        alocacao.setLimiteAutorizado(vaga.getLimiteAutorizado());
        alocacao.setDocumentoReferencia(vaga.getDocumentoReferencia());
        alocacao.setLinkConsulta(validarLinkConsulta(request.linkConsulta()));
        alocacao.setObservacao(vaga.getObservacao());
        alocacao.setAtiva(true);
        alocacao.setCriadaEm(LocalDateTime.now());
        AlocacaoVeiculo salva = alocacaoRepository.save(alocacao);

        registrarHistorico(salva, administrador, TipoEventoAlocacaoVeiculo.CRIACAO,
                null, placa, null, salva.getResponsavelNome(), null, salva.getLimiteAutorizado(), salva.getObservacao());
        if (request.vagaAdministrativaId() == null) {
            registrarHistoricoVaga(salva.getVagaAdministrativa(), administrador, TipoEventoVagaAdministrativa.CRIACAO,
                    null, null, null, null, null, resumoDados(salva), "Vaga administrativa criada junto com a alocação.");
        }
        registrarHistoricoVaga(salva.getVagaAdministrativa(), administrador, TipoEventoVagaAdministrativa.OCUPACAO,
                null, placa, null, salva.getResponsavelNome(), null, resumoDados(salva), salva.getObservacao());
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
        sincronizarVaga(alocacao, StatusVagaAdministrativa.OCUPADA);
        AlocacaoVeiculo salva = alocacaoRepository.save(alocacao);
        String depois = resumoDados(salva);
        if (!antes.equals(depois)) {
            registrarHistorico(salva, administrador, TipoEventoAlocacaoVeiculo.ATUALIZACAO_DADOS,
                    salva.getPlaca(), salva.getPlaca(), null, null, limiteAnterior, salva.getLimiteAutorizado(),
                    "Dados atualizados v2: " + antes + " -> " + depois);
            registrarHistoricoVaga(salva.getVagaAdministrativa(), administrador, TipoEventoVagaAdministrativa.ATUALIZACAO_DADOS,
                    null, null, null, null, antes, depois, "Dados administrativos da vaga atualizados.");
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
        sincronizarVaga(alocacao, StatusVagaAdministrativa.OCUPADA);
        AlocacaoVeiculo salva = alocacaoRepository.save(alocacao);
        registrarHistorico(salva, administrador, TipoEventoAlocacaoVeiculo.TROCA_VEICULO,
                anterior, novaPlaca, null, null, null, null, obrigatorio(request.motivo()));
        registrarHistoricoVaga(salva.getVagaAdministrativa(), administrador, TipoEventoVagaAdministrativa.OCUPACAO,
                anterior, novaPlaca, null, salva.getResponsavelNome(), null, null, obrigatorio(request.motivo()));
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
        sincronizarVaga(alocacao, StatusVagaAdministrativa.OCUPADA);
        AlocacaoVeiculo salva = alocacaoRepository.save(alocacao);
        registrarHistorico(salva, administrador, TipoEventoAlocacaoVeiculo.TROCA_RESPONSAVEL,
                null, null, anterior, novoResponsavel, null, null, obrigatorio(request.motivo()));
        registrarHistoricoVaga(salva.getVagaAdministrativa(), administrador, TipoEventoVagaAdministrativa.OCUPACAO,
                salva.getPlaca(), salva.getPlaca(), anterior, novoResponsavel, null, null, obrigatorio(request.motivo()));
        return toResponse(salva);
    }

    @Transactional
    public AlocacaoVeiculoResponse encerrar(Long id, String motivo, Long administradorId) {
        Motorista administrador = validarAdministrador(administradorId);
        AlocacaoVeiculo alocacao = buscarAtiva(id);
        alocacao.setAtiva(false);
        alocacao.setEncerradaEm(LocalDateTime.now());
        sincronizarVaga(alocacao, StatusVagaAdministrativa.LIVRE);
        AlocacaoVeiculo salva = alocacaoRepository.save(alocacao);
        registrarHistorico(salva, administrador, TipoEventoAlocacaoVeiculo.ENCERRAMENTO,
                salva.getPlaca(), null, salva.getResponsavelNome(), null, salva.getLimiteAutorizado(), null, obrigatorio(motivo));
        registrarHistoricoVaga(salva.getVagaAdministrativa(), administrador, TipoEventoVagaAdministrativa.LIBERACAO,
                salva.getPlaca(), null, salva.getResponsavelNome(), null, resumoDados(salva), null, obrigatorio(motivo));
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

    private void registrarHistoricoVaga(VagaAdministrativa vaga, Motorista administrador, TipoEventoVagaAdministrativa tipo,
                                        String placaAnterior, String placaNova, String responsavelAnterior,
                                        String responsavelNovo, String dadosAnteriores, String dadosNovos,
                                        String observacao) {
        if (vaga == null) {
            return;
        }
        HistoricoVagaAdministrativa evento = new HistoricoVagaAdministrativa();
        evento.setVagaAdministrativa(vaga);
        evento.setAdministrador(administrador);
        evento.setTipo(tipo);
        evento.setPlacaAnterior(placaAnterior);
        evento.setPlacaNova(placaNova);
        evento.setResponsavelAnterior(responsavelAnterior);
        evento.setResponsavelNovo(responsavelNovo);
        evento.setDadosAnteriores(dadosAnteriores);
        evento.setDadosNovos(dadosNovos);
        evento.setObservacao(opcional(observacao));
        evento.setDataHora(LocalDateTime.now());
        historicoVagaRepository.save(evento);
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
        autorizacao.exigir(administrador.getId(), Permissao.ALOCACAO_GERIR);
        return administrador;
    }

    private Integer proximoNumeroControle() {
        int ultimoAlocacao = alocacaoRepository.findAll(Sort.by(Sort.Direction.DESC, "numeroControle")).stream()
                .map(AlocacaoVeiculo::getNumeroControle)
                .findFirst().orElse(0);
        int ultimaVaga = vagaRepository.findTopByOrderByNumeroControleDesc()
                .map(VagaAdministrativa::getNumeroControle)
                .orElse(0);
        return Math.max(ultimoAlocacao, ultimaVaga) + 1;
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
        if (!link.matches("(?i)^https?://.*")) {
            link = "https://" + link;
        }
        try {
            URI uri = URI.create(link);
            if ((!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) || uri.getHost() == null) {
                throw new BusinessException("Informe um link de consulta válido");
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

    private VagaAdministrativa resolverVagaParaNovaAlocacao(CriarAlocacaoVeiculoRequest request) {
        if (request.vagaAdministrativaId() != null) {
            VagaAdministrativa vaga = vagaRepository.findById(request.vagaAdministrativaId())
                    .orElseThrow(() -> new NotFoundException("Vaga administrativa nao encontrada"));
            if (vaga.getStatus() == StatusVagaAdministrativa.DESATIVADA) {
                throw new BusinessException("Nao e possivel ocupar uma vaga desativada.");
            }
            if (vaga.getStatus() == StatusVagaAdministrativa.OCUPADA
                    || alocacaoRepository.findByVagaAdministrativaIdAndAtivaTrue(vaga.getId()).isPresent()) {
                throw new BusinessException("Esta vaga ja esta ocupada.");
            }
            vaga.setStatus(StatusVagaAdministrativa.OCUPADA);
            return vagaRepository.save(vaga);
        }
        Integer numeroControle = proximoNumeroControle();
        return criarVagaParaNovaAlocacao(request, numeroControle);
    }

    private VagaAdministrativa criarVagaParaNovaAlocacao(CriarAlocacaoVeiculoRequest request, Integer numeroControle) {
        VagaAdministrativa vaga = new VagaAdministrativa();
        vaga.setNumeroControle(numeroControle);
        vaga.setSecretariaOrgao(obrigatorio(request.secretariaOrgao()));
        vaga.setSetor(obrigatorio(request.setor()));
        vaga.setLimiteAutorizado(obrigatorio(request.limiteAutorizado()));
        vaga.setDocumentoReferencia(opcional(request.documentoReferencia()));
        vaga.setObservacao(opcional(request.observacao()));
        vaga.setStatus(StatusVagaAdministrativa.OCUPADA);
        vaga.setCriadaEm(LocalDateTime.now());
        return vagaRepository.save(vaga);
    }

    private void sincronizarVaga(AlocacaoVeiculo alocacao, StatusVagaAdministrativa status) {
        VagaAdministrativa vaga = alocacao.getVagaAdministrativa();
        if (vaga == null) {
            return;
        }
        vaga.setSecretariaOrgao(alocacao.getSecretariaOrgao());
        vaga.setSetor(alocacao.getSetor());
        vaga.setLimiteAutorizado(alocacao.getLimiteAutorizado());
        vaga.setDocumentoReferencia(opcional(alocacao.getDocumentoReferencia()));
        vaga.setObservacao(opcional(alocacao.getObservacao()));
        vaga.setStatus(status);
        if (status == StatusVagaAdministrativa.LIVRE) {
            vaga.setEncerradaEm(null);
        }
        vagaRepository.save(vaga);
    }

    private AlocacaoVeiculoResponse toResponse(AlocacaoVeiculo alocacao) {
        VagaAdministrativa vaga = alocacao.getVagaAdministrativa();
        return new AlocacaoVeiculoResponse(alocacao.getId(), alocacao.getNumeroControle(), alocacao.getPlaca(),
                alocacao.getModelo(), alocacao.getMarca(), alocacao.getResponsavelNome(), alocacao.getSecretariaOrgao(),
                alocacao.getSetor(), alocacao.getLimiteAutorizado(), alocacao.getDocumentoReferencia(), alocacao.getLinkConsulta(), alocacao.getObservacao(),
                alocacao.getAtiva(), alocacao.getCriadaEm(), alocacao.getEncerradaEm(),
                vaga == null ? null : vaga.getId(),
                vaga == null ? null : vaga.getStatus().name());
    }
}
