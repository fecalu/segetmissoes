package com.frota.checklist.service;

import com.frota.checklist.security.AutorizacaoService;
import com.frota.checklist.security.Permissao;
import com.frota.checklist.dto.AdminVeiculoRequest;
import com.frota.checklist.entity.AuditoriaExclusaoVeiculo;
import com.frota.checklist.dto.HistoricoStatusVeiculoResponse;
import com.frota.checklist.dto.RegistrarRetornoUsoExternoRequest;
import com.frota.checklist.dto.RegistrarRetornoViagemRequest;
import com.frota.checklist.dto.RegistrarVeiculoEmUsoExternoRequest;
import com.frota.checklist.dto.RegistrarVeiculoEmViagemRequest;
import com.frota.checklist.dto.VeiculoResponse;
import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.HistoricoStatusVeiculo;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Missao;
import com.frota.checklist.entity.StatusMissao;
import com.frota.checklist.entity.OrigemRegistroUsoExterno;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.entity.RegistroUsoExternoVeiculo;
import com.frota.checklist.entity.RegistroViagemVeiculo;
import com.frota.checklist.entity.TipoDeslocamentoMissao;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.entity.VistoriaCompleta;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.AuditoriaExclusaoVeiculoRepository;
import com.frota.checklist.repository.ChecklistRepository;
import com.frota.checklist.repository.HistoricoStatusVeiculoRepository;
import com.frota.checklist.repository.MissaoRepository;
import com.frota.checklist.repository.MissaoExcecaoRepository;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.repository.RegistroUsoExternoVeiculoRepository;
import com.frota.checklist.repository.RegistroViagemVeiculoRepository;
import com.frota.checklist.repository.VeiculoRepository;
import com.frota.checklist.repository.VistoriaCompletaRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AdminVeiculoService {

    private final AutorizacaoService autorizacao;
    private final AuditoriaAdministrativaService auditoriaAdministrativa;

    private final VeiculoRepository veiculoRepository;
    private final ChecklistRepository checklistRepository;
    private final MotoristaRepository motoristaRepository;
    private final HistoricoStatusVeiculoRepository historicoStatusVeiculoRepository;
    private final MissaoRepository missaoRepository;
    private final MissaoExcecaoRepository missaoExcecaoRepository;
    private final RegistroViagemVeiculoRepository registroViagemVeiculoRepository;
    private final RegistroUsoExternoVeiculoRepository registroUsoExternoVeiculoRepository;
    private final VistoriaCompletaRepository vistoriaCompletaRepository;
    private final AuditoriaExclusaoVeiculoRepository auditoriaExclusaoVeiculoRepository;
    private final VeiculoStatusResolver veiculoStatusResolver;
    private final ConfiguracaoRotuloStatusVeiculoService configuracaoRotuloStatusVeiculoService;
    private final MissaoService missaoService;
    private final PasswordEncoder passwordEncoder;

    public List<VeiculoResponse> listar(String buscaPlaca) {
        String filtro = buscaPlaca == null ? "" : normalizarPlaca(buscaPlaca);
        List<Veiculo> veiculos = veiculoRepository.findAll(Sort.by(Sort.Direction.ASC, "placa")).stream()
                .filter(v -> filtro.isBlank() || normalizarPlaca(v.getPlaca()).contains(filtro))
                .toList();
        Map<Long, VeiculoStatusSnapshot> snapshots = veiculoStatusResolver.resolverPorVeiculos(veiculos);
        Map<Long, RegistroViagemVeiculo> viagensAtivas = carregarViagensAtivasPorVeiculo(veiculos);
        Map<Long, RegistroUsoExternoVeiculo> usosExternosAtivos = carregarUsosExternosAtivosPorVeiculo(veiculos);
        Map<Long, VistoriaCompleta> vistoriasSaidaRecentes = carregarUltimasVistoriasSaidaPorVeiculo(veiculos);
        Map<StatusVeiculo, String> rotulos = configuracaoRotuloStatusVeiculoService.mapaRotulosAtuais();
        return veiculos.stream()
                .map(v -> toResponse(v, snapshots.get(v.getId()), rotulos, viagensAtivas.get(v.getId()), usosExternosAtivos.get(v.getId()), vistoriasSaidaRecentes.get(v.getId())))
                .toList();
    }

    public VeiculoResponse criar(AdminVeiculoRequest request) {
        autorizacao.exigir(Permissao.VEICULO_GERIR);
        String placa = normalizarPlaca(request.placa());
        if (veiculoRepository.existsByPlaca(placa)) {
            throw new BusinessException("Placa ja cadastrada");
        }

        Veiculo veiculo = new Veiculo();
        veiculo.setPlaca(placa);
        veiculo.setModelo(request.modelo().trim());
        veiculo.setMarca(request.marca().trim());
        veiculo.setDesativado(false);
        veiculo.setStatusAdministrativo(StatusVeiculo.AGUARDANDO_REALOCACAO);

        return toResponse(veiculoRepository.save(veiculo));
    }

    public VeiculoResponse editar(Long id, AdminVeiculoRequest request) {
        autorizacao.exigir(Permissao.VEICULO_GERIR);
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));

        String placa = normalizarPlaca(request.placa());
        if (veiculoRepository.existsByPlacaAndIdNot(placa, id)) {
            throw new BusinessException("Placa ja cadastrada");
        }

        veiculo.setPlaca(placa);
        veiculo.setModelo(request.modelo().trim());
        veiculo.setMarca(request.marca().trim());

        return toResponse(veiculoRepository.save(veiculo));
    }

    @Transactional
    public VeiculoResponse atualizarLocalizacaoOperacional(Long id, String localizacaoOperacional) {
        autorizacao.exigir(Permissao.FROTA_OPERAR);
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        String localizacaoNormalizada = normalizarTextoOpcional(localizacaoOperacional);
        if (localizacaoNormalizada != null && localizacaoNormalizada.length() > 80) {
            throw new BusinessException("Localizacao operacional deve ter no maximo 80 caracteres");
        }
        veiculo.setLocalizacaoOperacional(localizacaoNormalizada);
        return toResponse(veiculoRepository.save(veiculo));
    }

    @Transactional
    public VeiculoResponse desativar(Long id, Long administradorId, String justificativa) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = autorizacao.exigir(administradorId, Permissao.VEICULO_GERIR);
        if (administrador.getPerfil() == Perfil.GESTOR && (justificativa == null || justificativa.trim().length() < 10))
            throw new BusinessException("Informe uma justificativa com pelo menos 10 caracteres");
        auditoriaAdministrativa.registrar(administrador, "VEICULO", id, "DESATIVAR", null, null, null, justificativa);
        if (Boolean.TRUE.equals(veiculo.getDesativado())) {
            return toResponse(veiculo);
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        if (snapshotAntes.statusAutomatico().isDeslocamentoAtivo()) {
            throw new BusinessException("Nao e possivel desativar veiculo em missao. Registre a chegada primeiro");
        }

        veiculo.setDesativado(true);
        veiculo.setStatusAdministrativo(StatusVeiculo.BLOQUEADO);
        limparLocalizacaoOperacional(veiculo);
        Veiculo salvo = veiculoRepository.save(veiculo);
        encerrarViagemAtivaSeNecessario(salvo, snapshotAntes.statusAtual(), StatusVeiculo.BLOQUEADO, administrador);

        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), StatusVeiculo.BLOQUEADO);

        return toResponse(salvo);
    }

    @Transactional
    public VeiculoResponse reativar(Long id, Long administradorId, String justificativa) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = autorizacao.exigir(administradorId, Permissao.VEICULO_GERIR);
        if (administrador.getPerfil() == Perfil.GESTOR && (justificativa == null || justificativa.trim().length() < 10))
            throw new BusinessException("Informe uma justificativa com pelo menos 10 caracteres");
        auditoriaAdministrativa.registrar(administrador, "VEICULO", id, "REATIVAR", null, null, null, justificativa);
        if (!Boolean.TRUE.equals(veiculo.getDesativado())) {
            return toResponse(veiculo);
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        veiculo.setDesativado(false);
        veiculo.setStatusAdministrativo(null);
        limparLocalizacaoOperacional(veiculo);
        Veiculo salvo = veiculoRepository.save(veiculo);
        VeiculoStatusSnapshot snapshotDepois = veiculoStatusResolver.resolver(salvo);
        encerrarViagemAtivaSeNecessario(salvo, snapshotAntes.statusAtual(), snapshotDepois.statusAtual(), administrador);

        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), snapshotDepois.statusAtual());

        return toResponse(salvo);
    }

    @Transactional
    public VeiculoResponse atualizarStatusAdministrativo(Long id, StatusVeiculo novoStatusAdministrativo, Long administradorId, String justificativa) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = validarAdministrador(administradorId);

        StatusVeiculo novoStatusNormalizado = StatusVeiculo.normalizarStatusAdministrativo(novoStatusAdministrativo);
        if (novoStatusAdministrativo != null && novoStatusNormalizado == null) {
            throw new BusinessException("Status administrativo invalido");
        }
        if (novoStatusNormalizado == StatusVeiculo.EM_VIAGEM) {
            throw new BusinessException("Use o registro de viagem para colocar o veiculo em viagem");
        }
        if (novoStatusNormalizado == StatusVeiculo.EM_USO_EXTERNO) {
            throw new BusinessException("Use o registro de uso externo para colocar o veiculo em uso externo");
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        if (administrador.getPerfil() == Perfil.OPERADOR) {
            autorizacao.validarInicio(administrador, veiculo, snapshotAntes.statusAtual());
            if (novoStatusNormalizado != null && novoStatusNormalizado != StatusVeiculo.NO_PATIO)
                throw new org.springframework.security.access.AccessDeniedException("Esta alteracao precisa de um Gestor ou Administrador");
            if (justificativa == null || justificativa.trim().length() < 10)
                throw new BusinessException("Informe o motivo da correcao com pelo menos 10 caracteres");
        }
        if (snapshotAntes.statusAdministrativo() == novoStatusNormalizado) {
            return toResponse(veiculo);
        }
        if (registroUsoExternoVeiculoRepository.findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(id).isPresent()) {
            throw new BusinessException("Use o retorno de uso externo para retirar o veiculo de uso externo");
        }

        veiculo.setStatusAdministrativo(novoStatusNormalizado);
        limparLocalizacaoOperacional(veiculo);
        Veiculo salvo = veiculoRepository.save(veiculo);

        VeiculoStatusSnapshot snapshotDepois = veiculoStatusResolver.resolver(salvo);
        encerrarViagemAtivaSeNecessario(salvo, snapshotAntes.statusAtual(), snapshotDepois.statusAtual(), administrador);

        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), snapshotDepois.statusAtual(), justificativa);

        return toResponse(salvo);
    }

    @Transactional
    public VeiculoResponse registrarEmViagem(Long id, RegistrarVeiculoEmViagemRequest request, Long administradorId) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = validarAdministrador(administradorId);
        Motorista motoristaViagem = motoristaRepository.findById(request.motoristaId())
                .orElseThrow(() -> new NotFoundException("Motorista nao encontrado"));

        if (Boolean.TRUE.equals(veiculo.getDesativado())) {
            throw new BusinessException("Veiculo desativado nao pode ser colocado em viagem");
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        autorizacao.validarInicio(administrador, veiculo, snapshotAntes.statusAtual());
        if (snapshotAntes.statusAutomatico().isDeslocamentoAtivo()) {
            throw new BusinessException("Nao e possivel colocar em viagem um veiculo com missao em andamento");
        }
        if (snapshotAntes.statusAtual() == StatusVeiculo.EM_VIAGEM) {
            throw new BusinessException("Este veiculo ja esta em viagem");
        }
        if (registroViagemVeiculoRepository.findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(id).isPresent()) {
            throw new BusinessException("Ja existe um registro de viagem em aberto para este veiculo");
        }
        String justificativaAbertura = trimToNull(request.observacao());
        if (justificativaAbertura == null || justificativaAbertura.length() < 10) {
            justificativaAbertura = "Viagem registrada manualmente pela administracao.";
        }

        if (motoristaViagem.getPerfil() != Perfil.MOTORISTA) throw new BusinessException("Selecione um motorista valido");
        missaoService.abrirRegistroAdministrativo(
                administrador,
                motoristaViagem,
                veiculo,
                request.dataHoraSaida(),
                TipoDeslocamentoMissao.VIAGEM,
                request.localDestino(),
                request.setorSolicitante(),
                request.solicitanteNome()
        );

        Veiculo salvo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        return toResponse(salvo);
    }

    @Transactional
    public VeiculoResponse registrarRetornoViagem(Long id, RegistrarRetornoViagemRequest request, Long administradorId) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = validarAdministrador(administradorId);
        StatusVeiculo destinoRetorno = validarDestinoRetornoViagem(request.statusAdministrativoDestino());
        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        Optional<com.frota.checklist.entity.Missao> missaoViagemAtiva = missaoRepository
                .findFirstByVeiculoIdAndStatusOrderByDataHoraInicioDesc(id, com.frota.checklist.entity.StatusMissao.ATIVA)
                .filter(missao -> missao.getTipoDeslocamento() == TipoDeslocamentoMissao.VIAGEM);
        if (missaoViagemAtiva.isPresent()) {
            autorizacao.validarRetornoMissao(administrador, missaoViagemAtiva.get());
            if (request.dataHoraRetorno() == null || !request.dataHoraRetorno().isAfter(missaoViagemAtiva.get().getDataHoraInicio()))
                throw new BusinessException("O retorno deve ser posterior a saida");
            if (missaoViagemAtiva.get().getOrigemAbertura() == com.frota.checklist.entity.OrigemAberturaMissao.REGISTRO_ADMINISTRATIVO) {
                missaoService.encerrarRegistroAdministrativo(missaoViagemAtiva.get(), administrador, request.dataHoraRetorno());
                return aplicarDestinoRetornoViagem(id, administrador, snapshotAntes, destinoRetorno);
            }
            missaoService.encerrarPendenteAdministrativamente(
                    missaoViagemAtiva.get(),
                    administrador,
                    request.dataHoraRetorno(),
                    request.justificativaSemChecklist().trim()
            );
            return aplicarDestinoRetornoViagem(id, administrador, snapshotAntes, destinoRetorno);
        }
        RegistroViagemVeiculo viagem = registroViagemVeiculoRepository
                .findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(id)
                .orElseThrow(() -> new BusinessException("Nao existe registro de viagem em aberto para este veiculo"));

        if (administrador.getPerfil() == Perfil.OPERADOR && (Boolean.TRUE.equals(veiculo.getDesativado())
                || snapshotAntes.statusAtual() != StatusVeiculo.EM_VIAGEM))
            throw new org.springframework.security.access.AccessDeniedException("Este retorno precisa de um Gestor ou Administrador");
        if (!request.dataHoraRetorno().isAfter(viagem.getDataHoraSaida()))
            throw new BusinessException("O retorno deve ser posterior a saida");
        viagem.setDataHoraRetorno(request.dataHoraRetorno());
        viagem.setObservacaoRetorno(trimToNull(request.observacao()));
        viagem.setJustificativaSemChecklistRetorno(request.justificativaSemChecklist().trim());
        viagem.setAdministradorEncerramento(administrador);
        registroViagemVeiculoRepository.save(viagem);

        veiculo.setStatusAdministrativo(destinoRetorno);
        limparLocalizacaoOperacional(veiculo);
        Veiculo salvo = veiculoRepository.save(veiculo);
        VeiculoStatusSnapshot snapshotDepois = veiculoStatusResolver.resolver(salvo);
        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), snapshotDepois.statusAtual());
        return toResponse(salvo);
    }

    private VeiculoResponse aplicarDestinoRetornoViagem(
            Long veiculoId,
            Motorista administrador,
            VeiculoStatusSnapshot snapshotAntes,
            StatusVeiculo destinoRetorno
    ) {
        Veiculo veiculo = veiculoRepository.findById(veiculoId)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        veiculo.setStatusAdministrativo(destinoRetorno);
        limparLocalizacaoOperacional(veiculo);
        Veiculo salvo = veiculoRepository.save(veiculo);
        VeiculoStatusSnapshot snapshotDepois = veiculoStatusResolver.resolver(salvo);
        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), snapshotDepois.statusAtual());
        return toResponse(salvo);
    }

    private StatusVeiculo validarDestinoRetornoViagem(StatusVeiculo statusAdministrativoDestino) {
        if (statusAdministrativoDestino == null) {
            return StatusVeiculo.AGUARDANDO_REALOCACAO;
        }
        StatusVeiculo destinoNormalizado = StatusVeiculo.normalizarStatusAdministrativo(statusAdministrativoDestino);
        if (destinoNormalizado != null
                && destinoNormalizado != StatusVeiculo.NO_PATIO
                && destinoNormalizado != StatusVeiculo.AGUARDANDO_REALOCACAO
                && destinoNormalizado != StatusVeiculo.BLOQUEADO) {
            throw new BusinessException("Status de retorno invalido");
        }
        return destinoNormalizado;
    }

    @Transactional
    public VeiculoResponse registrarEmUsoExterno(Long id, RegistrarVeiculoEmUsoExternoRequest request, Long administradorId) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = validarAdministrador(administradorId);

        if (Boolean.TRUE.equals(veiculo.getDesativado())) {
            throw new BusinessException("Veiculo desativado nao pode ser colocado em uso externo");
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        autorizacao.validarInicio(administrador, veiculo, snapshotAntes.statusAtual());
        if (snapshotAntes.statusAutomatico().isDeslocamentoAtivo()) {
            throw new BusinessException("Nao e possivel colocar em uso externo um veiculo com missao em andamento");
        }
        if (snapshotAntes.statusAtual() == StatusVeiculo.EM_USO_EXTERNO) {
            throw new BusinessException("Este veiculo ja esta em uso externo");
        }
        if (registroUsoExternoVeiculoRepository.findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(id).isPresent()) {
            throw new BusinessException("Ja existe um registro de uso externo em aberto para este veiculo");
        }

        RegistroUsoExternoVeiculo registro = new RegistroUsoExternoVeiculo();
        registro.setVeiculo(veiculo);
        registro.setAdministradorRegistro(administrador);
        registro.setNomeEntreguePara(request.nomeEntreguePara().trim());
        registro.setTipoUsoExterno(request.tipoUsoExterno());
        registro.setObservacaoSaida(trimToNull(request.observacao()));
        registro.setJustificativaSemVistoriaAbertura(request.justificativaSemVistoria().trim());
        registro.setOrigemAbertura(OrigemRegistroUsoExterno.CONTINGENCIA_ADMIN);
        registro.setDataHoraSaida(request.dataHoraSaida());
        registroUsoExternoVeiculoRepository.save(registro);

        veiculo.setStatusAdministrativo(StatusVeiculo.EM_USO_EXTERNO);
        limparLocalizacaoOperacional(veiculo);
        Veiculo salvo = veiculoRepository.save(veiculo);

        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), StatusVeiculo.EM_USO_EXTERNO);
        return toResponse(salvo);
    }

    @Transactional
    public VeiculoResponse registrarRetornoUsoExterno(Long id, RegistrarRetornoUsoExternoRequest request, Long administradorId) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = validarAdministrador(administradorId);
        if (administrador.getPerfil() == Perfil.OPERADOR && (Boolean.TRUE.equals(veiculo.getDesativado())
                || veiculoStatusResolver.resolver(veiculo).statusAtual() != StatusVeiculo.EM_USO_EXTERNO
                || request.statusAdministrativoDestino() != StatusVeiculo.AGUARDANDO_REALOCACAO))
            throw new org.springframework.security.access.AccessDeniedException("Registre o recebimento em Aguardando realocacao. A liberacao depende do Gestor.");
        RegistroUsoExternoVeiculo registro = obterOuCriarRegistroUsoExternoAbertoParaRetorno(veiculo);

        StatusVeiculo destinoNormalizado = StatusVeiculo.normalizarStatusAdministrativo(request.statusAdministrativoDestino());
        if (request.statusAdministrativoDestino() != null && destinoNormalizado == null) {
            throw new BusinessException("Status de retorno invalido");
        }
        if (destinoNormalizado == StatusVeiculo.EM_USO_EXTERNO) {
            throw new BusinessException("O retorno do uso externo precisa mover o veiculo para outra coluna");
        }
        if (destinoNormalizado == StatusVeiculo.EM_VIAGEM) {
            throw new BusinessException("Receba o veiculo primeiro. Depois registre a viagem em um novo passo");
        }

        VeiculoStatusSnapshot snapshotAntes = veiculoStatusResolver.resolver(veiculo);
        registro.setNomeRecebidoDe(request.nomeRecebidoDe().trim());
        registro.setObservacaoRetorno(trimToNull(request.observacao()));
        registro.setJustificativaSemVistoriaRetorno(request.justificativaSemVistoria().trim());
        registro.setOrigemRetorno(OrigemRegistroUsoExterno.CONTINGENCIA_ADMIN);
        registro.setDataHoraRetorno(request.dataHoraRetorno());
        registro.setAdministradorEncerramento(administrador);
        registroUsoExternoVeiculoRepository.save(registro);

        veiculo.setStatusAdministrativo(destinoNormalizado);
        limparLocalizacaoOperacional(veiculo);
        Veiculo salvo = veiculoRepository.save(veiculo);
        VeiculoStatusSnapshot snapshotDepois = veiculoStatusResolver.resolver(salvo);
        registrarHistoricoStatus(salvo, administrador, snapshotAntes.statusAtual(), snapshotDepois.statusAtual());
        return toResponse(salvo);
    }

    private RegistroUsoExternoVeiculo obterOuCriarRegistroUsoExternoAbertoParaRetorno(Veiculo veiculo) {
        Optional<RegistroUsoExternoVeiculo> registroExistente = registroUsoExternoVeiculoRepository
                .findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(veiculo.getId());
        if (registroExistente.isPresent()) {
            return registroExistente.get();
        }

        VeiculoStatusSnapshot snapshotAtual = veiculoStatusResolver.resolver(veiculo);
        if (snapshotAtual.statusAtual() != StatusVeiculo.EM_USO_EXTERNO) {
            throw new BusinessException("Nao existe registro de uso externo em aberto para este veiculo");
        }

        VistoriaCompleta vistoriaSaida = vistoriaCompletaRepository
                .findTopByVeiculoIdAndTipoOperacaoOrderByDataHoraDescIdDesc(veiculo.getId(), TipoOperacao.SAIDA)
                .orElseThrow(() -> new BusinessException("Nao existe registro de uso externo em aberto para este veiculo"));

        RegistroUsoExternoVeiculo registro = new RegistroUsoExternoVeiculo();
        registro.setVeiculo(veiculo);
        registro.setAdministradorRegistro(null);
        registro.setNomeEntreguePara(vistoriaSaida.getNomeContraparte());
        registro.setTipoUsoExterno(vistoriaSaida.getTipoUsoExterno());
        registro.setObservacaoSaida(vistoriaSaida.getObservacaoGeral());
        registro.setOrigemAbertura(OrigemRegistroUsoExterno.COM_VISTORIA);
        registro.setDataHoraSaida(vistoriaSaida.getDataHora());
        registro.setVistoriaSaidaId(vistoriaSaida.getId());
        return registroUsoExternoVeiculoRepository.save(registro);
    }

    public List<HistoricoStatusVeiculoResponse> listarHistoricoStatus(Long veiculoId) {
        if (!veiculoRepository.existsById(veiculoId)) {
            throw new NotFoundException("Veiculo nao encontrado");
        }
        return historicoStatusVeiculoRepository.findByVeiculoIdOrderByDataHoraDesc(veiculoId).stream()
                .map(h -> new HistoricoStatusVeiculoResponse(
                        h.getId(),
                        h.getVeiculo().getId(),
                        h.getVeiculo().getPlaca(),
                        h.getStatusAnterior(),
                        h.getStatusNovo(),
                        h.getAdministrador().getId(),
                        h.getAdministrador().getNome(),
                        h.getDataHora(), h.getAdministradorPerfil(), h.getJustificativa()
                ))
                .toList();
    }

    @Transactional
    public void excluir(Long id) {
        autorizacao.exigir(Permissao.CADASTRO_EXCLUIR);
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        if (checklistRepository.existsByVeiculoId(id)) {
            throw new BusinessException("Nao e possivel excluir veiculo com checklists vinculados");
        }
        registroViagemVeiculoRepository.deleteByVeiculoId(id);
        registroUsoExternoVeiculoRepository.deleteByVeiculoId(id);
        historicoStatusVeiculoRepository.deleteByVeiculoId(id);
        veiculoRepository.delete(veiculo);
    }

    @Transactional
    public void excluirDefinitivamente(Long id, Long administradorId, String senhaAdmin, String justificativa) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));

        autorizacao.exigir(administrador.getId(), Permissao.CADASTRO_EXCLUIR);
        if (!Boolean.TRUE.equals(veiculo.getDesativado())) {
            throw new BusinessException("Desative o veiculo antes da exclusao definitiva");
        }
        if (senhaAdmin == null || senhaAdmin.isBlank() || !passwordEncoder.matches(senhaAdmin, administrador.getSenha())) {
            throw new BusinessException("Senha do administrador invalida");
        }
        if (justificativa == null || justificativa.trim().length() < 10) {
            throw new BusinessException("Justificativa obrigatoria com no minimo 10 caracteres");
        }

        VeiculoStatusSnapshot snapshot = veiculoStatusResolver.resolver(veiculo);
        if (snapshot.statusAutomatico().isDeslocamentoAtivo()) {
            throw new BusinessException("Nao e possivel excluir definitivamente um veiculo com missao em aberto");
        }

        long totalChecklists = checklistRepository.countByVeiculoId(id);
        long totalExcecoes = missaoExcecaoRepository.countByVeiculoId(id);
        long totalMissoes = missaoRepository.countByVeiculoId(id);
        long totalVistorias = vistoriaCompletaRepository.countByVeiculoId(id);
        if (totalChecklists > 0 || totalExcecoes > 0 || totalMissoes > 0 || totalVistorias > 0) {
            throw new BusinessException(
                    "Este veiculo possui historico operacional vinculado. Use Desativar/Baixar para manter a auditoria e remover da operacao."
            );
        }

        Optional<Checklist> primeiroChecklist = checklistRepository.findTopByVeiculoIdOrderByDataHoraAscIdAsc(id);
        Optional<Checklist> ultimoChecklist = checklistRepository.findTopByVeiculoIdOrderByDataHoraDescIdDesc(id);

        AuditoriaExclusaoVeiculo auditoria = new AuditoriaExclusaoVeiculo();
        auditoria.setVeiculoIdOriginal(veiculo.getId());
        auditoria.setPlaca(veiculo.getPlaca());
        auditoria.setModelo(veiculo.getModelo());
        auditoria.setMarca(veiculo.getMarca());
        auditoria.setDesativado(Boolean.TRUE.equals(veiculo.getDesativado()));
        auditoria.setStatusAdministrativo(veiculo.getStatusAdministrativo() != null ? veiculo.getStatusAdministrativo().name() : null);
        auditoria.setTotalChecklists(totalChecklists);
        auditoria.setDataPrimeiroChecklist(primeiroChecklist.map(Checklist::getDataHora).orElse(null));
        auditoria.setDataUltimoChecklist(ultimoChecklist.map(Checklist::getDataHora).orElse(null));
        auditoria.setTotalExcecoes(totalExcecoes);
        auditoria.setAdministrador(administrador);
        auditoria.setJustificativa(justificativa.trim());
        auditoriaExclusaoVeiculoRepository.save(auditoria);

        missaoExcecaoRepository.deleteAll(missaoExcecaoRepository.findByVeiculoId(id));
        checklistRepository.deleteAll(checklistRepository.findByVeiculoId(id));
        registroViagemVeiculoRepository.deleteByVeiculoId(id);
        registroUsoExternoVeiculoRepository.deleteByVeiculoId(id);
        historicoStatusVeiculoRepository.deleteByVeiculoId(id);
        veiculoRepository.delete(veiculo);
    }

    private String normalizarPlaca(String placa) {
        return placa == null ? "" : placa.replace("-", "").trim().toUpperCase(Locale.ROOT);
    }

    private String normalizarTextoOpcional(String valor) {
        if (valor == null || valor.trim().isBlank()) {
            return null;
        }
        return valor.trim();
    }

    private VeiculoResponse toResponse(Veiculo veiculo) {
        Map<StatusVeiculo, String> rotulos = configuracaoRotuloStatusVeiculoService.mapaRotulosAtuais();
        return toResponse(
                veiculo,
                veiculoStatusResolver.resolver(veiculo),
                rotulos,
                registroViagemVeiculoRepository.findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(veiculo.getId()).orElse(null),
                registroUsoExternoVeiculoRepository.findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(veiculo.getId()).orElse(null),
                vistoriaCompletaRepository.findTopByVeiculoIdAndTipoOperacaoOrderByDataHoraDescIdDesc(veiculo.getId(), TipoOperacao.SAIDA).orElse(null)
        );
    }

    private VeiculoResponse toResponse(
            Veiculo veiculo,
            VeiculoStatusSnapshot snapshot,
            Map<StatusVeiculo, String> rotulos,
            RegistroViagemVeiculo viagemAtiva,
            RegistroUsoExternoVeiculo usoExternoAtivo,
            VistoriaCompleta vistoriaSaidaRecente
    ) {
        StatusVeiculo statusAutomaticoEfetivo = snapshot.statusAutomatico();
        Long motoristaAtualIdEfetivo = snapshot.motoristaAtualId();
        String motoristaAtualNomeEfetivo = snapshot.motoristaAtualNome();
        if (snapshot.statusAtual() == StatusVeiculo.EM_VIAGEM && viagemAtiva != null && motoristaAtualIdEfetivo == null) {
            statusAutomaticoEfetivo = StatusVeiculo.EM_VIAGEM;
            motoristaAtualIdEfetivo = viagemAtiva.getMotorista().getId();
            motoristaAtualNomeEfetivo = viagemAtiva.getMotorista().getNome();
        }

        String statusAtualRotulo = rotulos.getOrDefault(snapshot.statusAtual(), snapshot.statusAtual().name());
        String statusAutomaticoRotulo = rotulos.getOrDefault(statusAutomaticoEfetivo, statusAutomaticoEfetivo.name());
        String statusAdministrativoRotulo = snapshot.statusAdministrativo() == null
                ? null
                : rotulos.getOrDefault(snapshot.statusAdministrativo(), snapshot.statusAdministrativo().name());
        UsoExternoContexto usoExterno = resolverUsoExternoContexto(snapshot, usoExternoAtivo, vistoriaSaidaRecente);

        return new VeiculoResponse(
                veiculo.getId(),
                veiculo.getPlaca(),
                veiculo.getModelo(),
                veiculo.getMarca(),
                veiculo.getLocalizacaoOperacional(),
                Boolean.TRUE.equals(veiculo.getDesativado()),
                snapshot.statusAtual(),
                statusAutomaticoEfetivo,
                snapshot.statusAdministrativo(),
                motoristaAtualIdEfetivo,
                motoristaAtualNomeEfetivo,
                statusAtualRotulo,
                statusAutomaticoRotulo,
                statusAdministrativoRotulo,
                viagemAtiva != null ? viagemAtiva.getId() : null,
                viagemAtiva != null ? viagemAtiva.getMotorista().getId() : null,
                viagemAtiva != null ? viagemAtiva.getMotorista().getNome() : null,
                viagemAtiva != null ? viagemAtiva.getLocalDestino() : null,
                viagemAtiva != null ? viagemAtiva.getObservacao() : null,
                viagemAtiva != null ? viagemAtiva.getDataHoraSaida() : null,
                usoExterno.registroId(),
                usoExterno.nomeContraparte(),
                usoExterno.tipoUsoExterno(),
                usoExterno.observacaoSaida(),
                usoExterno.dataHoraSaida(),
                usoExterno.origem(),
                usoExterno.vistoriaId()
        );
    }

    // Only called inside the transaction that has just finalized the mission.
    void aplicarDestinoDeRetorno(Missao missao, StatusVeiculo destino, Long autorId) {
        Motorista autor = autorizacao.exigir(autorId, Permissao.MISSAO_REGISTRAR);
        // Origin was checked before finalization; the vehicle may now be awaiting reallocation.
        if (autor.getPerfil() == Perfil.OPERADOR
                && missao.getOrigemAbertura() != com.frota.checklist.entity.OrigemAberturaMissao.REGISTRO_ADMINISTRATIVO)
            throw new org.springframework.security.access.AccessDeniedException("Encerramento excepcional nao permitido");
        autorizacao.validarDestinoRetorno(autor, destino);
        if (missao.getStatus() == StatusMissao.ATIVA) {
            throw new BusinessException("Finalize a missao antes de registrar seu destino de retorno");
        }
        Veiculo veiculo = missao.getVeiculo();
        VeiculoStatusSnapshot antes = veiculoStatusResolver.resolver(veiculo);
        veiculo.setStatusAdministrativo(destino);
        limparLocalizacaoOperacional(veiculo);
        veiculoRepository.save(veiculo);
        registrarHistoricoStatus(veiculo, autor, antes.statusAtual(), veiculoStatusResolver.resolver(veiculo).statusAtual(),
                "Destino registrado no retorno da missao " + missao.getId());
    }

    private Motorista validarAdministrador(Long administradorId) {
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));
        autorizacao.exigir(administrador.getId(), Permissao.FROTA_OPERAR);
        return administrador;
    }

    private void registrarHistoricoStatus(
            Veiculo veiculo,
            Motorista administrador,
            StatusVeiculo statusAnterior,
            StatusVeiculo statusNovo
    ) {
        registrarHistoricoStatus(veiculo, administrador, statusAnterior, statusNovo, null);
    }

    private void registrarHistoricoStatus(Veiculo veiculo, Motorista administrador, StatusVeiculo statusAnterior,
                                          StatusVeiculo statusNovo, String justificativa) {
        HistoricoStatusVeiculo historico = new HistoricoStatusVeiculo();
        historico.setJustificativa(justificativa);
        historico.setAdministradorPerfil(administrador.getPerfil());
        historico.setVeiculo(veiculo);
        historico.setAdministrador(administrador);
        historico.setStatusAnterior(statusAnterior);
        historico.setStatusNovo(statusNovo);
        historicoStatusVeiculoRepository.save(historico);
    }

    private void limparLocalizacaoOperacional(Veiculo veiculo) {
        veiculo.setLocalizacaoOperacional(null);
    }

    private void encerrarViagemAtivaSeNecessario(
            Veiculo veiculo,
            StatusVeiculo statusAnterior,
            StatusVeiculo statusNovo,
            Motorista administrador
    ) {
        if (statusAnterior != StatusVeiculo.EM_VIAGEM || statusNovo == StatusVeiculo.EM_VIAGEM) {
            return;
        }
        registroViagemVeiculoRepository
                .findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(veiculo.getId())
                .ifPresent(viagem -> {
                    viagem.setDataHoraRetorno(java.time.LocalDateTime.now());
                    viagem.setAdministradorEncerramento(administrador);
                    registroViagemVeiculoRepository.save(viagem);
                });
    }

    private Map<Long, RegistroViagemVeiculo> carregarViagensAtivasPorVeiculo(List<Veiculo> veiculos) {
        if (veiculos.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = veiculos.stream().map(Veiculo::getId).toList();
        Map<Long, RegistroViagemVeiculo> viagens = new java.util.HashMap<>();
        registroViagemVeiculoRepository.findByVeiculoIdInAndDataHoraRetornoIsNull(ids)
                .forEach(viagem -> viagens.put(viagem.getVeiculo().getId(), viagem));
        return viagens;
    }

    private Map<Long, RegistroUsoExternoVeiculo> carregarUsosExternosAtivosPorVeiculo(List<Veiculo> veiculos) {
        if (veiculos.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = veiculos.stream().map(Veiculo::getId).toList();
        Map<Long, RegistroUsoExternoVeiculo> usosExternos = new java.util.HashMap<>();
        registroUsoExternoVeiculoRepository.findByVeiculoIdInAndDataHoraRetornoIsNull(ids)
                .forEach(registro -> usosExternos.put(registro.getVeiculo().getId(), registro));
        return usosExternos;
    }

    private Map<Long, VistoriaCompleta> carregarUltimasVistoriasSaidaPorVeiculo(List<Veiculo> veiculos) {
        if (veiculos.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = veiculos.stream().map(Veiculo::getId).toList();
        Map<Long, VistoriaCompleta> vistorias = new java.util.HashMap<>();
        vistoriaCompletaRepository.findByVeiculoIdInAndTipoOperacaoOrderByDataHoraDescIdDesc(ids, TipoOperacao.SAIDA)
                .forEach(vistoria -> vistorias.putIfAbsent(vistoria.getVeiculo().getId(), vistoria));
        return vistorias;
    }

    private UsoExternoContexto resolverUsoExternoContexto(
            VeiculoStatusSnapshot snapshot,
            RegistroUsoExternoVeiculo usoExternoAtivo,
            VistoriaCompleta vistoriaSaidaRecente
    ) {
        if (usoExternoAtivo != null) {
            boolean possuiVistoriaSaida = usoExternoAtivo.getVistoriaSaidaId() != null;
            return new UsoExternoContexto(
                    usoExternoAtivo.getId(),
                    usoExternoAtivo.getNomeEntreguePara(),
                    usoExternoAtivo.getTipoUsoExterno() != null ? usoExternoAtivo.getTipoUsoExterno().name() : null,
                    usoExternoAtivo.getObservacaoSaida(),
                    usoExternoAtivo.getDataHoraSaida(),
                    possuiVistoriaSaida ? "VISTORIA_COMPLETA" : "REGISTRO_MANUAL",
                    usoExternoAtivo.getVistoriaSaidaId()
            );
        }

        if (snapshot.statusAtual() == StatusVeiculo.EM_USO_EXTERNO
                && vistoriaSaidaRecente != null
                && vistoriaSaidaRecente.getTipoOperacao() == TipoOperacao.SAIDA) {
            return new UsoExternoContexto(
                    null,
                    vistoriaSaidaRecente.getNomeContraparte(),
                    vistoriaSaidaRecente.getTipoUsoExterno() != null ? vistoriaSaidaRecente.getTipoUsoExterno().name() : null,
                    vistoriaSaidaRecente.getObservacaoGeral(),
                    vistoriaSaidaRecente.getDataHora(),
                    "VISTORIA_COMPLETA",
                    vistoriaSaidaRecente.getId()
            );
        }

        if (snapshot.statusAtual() == StatusVeiculo.OFICINA || snapshot.statusAtual() == StatusVeiculo.MANUTENCAO) {
            return new UsoExternoContexto(null, null, "OFICINA", null, null, null, null);
        }

        return new UsoExternoContexto(null, null, null, null, null, null, null);
    }

    private record UsoExternoContexto(
            Long registroId,
            String nomeContraparte,
            String tipoUsoExterno,
            String observacaoSaida,
            java.time.LocalDateTime dataHoraSaida,
            String origem,
            Long vistoriaId
    ) {}

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
