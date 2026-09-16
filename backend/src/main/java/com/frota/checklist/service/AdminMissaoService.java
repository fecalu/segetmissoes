package com.frota.checklist.service;

import com.frota.checklist.security.AutorizacaoService;
import com.frota.checklist.security.Permissao;
import com.frota.checklist.dto.AuditoriaMissaoResponse;
import com.frota.checklist.dto.MissaoResponse;
import com.frota.checklist.entity.AcaoAuditoriaMissao;
import com.frota.checklist.entity.Missao;
import com.frota.checklist.entity.MotivoExcecaoMissao;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.OrigemAberturaMissao;
import com.frota.checklist.entity.OrigemEncerramentoMissao;
import com.frota.checklist.entity.StatusDocumentalMissao;
import com.frota.checklist.entity.StatusMissao;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.TipoDeslocamentoMissao;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.repository.MissaoRepository;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.repository.VeiculoRepository;
import com.frota.checklist.exception.NotFoundException;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class AdminMissaoService {

    private final AutorizacaoService autorizacao;

    private static final DateTimeFormatter AUDITORIA_DATA_HORA_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final ZoneId ZONA_OPERACIONAL = ZoneId.of("America/Sao_Paulo");

    private static final EnumSet<MotivoExcecaoMissao> MOTIVOS_CONTINGENCIA_ADMIN = EnumSet.of(
            MotivoExcecaoMissao.SEM_INTERNET,
            MotivoExcecaoMissao.SEM_CELULAR,
            MotivoExcecaoMissao.BATERIA_DESCARREGADA,
            MotivoExcecaoMissao.APP_INDISPONIVEL,
            MotivoExcecaoMissao.OUTROS
    );

    private final MissaoRepository missaoRepository;
    private final MotoristaRepository motoristaRepository;
    private final VeiculoRepository veiculoRepository;
    private final MissaoService missaoService;
    private final MissaoAuditoriaService missaoAuditoriaService;
    private final AdminVeiculoService adminVeiculoService;

    public List<MissaoResponse> listar(
            Long motoristaId,
            Long veiculoId,
            StatusMissao status,
            OrigemAberturaMissao origemAbertura,
            StatusDocumentalMissao statusDocumental,
            LocalDate dataInicio,
            LocalDate dataFim,
            String busca
    ) {
        Specification<Missao> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (motoristaId != null) {
                predicates.add(cb.equal(root.get("motorista").get("id"), motoristaId));
            }
            if (veiculoId != null) {
                predicates.add(cb.equal(root.get("veiculo").get("id"), veiculoId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            } else {
                predicates.add(cb.notEqual(root.get("status"), StatusMissao.CANCELADA));
            }
            if (origemAbertura != null) {
                predicates.add(cb.equal(root.get("origemAbertura"), origemAbertura));
            }
            if (statusDocumental != null) {
                if (statusDocumental == StatusDocumentalMissao.PENDENTE_DADOS_ADMIN) {
                    predicates.add(dadosAdministrativosPendentes(root, cb));
                } else {
                    predicates.add(dadosAdministrativosCompletos(root, cb));
                }
            }
            if (dataInicio != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dataHoraInicio"), dataInicio.atStartOfDay()));
            }
            if (dataFim != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dataHoraInicio"), dataFim.atTime(23, 59, 59)));
            }
            if (busca != null && !busca.isBlank()) {
                String pattern = "%" + busca.toLowerCase(Locale.ROOT) + "%";
                Predicate nomeMotorista = cb.like(cb.lower(root.get("motorista").get("nome")), pattern);
                Predicate placaVeiculo = cb.like(cb.lower(root.get("veiculo").get("placa")), pattern);
                Predicate marcaVeiculo = cb.like(cb.lower(root.get("veiculo").get("marca")), pattern);
                Predicate modeloVeiculo = cb.like(cb.lower(root.get("veiculo").get("modelo")), pattern);
                predicates.add(cb.or(nomeMotorista, placaVeiculo, marcaVeiculo, modeloVeiculo));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return missaoRepository.findAll(spec).stream()
                .collect(java.util.stream.Collectors.toMap(
                        this::chaveDedupeMissao,
                        Function.identity(),
                        this::selecionarMissaoMaisConfiavel,
                        LinkedHashMap::new
                ))
                .values()
                .stream()
                .sorted(Comparator.comparing(Missao::getDataHoraInicio).thenComparing(Missao::getId).reversed())
                .map(this::toResponse)
                .toList();
    }

    private String chaveDedupeMissao(Missao missao) {
        return missao.getMissaoExcecaoId() != null
                ? "EXCECAO:" + missao.getMissaoExcecaoId()
                : "MISSAO:" + missao.getId();
    }

    private Missao selecionarMissaoMaisConfiavel(Missao atual, Missao candidata) {
        if (atual.getStatus() != candidata.getStatus()) {
            return atual.getStatus() == StatusMissao.ATIVA ? atual : candidata;
        }

        LocalDateTime dataAtual = dataComparacaoDedupe(atual);
        LocalDateTime dataCandidata = dataComparacaoDedupe(candidata);
        int comparacaoData = dataAtual.compareTo(dataCandidata);
        if (comparacaoData != 0) {
            return comparacaoData >= 0 ? atual : candidata;
        }
        return atual.getId() >= candidata.getId() ? atual : candidata;
    }

    private LocalDateTime dataComparacaoDedupe(Missao missao) {
        if (missao.getDataHoraFim() != null) {
            return missao.getDataHoraFim();
        }
        return missao.getDataHoraInicio();
    }

    private MissaoResponse toResponse(Missao missao) {
        long duracaoSegundos = 0;
        if (missao.getDataHoraFim() != null && !missao.getDataHoraFim().isBefore(missao.getDataHoraInicio())) {
            duracaoSegundos = Duration.between(missao.getDataHoraInicio(), missao.getDataHoraFim()).getSeconds();
        } else if (missao.getStatus() == StatusMissao.ATIVA) {
            duracaoSegundos = Duration.between(missao.getDataHoraInicio(), LocalDateTime.now()).getSeconds();
        }

        return new MissaoResponse(
                missao.getId(),
                missao.getStatus(),
                statusDocumentalEfetivo(missao),
                missao.getDataHoraInicio(),
                missao.getDataHoraFim(),
                duracaoSegundos,
                missao.getOrigemAbertura(),
                missao.getOrigemEncerramento(),
                missao.getTipoDeslocamento(),
                missao.getMotorista().getId(),
                missao.getMotorista().getNome(),
                missao.getVeiculo().getId(),
                missao.getVeiculo().getPlaca(),
                missao.getVeiculo().getMarca(),
                missao.getVeiculo().getModelo(),
                missao.getChecklistSaidaId(),
                missao.getChecklistChegadaId(),
                missao.getMissaoExcecaoId(),
                missao.getAdministradorAbertura() != null ? missao.getAdministradorAbertura().getId() : null,
                missao.getAdministradorAbertura() != null ? missao.getAdministradorAbertura().getNome() : null,
                missao.getAdministradorEncerramento() != null ? missao.getAdministradorEncerramento().getId() : null,
                missao.getAdministradorEncerramento() != null ? missao.getAdministradorEncerramento().getNome() : null,
                missao.getMotivoContingencia(),
                missao.getJustificativaContingenciaAbertura(),
                missao.getJustificativaContingenciaEncerramento(),
                missao.getLocalDestino(),
                missao.getSetorSolicitante(),
                missao.getSolicitanteNome()
        );
    }

    public List<AuditoriaMissaoResponse> listarAuditoria(Long missaoId) {
        if (!missaoRepository.existsById(missaoId)) {
            throw new NotFoundException("Missao nao encontrada");
        }
        return missaoAuditoriaService.listarPorMissao(missaoId);
    }

    @Transactional
    public MissaoResponse atualizarDadosAdministrativos(
            Long missaoId,
            Long administradorId,
            String localDestino,
            String setorSolicitante,
            String solicitanteNome,
            String justificativa
    ) {
        Missao missao = missaoRepository.buscarParaAtualizacao(missaoId)
                .orElseThrow(() -> new NotFoundException("Missao nao encontrada"));
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));

        autorizacao.exigir(administrador.getId(), Permissao.MISSAO_COMPLEMENTAR);

        String novoLocalDestino = trimToNull(localDestino);
        String novoSetorSolicitante = trimToNull(setorSolicitante);
        String novoSolicitanteNome = trimToNull(solicitanteNome);

        if (missao.getStatus() != StatusMissao.ATIVA) {
            boolean corrige = substituiTexto(missao.getLocalDestino(), novoLocalDestino)
                    || substituiTexto(missao.getSetorSolicitante(), novoSetorSolicitante)
                    || substituiTexto(missao.getSolicitanteNome(), novoSolicitanteNome);
            if (corrige) {
                autorizacao.exigir(administradorId, Permissao.MISSAO_CORRIGIR);
                if (justificativa == null || justificativa.trim().length() < 10)
                    throw new BusinessException("Informe uma justificativa com pelo menos 10 caracteres para corrigir os dados finalizados");
                missaoAuditoriaService.registrarAlteracaoCampo(missao, administrador, "justificativaCorrecao", null, justificativa.trim());
            }
        }

        registrarAlteracaoTexto(missao, administrador, "localDestino", missao.getLocalDestino(), novoLocalDestino);
        missao.setLocalDestino(novoLocalDestino);

        registrarAlteracaoTexto(missao, administrador, "setorSolicitante", missao.getSetorSolicitante(), novoSetorSolicitante);
        missao.setSetorSolicitante(novoSetorSolicitante);

        registrarAlteracaoTexto(missao, administrador, "solicitanteNome", missao.getSolicitanteNome(), novoSolicitanteNome);
        missao.setSolicitanteNome(novoSolicitanteNome);

        StatusDocumentalMissao statusDocumentalAnterior = missao.getStatusDocumental();
        if (statusDocumentalAnterior == null) {
            statusDocumentalAnterior = StatusDocumentalMissao.PENDENTE_DADOS_ADMIN;
        }
        missao.atualizarStatusDocumental();
        if (statusDocumentalAnterior != missao.getStatusDocumental()) {
            missaoAuditoriaService.registrarAlteracaoCampo(
                    missao,
                    administrador,
                    "statusDocumental",
                    statusDocumentalAnterior.name(),
                    missao.getStatusDocumental().name()
            );
        }

        Missao salva = missaoRepository.save(missao);
        return toResponse(salva);
    }

    @Transactional
    public MissaoResponse ajustarHorario(
            Long missaoId,
            Long administradorId,
            LocalDateTime dataHoraInicio,
            LocalDateTime dataHoraFim
    ) {
        Missao missao = missaoRepository.findById(missaoId)
                .orElseThrow(() -> new NotFoundException("Missao nao encontrada"));
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));

        autorizacao.exigir(administrador.getId(), Permissao.MISSAO_CORRIGIR);
        if (missao.getOrigemAbertura() != OrigemAberturaMissao.CONTINGENCIA_ADMIN
                && missao.getOrigemAbertura() != OrigemAberturaMissao.REGISTRO_ADMINISTRATIVO) {
            throw new BusinessException("Somente missoes registradas manualmente podem ter horario ajustado por este fluxo");
        }

        LocalDate hojeOperacional = LocalDate.now(ZONA_OPERACIONAL);
        if (!missao.getDataHoraInicio().toLocalDate().equals(hojeOperacional)) {
            throw new BusinessException("Horario de missoes de dias anteriores nao pode ser alterado");
        }
        if (!dataHoraInicio.toLocalDate().equals(hojeOperacional)) {
            throw new BusinessException("Horario de inicio deve permanecer no dia atual");
        }

        LocalDateTime novoInicio = dataHoraInicio;
        LocalDateTime novoFim = missao.getDataHoraFim();

        if (missao.getStatus() == StatusMissao.ATIVA) {
            if (dataHoraFim != null) {
                throw new BusinessException("Missoes em andamento permitem ajuste apenas do horario de inicio");
            }
        } else if (dataHoraFim != null) {
            if (missao.getOrigemEncerramento() != null && missao.getOrigemEncerramento() != OrigemEncerramentoMissao.ADMINISTRATIVO) {
                throw new BusinessException("Horario de fim so pode ser ajustado quando o encerramento tambem foi manual pelo administrador");
            }
            novoFim = dataHoraFim;
        }

        if (novoFim != null && !novoFim.isAfter(novoInicio)) {
            throw new BusinessException("Data/hora de fim deve ser posterior ao inicio da missao");
        }

        registrarAlteracaoHorarioSeNecessario(
                missao,
                administrador,
                "dataHoraInicio",
                missao.getDataHoraInicio(),
                novoInicio,
                null
        );
        missao.setDataHoraInicio(novoInicio);

        if (missao.getStatus() == StatusMissao.FINALIZADA && missao.getOrigemEncerramento() == OrigemEncerramentoMissao.ADMINISTRATIVO) {
            registrarAlteracaoHorarioSeNecessario(
                    missao,
                    administrador,
                    "dataHoraFim",
                    missao.getDataHoraFim(),
                    novoFim,
                    null
            );
            missao.setDataHoraFim(novoFim);
        }

        Missao salva = missaoRepository.save(missao);
        return toResponse(salva);
    }

    @Transactional
    public MissaoResponse editarMissaoManual(
            Long missaoId,
            Long administradorId,
            Long motoristaId,
            Long veiculoId,
            LocalDateTime dataHoraInicio,
            LocalDateTime dataHoraFim,
            String justificativaAbertura,
            String justificativaEncerramento,
            String localDestino,
            String setorSolicitante,
            String solicitanteNome,
            String justificativaEdicao
    ) {
        Missao missao = missaoRepository.findById(missaoId)
                .orElseThrow(() -> new NotFoundException("Missao nao encontrada"));
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));

        autorizacao.exigir(administrador.getId(), Permissao.MISSAO_CORRIGIR);
        if (missao.getOrigemAbertura() != OrigemAberturaMissao.CONTINGENCIA_ADMIN
                && missao.getOrigemAbertura() != OrigemAberturaMissao.REGISTRO_ADMINISTRATIVO) {
            throw new BusinessException("Somente missoes registradas manualmente podem ser editadas por este fluxo");
        }

        String justificativaEdicaoNormalizada = trimToNull(justificativaEdicao);
        if (justificativaEdicaoNormalizada == null || justificativaEdicaoNormalizada.length() < 10) {
            throw new BusinessException("Informe a justificativa da edicao com pelo menos 10 caracteres");
        }

        boolean permiteReatribuicao = missao.getStatus() == StatusMissao.ATIVA;
        boolean permiteEdicaoEncerramento = missao.getStatus() == StatusMissao.FINALIZADA
                && missao.getOrigemEncerramento() == OrigemEncerramentoMissao.ADMINISTRATIVO;

        if (!permiteReatribuicao) {
            if (!missao.getMotorista().getId().equals(motoristaId)) {
                throw new BusinessException("Motorista so pode ser alterado enquanto a missao manual estiver em andamento");
            }
            if (!missao.getVeiculo().getId().equals(veiculoId)) {
                throw new BusinessException("Veiculo so pode ser alterado enquanto a missao manual estiver em andamento");
            }
        }

        LocalDateTime novoInicio = dataHoraInicio;
        LocalDateTime novoFim = missao.getDataHoraFim();
        if (permiteEdicaoEncerramento) {
            novoFim = dataHoraFim;
        } else if (dataHoraFim != null && missao.getDataHoraFim() != null && !dataHoraFim.equals(missao.getDataHoraFim())) {
            throw new BusinessException("Horario de fim so pode ser alterado quando o encerramento tambem foi manual pelo administrador");
        }

        if (novoFim != null && !novoFim.isAfter(novoInicio)) {
            throw new BusinessException("Data/hora de fim deve ser posterior ao inicio da missao");
        }

        String justificativaAberturaNormalizada = trimToNull(justificativaAbertura);
        if (justificativaAberturaNormalizada == null || justificativaAberturaNormalizada.length() < 10) {
            throw new BusinessException("Informe a justificativa do registro manual com pelo menos 10 caracteres");
        }

        String justificativaEncerramentoNormalizada = trimToNull(justificativaEncerramento);
        if (permiteEdicaoEncerramento
                && justificativaEncerramentoNormalizada != null
                && justificativaEncerramentoNormalizada.length() < 10) {
            throw new BusinessException("Informe a justificativa do encerramento manual com pelo menos 10 caracteres");
        }

        if (permiteReatribuicao && !missao.getMotorista().getId().equals(motoristaId)) {
            Motorista novoMotorista = motoristaRepository.findById(motoristaId)
                    .orElseThrow(() -> new NotFoundException("Motorista nao encontrado"));
            validarMotoristaOperacional(novoMotorista);
            missaoService.buscarMissaoAtivaPorMotorista(novoMotorista.getId())
                    .filter(ativa -> !ativa.getId().equals(missao.getId()))
                    .ifPresent(ativa -> {
                        throw new BusinessException("Motorista ja possui outra missao em andamento");
                    });
            missaoAuditoriaService.registrarAlteracaoCampo(
                    missao,
                    administrador,
                    "motorista",
                    formatarMotoristaAuditoria(missao.getMotorista()),
                    formatarMotoristaAuditoria(novoMotorista),
                    detalheEdicaoManual(justificativaEdicaoNormalizada)
            );
            missao.setMotorista(novoMotorista);
        }

        if (permiteReatribuicao && !missao.getVeiculo().getId().equals(veiculoId)) {
            Veiculo novoVeiculo = veiculoRepository.findById(veiculoId)
                    .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
            validarVeiculoParaEdicaoManual(missao, novoVeiculo);
            liberarVeiculoParaMissaoAdministrativa(novoVeiculo);
            missaoAuditoriaService.registrarAlteracaoCampo(
                    missao,
                    administrador,
                    "veiculo",
                    formatarVeiculoAuditoria(missao.getVeiculo()),
                    formatarVeiculoAuditoria(novoVeiculo),
                    detalheEdicaoManual(justificativaEdicaoNormalizada)
            );
            missao.setVeiculo(novoVeiculo);
        }

        registrarAlteracaoHorarioSeNecessario(
                missao,
                administrador,
                "dataHoraInicio",
                missao.getDataHoraInicio(),
                novoInicio,
                justificativaEdicaoNormalizada
        );
        missao.setDataHoraInicio(novoInicio);

        if (permiteEdicaoEncerramento) {
            registrarAlteracaoHorarioSeNecessario(
                    missao,
                    administrador,
                    "dataHoraFim",
                    missao.getDataHoraFim(),
                    novoFim,
                    justificativaEdicaoNormalizada
            );
            missao.setDataHoraFim(novoFim);
        }

        registrarAlteracaoTextoComDetalhe(
                missao,
                administrador,
                "justificativaContingenciaAbertura",
                missao.getJustificativaContingenciaAbertura(),
                justificativaAberturaNormalizada,
                justificativaEdicaoNormalizada
        );
        missao.setJustificativaContingenciaAbertura(justificativaAberturaNormalizada);

        registrarAlteracaoTextoComDetalhe(
                missao,
                administrador,
                "localDestino",
                missao.getLocalDestino(),
                trimToNull(localDestino),
                justificativaEdicaoNormalizada
        );
        missao.setLocalDestino(trimToNull(localDestino));

        registrarAlteracaoTextoComDetalhe(
                missao,
                administrador,
                "setorSolicitante",
                missao.getSetorSolicitante(),
                trimToNull(setorSolicitante),
                justificativaEdicaoNormalizada
        );
        missao.setSetorSolicitante(trimToNull(setorSolicitante));

        registrarAlteracaoTextoComDetalhe(
                missao,
                administrador,
                "solicitanteNome",
                missao.getSolicitanteNome(),
                trimToNull(solicitanteNome),
                justificativaEdicaoNormalizada
        );
        missao.setSolicitanteNome(trimToNull(solicitanteNome));

        if (permiteEdicaoEncerramento) {
            registrarAlteracaoTextoComDetalhe(
                    missao,
                    administrador,
                    "justificativaContingenciaEncerramento",
                    missao.getJustificativaContingenciaEncerramento(),
                    justificativaEncerramentoNormalizada,
                    justificativaEdicaoNormalizada
            );
            missao.setJustificativaContingenciaEncerramento(justificativaEncerramentoNormalizada);
        }

        StatusDocumentalMissao statusDocumentalAnterior = missao.getStatusDocumental() == null
                ? StatusDocumentalMissao.PENDENTE_DADOS_ADMIN
                : missao.getStatusDocumental();
        missao.atualizarStatusDocumental();
        if (statusDocumentalAnterior != missao.getStatusDocumental()) {
            missaoAuditoriaService.registrarAlteracaoCampo(
                    missao,
                    administrador,
                    "statusDocumental",
                    statusDocumentalAnterior.name(),
                    missao.getStatusDocumental().name(),
                    detalheEdicaoManual(justificativaEdicaoNormalizada)
            );
        }

        Missao salva = missaoRepository.save(missao);
        return toResponse(salva);
    }

    @Transactional
    public MissaoResponse criarContingencia(
            Long administradorId,
            Long motoristaId,
            Long veiculoId,
            LocalDateTime dataHoraInicio,
            MotivoExcecaoMissao motivoContingencia,
            TipoDeslocamentoMissao tipoDeslocamento,
            String justificativaAbertura,
            String localDestino,
            String setorSolicitante,
            String solicitanteNome
    ) {
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));
        autorizacao.exigir(administrador.getId(), Permissao.MISSAO_ENCERRAR_EXCECAO);
        Motorista motorista = motoristaRepository.findById(motoristaId)
                .orElseThrow(() -> new NotFoundException("Motorista nao encontrado"));
        Veiculo veiculo = veiculoRepository.findById(veiculoId)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));

        if (Boolean.TRUE.equals(veiculo.getDesativado())) {
            throw new BusinessException("Veiculo desativado nao pode receber registro manual");
        }
        StatusVeiculo statusAdministrativo = StatusVeiculo.normalizarStatusAdministrativo(veiculo.getStatusAdministrativo());
        if (statusAdministrativo != null && !statusAdministrativo.permiteInicioMissaoAdministrativa()) {
            throw new BusinessException("Veiculo indisponivel para nova missao. Status atual: " + statusAdministrativo);
        }
        MotivoExcecaoMissao motivoContingenciaNormalizado =
                motivoContingencia == null ? MotivoExcecaoMissao.OUTROS : motivoContingencia;
        if (!MOTIVOS_CONTINGENCIA_ADMIN.contains(motivoContingenciaNormalizado)) {
            throw new BusinessException("Motivo do registro manual invalido para este fluxo");
        }

        String justificativaNormalizada = trimToNull(justificativaAbertura);
        if (justificativaNormalizada == null || justificativaNormalizada.length() < 10) {
            throw new BusinessException("Informe a justificativa do registro manual com pelo menos 10 caracteres");
        }

        Missao missao = missaoService.abrirContingenciaAdministrativa(
                administrador,
                motorista,
                veiculo,
                dataHoraInicio,
                motivoContingenciaNormalizado,
                tipoDeslocamento,
                justificativaNormalizada,
                localDestino,
                setorSolicitante,
                solicitanteNome
        );
        return toResponse(missao);
    }

    @Transactional
    public MissaoResponse criarRegistroAdministrativo(
            Long administradorId,
            Long motoristaId,
            Long veiculoId,
            LocalDateTime dataHoraInicio,
            TipoDeslocamentoMissao tipoDeslocamento,
            String localDestino,
            String setorSolicitante,
            String solicitanteNome
    ) {
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));
        autorizacao.exigir(administrador.getId(), Permissao.MISSAO_REGISTRAR);

        Motorista motorista = motoristaRepository.findById(motoristaId)
                .orElseThrow(() -> new NotFoundException("Motorista nao encontrado"));
        validarMotoristaOperacional(motorista);
        Veiculo veiculo = veiculoRepository.findById(veiculoId)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        if (Boolean.TRUE.equals(veiculo.getDesativado())) {
            throw new BusinessException("Veiculo desativado nao pode receber registro operacional");
        }

        TipoDeslocamentoMissao tipoNormalizado = tipoDeslocamento == null
                ? TipoDeslocamentoMissao.NA_CIDADE
                : tipoDeslocamento;
        String destinoNormalizado = trimToNull(localDestino);
        String setorNormalizado = trimToNull(setorSolicitante);
        String solicitanteNormalizado = trimToNull(solicitanteNome);
        if (destinoNormalizado == null) {
            throw new BusinessException("Informe o destino da missao");
        }
        if (setorNormalizado == null || solicitanteNormalizado == null) {
            throw new BusinessException("Informe setor solicitante e quem solicitou a missao");
        }

        StatusVeiculo statusAdministrativo = StatusVeiculo.normalizarStatusAdministrativo(veiculo.getStatusAdministrativo());
        autorizacao.validarInicio(administrador, veiculo, statusAdministrativo == null ? StatusVeiculo.BASE_JOAO_GOULART : statusAdministrativo);
        if (statusAdministrativo != null && !statusAdministrativo.permiteInicioMissaoAdministrativa()) {
            throw new BusinessException("Veiculo indisponivel para nova missao. Status atual: " + statusAdministrativo);
        }

        Missao missao = missaoService.abrirRegistroAdministrativo(
                administrador,
                motorista,
                veiculo,
                dataHoraInicio,
                tipoNormalizado,
                destinoNormalizado,
                setorNormalizado,
                solicitanteNormalizado
        );
        return toResponse(missao);
    }

    @Transactional
    public MissaoResponse registrarRetornoAdministrativo(
            Long missaoId,
            Long administradorId,
            LocalDateTime dataHoraFim,
            StatusVeiculo statusAdministrativoDestino
    ) {
        Missao missao = missaoRepository.buscarParaAtualizacao(missaoId)
                .orElseThrow(() -> new NotFoundException("Missao nao encontrada"));
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));

        autorizacao.exigir(administrador.getId(), Permissao.MISSAO_REGISTRAR);
        if (missao.getOrigemAbertura() != OrigemAberturaMissao.REGISTRO_ADMINISTRATIVO) {
            throw new BusinessException("Use o encerramento correspondente a origem desta missao");
        }
        autorizacao.validarRetornoMissao(administrador, missao);
        if (missao.getStatus() != StatusMissao.ATIVA) {
            throw new BusinessException("Esta missao ja foi finalizada");
        }
        if (dataHoraFim == null || !dataHoraFim.isAfter(missao.getDataHoraInicio())) {
            throw new BusinessException("Data/hora de retorno deve ser posterior a saida");
        }

        autorizacao.validarDestinoRetorno(administrador, statusAdministrativoDestino);
        StatusVeiculo destinoNormalizado = validarDestinoAdministrativoDeRetorno(statusAdministrativoDestino);

        Missao finalizada = missaoService.encerrarRegistroAdministrativo(missao, administrador, dataHoraFim);
        aplicarDestinoAdministrativoDeRetorno(finalizada, destinoNormalizado, administradorId);

        return toResponse(finalizada);
    }

    @Transactional
    public MissaoResponse desfazerRegistroAdministrativo(
            Long missaoId,
            Long administradorId,
            String justificativa
    ) {
        Missao missao = missaoRepository.buscarParaAtualizacao(missaoId)
                .orElseThrow(() -> new NotFoundException("Missao nao encontrada"));
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));

        autorizacao.exigir(administrador.getId(), Permissao.MISSAO_REGISTRAR);
        if (missao.getOrigemAbertura() != OrigemAberturaMissao.REGISTRO_ADMINISTRATIVO) {
            throw new BusinessException("Somente saidas registradas pelo administrativo podem ser desfeitas por este fluxo");
        }
        if (missao.getStatus() != StatusMissao.ATIVA) {
            throw new BusinessException("Somente missoes em andamento podem ser desfeitas");
        }

        String justificativaNormalizada = trimToNull(justificativa);
        if (justificativaNormalizada == null || justificativaNormalizada.length() < 4) {
            throw new BusinessException("Informe uma justificativa com pelo menos 4 caracteres");
        }

        missao.setStatus(StatusMissao.CANCELADA);
        missao.setDataHoraFim(null);
        missao.setOrigemEncerramento(null);

        Veiculo veiculo = missao.getVeiculo();
        veiculo.setStatusAdministrativo(null);
        veiculo.setLocalizacaoOperacional(null);
        veiculoRepository.save(veiculo);

        Missao salva = missaoRepository.save(missao);
        missaoAuditoriaService.registrar(
                salva,
                AcaoAuditoriaMissao.CANCELAMENTO_REGISTRO_ADMINISTRATIVO,
                StatusMissao.ATIVA,
                StatusMissao.CANCELADA,
                administrador,
                "Saida administrativa desfeita. Justificativa: %s".formatted(justificativaNormalizada)
        );
        return toResponse(salva);
    }

    @Transactional
    public MissaoResponse encerrarPendente(
            Long missaoId,
            Long administradorId,
            LocalDateTime dataHoraFim,
            String justificativaEncerramento,
            StatusVeiculo statusAdministrativoDestino
    ) {
        Missao missao = missaoRepository.buscarParaAtualizacao(missaoId)
                .orElseThrow(() -> new NotFoundException("Missao nao encontrada"));
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));

        autorizacao.exigir(administrador.getId(), Permissao.MISSAO_ENCERRAR_EXCECAO);
        if (missao.getStatus() != StatusMissao.ATIVA) {
            throw new BusinessException("Somente missoes em andamento podem ser finalizadas por este fluxo");
        }

        LocalDateTime dataFimNormalizada = dataHoraFim == null ? LocalDateTime.now() : dataHoraFim;
        if (!dataFimNormalizada.isAfter(missao.getDataHoraInicio())) {
            throw new BusinessException("Data/hora de fim deve ser posterior ao inicio da missao");
        }

        String justificativaNormalizada = trimToNull(justificativaEncerramento);
        if (justificativaNormalizada == null || justificativaNormalizada.length() < 10) {
            throw new BusinessException("Informe a justificativa do encerramento manual com pelo menos 10 caracteres");
        }

        autorizacao.validarDestinoRetorno(administrador, statusAdministrativoDestino);
        StatusVeiculo destinoNormalizado = validarDestinoAdministrativoDeRetorno(statusAdministrativoDestino);

        Missao encerrada = missaoService.encerrarPendenteAdministrativamente(
                missao,
                administrador,
                dataFimNormalizada,
                justificativaNormalizada
        );
        aplicarDestinoAdministrativoDeRetorno(encerrada, destinoNormalizado, administradorId);
        return toResponse(encerrada);
    }

    private boolean substituiTexto(String anterior, String novo) {
        return trimToNull(anterior) != null && !java.util.Objects.equals(trimToNull(anterior), novo);
    }

    private StatusVeiculo validarDestinoAdministrativoDeRetorno(StatusVeiculo statusAdministrativoDestino) {
        StatusVeiculo destinoNormalizado = StatusVeiculo.normalizarStatusAdministrativo(statusAdministrativoDestino);
        if (statusAdministrativoDestino != null
                && destinoNormalizado != StatusVeiculo.NO_PATIO
                && destinoNormalizado != StatusVeiculo.AGUARDANDO_REALOCACAO
                && destinoNormalizado != StatusVeiculo.BLOQUEADO) {
            throw new BusinessException("Destino administrativo inválido para o retorno da missão");
        }
        return destinoNormalizado;
    }

    private void aplicarDestinoAdministrativoDeRetorno(Missao missao, StatusVeiculo destino, Long administradorId) {
        adminVeiculoService.aplicarDestinoDeRetorno(missao, destino, administradorId);
    }

    private void registrarAlteracaoTexto(
            Missao missao,
            Motorista administrador,
            String campo,
            String valorAnterior,
            String valorNovo
    ) {
        if (equalsNormalized(valorAnterior, valorNovo)) {
            return;
        }
        missaoAuditoriaService.registrarAlteracaoCampo(
                missao,
                administrador,
                campo,
                normalizeForAudit(valorAnterior),
                normalizeForAudit(valorNovo)
        );
    }

    private void registrarAlteracaoTextoComDetalhe(
            Missao missao,
            Motorista administrador,
            String campo,
            String valorAnterior,
            String valorNovo,
            String justificativaEdicao
    ) {
        if (equalsNormalized(valorAnterior, valorNovo)) {
            return;
        }
        missaoAuditoriaService.registrarAlteracaoCampo(
                missao,
                administrador,
                campo,
                normalizeForAudit(valorAnterior),
                normalizeForAudit(valorNovo),
                detalheEdicaoManual(justificativaEdicao)
        );
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private boolean equalsNormalized(String first, String second) {
        String firstNormalized = trimToNull(first);
        String secondNormalized = trimToNull(second);
        if (firstNormalized == null && secondNormalized == null) {
            return true;
        }
        if (firstNormalized == null || secondNormalized == null) {
            return false;
        }
        return firstNormalized.equals(secondNormalized);
    }

    private String normalizeForAudit(String value) {
        String normalized = trimToNull(value);
        return normalized == null ? "(vazio)" : normalized;
    }

    private void registrarAlteracaoHorarioSeNecessario(
            Missao missao,
            Motorista administrador,
            String campo,
            LocalDateTime valorAnterior,
            LocalDateTime valorNovo,
            String justificativa
    ) {
        if (valorAnterior == null && valorNovo == null) {
            return;
        }
        if (valorAnterior != null && valorAnterior.equals(valorNovo)) {
            return;
        }

        String detalhe = justificativa == null || justificativa.isBlank()
                ? "Horario ajustado pela administracao."
                : "Horario ajustado pela administracao. Justificativa: %s".formatted(justificativa);
        missaoAuditoriaService.registrarAlteracaoCampo(
                missao,
                administrador,
                campo,
                formatarDataHoraAuditoria(valorAnterior),
                formatarDataHoraAuditoria(valorNovo),
                detalhe
        );
    }

    private String formatarDataHoraAuditoria(LocalDateTime value) {
        return value == null ? "(vazio)" : value.format(AUDITORIA_DATA_HORA_FORMATTER);
    }

    private void validarVeiculoParaEdicaoManual(Missao missao, Veiculo novoVeiculo) {
        if (Boolean.TRUE.equals(novoVeiculo.getDesativado())) {
            throw new BusinessException("Veiculo desativado nao pode receber registro manual");
        }
        missaoService.buscarMissaoAtivaPorVeiculo(novoVeiculo.getId())
                .filter(ativa -> !ativa.getId().equals(missao.getId()))
                .ifPresent(ativa -> {
                    throw new BusinessException("Veiculo ja possui outra missao em andamento");
                });
        StatusVeiculo statusAdministrativo = StatusVeiculo.normalizarStatusAdministrativo(novoVeiculo.getStatusAdministrativo());
        if (statusAdministrativo != null && !statusAdministrativo.permiteInicioMissaoAdministrativa()) {
            throw new BusinessException("Veiculo indisponivel para nova missao. Status atual: " + statusAdministrativo);
        }
    }

    private void liberarVeiculoParaMissaoAdministrativa(Veiculo veiculo) {
        if (veiculo.getStatusAdministrativo() == StatusVeiculo.NO_PATIO
                || veiculo.getStatusAdministrativo() == StatusVeiculo.AGUARDANDO_REALOCACAO) {
            veiculo.setStatusAdministrativo(null);
        }
        veiculo.setLocalizacaoOperacional(null);
    }

    private String formatarMotoristaAuditoria(Motorista motorista) {
        return motorista == null ? "(vazio)" : motorista.getNome();
    }

    private String formatarVeiculoAuditoria(Veiculo veiculo) {
        return veiculo == null ? "(vazio)" : "%s - %s %s".formatted(veiculo.getPlaca(), veiculo.getMarca(), veiculo.getModelo());
    }

    private String detalheEdicaoManual(String justificativaEdicao) {
        return "Missao manual editada pela administracao. Justificativa: %s".formatted(justificativaEdicao);
    }

    private StatusDocumentalMissao statusDocumentalEfetivo(Missao missao) {
        return missao.possuiDadosAdministrativosCompletos()
                ? StatusDocumentalMissao.DADOS_ADMIN_COMPLETOS
                : StatusDocumentalMissao.PENDENTE_DADOS_ADMIN;
    }

    private Predicate dadosAdministrativosPendentes(jakarta.persistence.criteria.Root<Missao> root, CriteriaBuilder cb) {
        return cb.or(
                campoTextoVazio(root, cb, "localDestino"),
                campoTextoVazio(root, cb, "setorSolicitante"),
                campoTextoVazio(root, cb, "solicitanteNome")
        );
    }

    private Predicate dadosAdministrativosCompletos(jakarta.persistence.criteria.Root<Missao> root, CriteriaBuilder cb) {
        return cb.and(
                campoTextoPreenchido(root, cb, "localDestino"),
                campoTextoPreenchido(root, cb, "setorSolicitante"),
                campoTextoPreenchido(root, cb, "solicitanteNome")
        );
    }

    private Predicate campoTextoVazio(jakarta.persistence.criteria.Root<Missao> root, CriteriaBuilder cb, String campo) {
        return cb.or(
                cb.isNull(root.get(campo)),
                cb.equal(cb.trim(root.<String>get(campo)), "")
        );
    }

    private Predicate campoTextoPreenchido(jakarta.persistence.criteria.Root<Missao> root, CriteriaBuilder cb, String campo) {
        return cb.and(
                cb.isNotNull(root.get(campo)),
                cb.notEqual(cb.trim(root.<String>get(campo)), "")
        );
    }

    private void validarMotoristaOperacional(Motorista motorista) {
        if (!motorista.isAcessoHabilitado() || !motorista.isMotoristaOperacional()) {
            throw new BusinessException("Selecione um motorista valido para a missao");
        }
    }
}
