package com.frota.checklist.service;

import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.AcaoAuditoriaMissao;
import com.frota.checklist.entity.Missao;
import com.frota.checklist.entity.MotivoExcecaoMissao;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.OrigemAberturaMissao;
import com.frota.checklist.entity.OrigemEncerramentoMissao;
import com.frota.checklist.entity.StatusMissao;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.repository.ChecklistRepository;
import com.frota.checklist.repository.MissaoRepository;
import com.frota.checklist.repository.VeiculoRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MissaoService {

    private final MissaoRepository missaoRepository;
    private final ChecklistRepository checklistRepository;
    private final VeiculoRepository veiculoRepository;
    private final MissaoAuditoriaService missaoAuditoriaService;

    public Optional<Missao> buscarMissaoAtivaPorMotorista(Long motoristaId) {
        if (motoristaId == null) {
            return Optional.empty();
        }
        return missaoRepository.findFirstByMotoristaIdAndStatusOrderByDataHoraInicioDesc(motoristaId, StatusMissao.ATIVA);
    }

    public Optional<Missao> buscarMissaoAtivaPorVeiculo(Long veiculoId) {
        if (veiculoId == null) {
            return Optional.empty();
        }
        return missaoRepository.findFirstByVeiculoIdAndStatusOrderByDataHoraInicioDesc(veiculoId, StatusMissao.ATIVA);
    }

    public void validarMotoristaSemMissaoAtiva(Long motoristaId) {
        buscarMissaoAtivaPorMotorista(motoristaId).ifPresent(missao -> {
            throw new BusinessException(
                    "Motorista ja possui missao em andamento no veiculo %s. Finalize a missao atual antes de iniciar outra."
                            .formatted(missao.getVeiculo().getPlaca())
            );
        });
    }

    public void validarVeiculoSemMissaoAtiva(Long veiculoId) {
        buscarMissaoAtivaPorVeiculo(veiculoId).ifPresent(missao -> {
            throw new BusinessException("Veiculo ja possui missao em andamento.");
        });
    }

    @Transactional
    public Missao abrirComChecklist(Checklist checklist) {
        if (checklist.getTipoOperacao() != TipoOperacao.SAIDA) {
            throw new BusinessException("Checklist invalido para abertura de missao");
        }
        validarMotoristaSemMissaoAtiva(checklist.getMotorista().getId());
        validarVeiculoSemMissaoAtiva(checklist.getVeiculo().getId());

        Missao missao = new Missao();
        missao.setMotorista(checklist.getMotorista());
        missao.setVeiculo(checklist.getVeiculo());
        liberarVeiculoParaMissao(checklist.getVeiculo());
        missao.setStatus(StatusMissao.ATIVA);
        missao.setDataHoraInicio(checklist.getDataHora());
        missao.setOrigemAbertura(OrigemAberturaMissao.CHECKLIST);
        missao.setChecklistSaidaId(checklist.getId());
        Missao saved = missaoRepository.save(missao);
        missaoAuditoriaService.registrar(
                saved,
                AcaoAuditoriaMissao.ABERTURA_CHECKLIST,
                null,
                StatusMissao.ATIVA,
                checklist.getMotorista(),
                "Inicio registrado pelo checklist de saida #%d.".formatted(checklist.getId())
        );
        return saved;
    }

    @Transactional
    public Missao abrirSemChecklist(Motorista motorista, Veiculo veiculo, Long missaoExcecaoId, LocalDateTime dataHoraInicio) {
        validarMotoristaSemMissaoAtiva(motorista.getId());
        validarVeiculoSemMissaoAtiva(veiculo.getId());

        Missao missao = new Missao();
        missao.setMotorista(motorista);
        missao.setVeiculo(veiculo);
        liberarVeiculoParaMissao(veiculo);
        missao.setStatus(StatusMissao.ATIVA);
        missao.setDataHoraInicio(dataHoraInicio == null ? LocalDateTime.now() : dataHoraInicio);
        missao.setOrigemAbertura(OrigemAberturaMissao.SEM_CHECKLIST);
        missao.setMissaoExcecaoId(missaoExcecaoId);
        Missao saved = missaoRepository.save(missao);
        missaoAuditoriaService.registrar(
                saved,
                AcaoAuditoriaMissao.ABERTURA_SEM_CHECKLIST,
                null,
                StatusMissao.ATIVA,
                motorista,
                "Inicio registrado sem checklist. Excecao vinculada: %s".formatted(missaoExcecaoId)
        );
        return saved;
    }

    @Transactional
    public Missao abrirContingenciaAdministrativa(
            Motorista administrador,
            Motorista motoristaMissao,
            Veiculo veiculo,
            LocalDateTime dataHoraInicio,
            MotivoExcecaoMissao motivoContingencia,
            String justificativaAbertura,
            String localDestino,
            String setorSolicitante,
            String solicitanteNome
    ) {
        validarMotoristaSemMissaoAtiva(motoristaMissao.getId());
        validarVeiculoSemMissaoAtiva(veiculo.getId());

        Missao missao = new Missao();
        missao.setMotorista(motoristaMissao);
        missao.setVeiculo(veiculo);
        liberarVeiculoParaMissao(veiculo);
        missao.setStatus(StatusMissao.ATIVA);
        missao.setDataHoraInicio(dataHoraInicio == null ? LocalDateTime.now() : dataHoraInicio);
        missao.setOrigemAbertura(OrigemAberturaMissao.CONTINGENCIA_ADMIN);
        missao.setAdministradorAbertura(administrador);
        missao.setMotivoContingencia(motivoContingencia == null ? MotivoExcecaoMissao.OUTROS : motivoContingencia);
        missao.setJustificativaContingenciaAbertura(trimToNull(justificativaAbertura));
        missao.setLocalDestino(trimToNull(localDestino));
        missao.setSetorSolicitante(trimToNull(setorSolicitante));
        missao.setSolicitanteNome(trimToNull(solicitanteNome));
        missao.atualizarStatusDocumental();

        Missao saved = missaoRepository.save(missao);
        missaoAuditoriaService.registrar(
                saved,
                AcaoAuditoriaMissao.ABERTURA_CONTINGENCIA_ADMIN,
                null,
                StatusMissao.ATIVA,
                administrador,
                "Missao manual registrada pela administracao."
        );
        return saved;
    }

    @Transactional
    public Missao encerrarComChecklist(Checklist checklist) {
        if (checklist.getTipoOperacao() != TipoOperacao.ENTRADA) {
            throw new BusinessException("Checklist invalido para finalizacao de missao");
        }

        Optional<Missao> missaoOpt = buscarMissaoAtivaPorVeiculo(checklist.getVeiculo().getId());
        if (missaoOpt.isEmpty()) {
            return registrarEncerramentoLegadoPorChecklist(checklist);
        }

        Missao missao = missaoOpt.get();
        if (!missao.getMotorista().getId().equals(checklist.getMotorista().getId())) {
            throw new BusinessException("Checklist de chegada permitido somente para o motorista que iniciou a missao do veiculo");
        }

        missao.setStatus(StatusMissao.FINALIZADA);
        missao.setDataHoraFim(checklist.getDataHora());
        missao.setOrigemEncerramento(OrigemEncerramentoMissao.CHECKLIST);
        missao.setChecklistChegadaId(checklist.getId());
        Missao saved = missaoRepository.save(missao);
        missaoAuditoriaService.registrar(
                saved,
                AcaoAuditoriaMissao.ENCERRAMENTO_CHECKLIST,
                StatusMissao.ATIVA,
                StatusMissao.FINALIZADA,
                checklist.getMotorista(),
                "Fim registrado pelo checklist de chegada #%d.".formatted(checklist.getId())
        );
        return saved;
    }

    @Transactional
    public Missao encerrarSemChecklist(
            Motorista motorista,
            Veiculo veiculo,
            Long missaoExcecaoId,
            LocalDateTime dataHoraFim,
            LocalDateTime dataHoraInicioFallback
    ) {
        LocalDateTime dataHoraFimEfetiva = dataHoraFim == null ? LocalDateTime.now() : dataHoraFim;
        Optional<Missao> missaoOpt = buscarMissaoAtivaPorVeiculo(veiculo.getId());
        if (missaoOpt.isEmpty()) {
            Missao missaoLegado = new Missao();
            missaoLegado.setMotorista(motorista);
            missaoLegado.setVeiculo(veiculo);
            missaoLegado.setStatus(StatusMissao.FINALIZADA);
            missaoLegado.setDataHoraInicio(dataHoraInicioFallback != null ? dataHoraInicioFallback : dataHoraFimEfetiva);
            missaoLegado.setDataHoraFim(dataHoraFimEfetiva);
            missaoLegado.setOrigemAbertura(OrigemAberturaMissao.SEM_CHECKLIST);
            missaoLegado.setOrigemEncerramento(OrigemEncerramentoMissao.SEM_CHECKLIST);
            missaoLegado.setMissaoExcecaoId(missaoExcecaoId);
            Missao saved = missaoRepository.save(missaoLegado);
            registrarEncerramentoSemChecklistNoVeiculo(veiculo, motorista, dataHoraFimEfetiva);
            missaoAuditoriaService.registrar(
                    saved,
                    AcaoAuditoriaMissao.ABERTURA_LEGADO_RECONSTRUIDA,
                    null,
                    StatusMissao.FINALIZADA,
                    motorista,
                    "Registro reconstruido e finalizado sem checklist. Excecao vinculada: %s".formatted(missaoExcecaoId)
            );
            missaoAuditoriaService.registrar(
                    saved,
                    AcaoAuditoriaMissao.ENCERRAMENTO_SEM_CHECKLIST,
                    StatusMissao.ATIVA,
                    StatusMissao.FINALIZADA,
                    motorista,
                    "Fim registrado sem checklist em registro reconstruido."
            );
            return saved;
        }

        Missao missao = missaoOpt.get();
        if (!missao.getMotorista().getId().equals(motorista.getId())) {
            throw new BusinessException("Somente o motorista responsavel pela missao pode finalizar sem checklist");
        }

        missao.setStatus(StatusMissao.FINALIZADA);
        missao.setDataHoraFim(dataHoraFimEfetiva);
        missao.setOrigemEncerramento(OrigemEncerramentoMissao.SEM_CHECKLIST);
        missao.setMissaoExcecaoId(missaoExcecaoId != null ? missaoExcecaoId : missao.getMissaoExcecaoId());
        Missao saved = missaoRepository.save(missao);
        registrarEncerramentoSemChecklistNoVeiculo(veiculo, motorista, dataHoraFimEfetiva);
        missaoAuditoriaService.registrar(
                saved,
                AcaoAuditoriaMissao.ENCERRAMENTO_SEM_CHECKLIST,
                StatusMissao.ATIVA,
                StatusMissao.FINALIZADA,
                motorista,
                "Fim registrado sem checklist. Excecao vinculada: %s".formatted(saved.getMissaoExcecaoId())
        );
        return saved;
    }

    @Transactional
    public void encerrarPorAdministracao(
            Veiculo veiculo,
            Motorista motoristaMissao,
            Motorista administrador,
            Long missaoExcecaoId,
            LocalDateTime dataHoraInicioFallback,
            LocalDateTime dataHoraFim
    ) {
        LocalDateTime dataHoraFimEfetiva = dataHoraFim == null ? LocalDateTime.now() : dataHoraFim;
        Optional<Missao> missaoAtiva = buscarMissaoAtivaPorVeiculo(veiculo.getId());
        if (missaoAtiva.isEmpty()) {
            Missao missaoLegado = new Missao();
            missaoLegado.setMotorista(motoristaMissao);
            missaoLegado.setVeiculo(veiculo);
            missaoLegado.setStatus(StatusMissao.FINALIZADA);
            missaoLegado.setDataHoraInicio(dataHoraInicioFallback != null ? dataHoraInicioFallback : dataHoraFimEfetiva);
            missaoLegado.setDataHoraFim(dataHoraFimEfetiva);
            missaoLegado.setOrigemAbertura(OrigemAberturaMissao.SEM_CHECKLIST);
            missaoLegado.setOrigemEncerramento(OrigemEncerramentoMissao.ADMINISTRATIVO);
            missaoLegado.setMissaoExcecaoId(missaoExcecaoId);
            missaoLegado.setAdministradorEncerramento(administrador);
            Missao saved = missaoRepository.save(missaoLegado);
            registrarEncerramentoSemChecklistNoVeiculo(veiculo, motoristaMissao, dataHoraFimEfetiva);
            missaoAuditoriaService.registrar(
                    saved,
                    AcaoAuditoriaMissao.ABERTURA_LEGADO_RECONSTRUIDA,
                    null,
                    StatusMissao.FINALIZADA,
                    administrador,
                    "Registro reconstruido e finalizado pela administracao. Excecao: %s".formatted(missaoExcecaoId)
            );
            missaoAuditoriaService.registrar(
                    saved,
                    AcaoAuditoriaMissao.ENCERRAMENTO_ADMINISTRATIVO,
                    StatusMissao.ATIVA,
                    StatusMissao.FINALIZADA,
                    administrador,
                    "Fim registrado pela administracao em registro reconstruido."
            );
            return;
        }

        Missao missao = missaoAtiva.get();
        missao.setStatus(StatusMissao.FINALIZADA);
        missao.setDataHoraFim(dataHoraFimEfetiva);
        missao.setOrigemEncerramento(OrigemEncerramentoMissao.ADMINISTRATIVO);
        missao.setAdministradorEncerramento(administrador);
        missao.setMissaoExcecaoId(missaoExcecaoId != null ? missaoExcecaoId : missao.getMissaoExcecaoId());
        Missao saved = missaoRepository.save(missao);
        registrarEncerramentoSemChecklistNoVeiculo(veiculo, missao.getMotorista(), dataHoraFimEfetiva);
        missaoAuditoriaService.registrar(
                saved,
                AcaoAuditoriaMissao.ENCERRAMENTO_ADMINISTRATIVO,
                StatusMissao.ATIVA,
                StatusMissao.FINALIZADA,
                administrador,
                "Fim registrado pela administracao."
        );
    }

    @Transactional
    public Missao encerrarPendenteAdministrativamente(
            Missao missao,
            Motorista administrador,
            LocalDateTime dataHoraFim,
            String justificativaEncerramento
    ) {
        LocalDateTime dataHoraFimEfetiva = dataHoraFim == null ? LocalDateTime.now() : dataHoraFim;
        String justificativaNormalizada = trimToNull(justificativaEncerramento);
        missao.setStatus(StatusMissao.FINALIZADA);
        missao.setDataHoraFim(dataHoraFimEfetiva);
        missao.setOrigemEncerramento(OrigemEncerramentoMissao.ADMINISTRATIVO);
        missao.setAdministradorEncerramento(administrador);
        missao.setJustificativaContingenciaEncerramento(justificativaNormalizada);
        Missao saved = missaoRepository.save(missao);
        registrarEncerramentoSemChecklistNoVeiculo(missao.getVeiculo(), missao.getMotorista(), dataHoraFimEfetiva);
        missaoAuditoriaService.registrar(
                saved,
                AcaoAuditoriaMissao.ENCERRAMENTO_PENDENTE_ADMIN,
                StatusMissao.ATIVA,
                StatusMissao.FINALIZADA,
                administrador,
                "Missao em aberto finalizada pela administracao. Justificativa: %s"
                        .formatted(justificativaNormalizada == null ? "-" : justificativaNormalizada)
        );
        return saved;
    }

    private Missao registrarEncerramentoLegadoPorChecklist(Checklist checklist) {
        LocalDateTime dataHoraInicio = checklistRepository
                .findTopByVeiculoIdAndMotoristaIdAndTipoOperacaoAndDataHoraLessThanOrderByDataHoraDescIdDesc(
                        checklist.getVeiculo().getId(),
                        checklist.getMotorista().getId(),
                        TipoOperacao.SAIDA,
                        checklist.getDataHora()
                )
                .map(Checklist::getDataHora)
                .orElse(checklist.getDataHora());

        Missao missao = new Missao();
        missao.setMotorista(checklist.getMotorista());
        missao.setVeiculo(checklist.getVeiculo());
        missao.setStatus(StatusMissao.FINALIZADA);
        missao.setDataHoraInicio(dataHoraInicio);
        missao.setDataHoraFim(checklist.getDataHora());
        missao.setOrigemAbertura(OrigemAberturaMissao.CHECKLIST);
        missao.setOrigemEncerramento(OrigemEncerramentoMissao.CHECKLIST);
        missao.setChecklistSaidaId(null);
        missao.setChecklistChegadaId(checklist.getId());
        Missao saved = missaoRepository.save(missao);
        missaoAuditoriaService.registrar(
                saved,
                AcaoAuditoriaMissao.ABERTURA_LEGADO_RECONSTRUIDA,
                null,
                StatusMissao.FINALIZADA,
                checklist.getMotorista(),
                "Registro reconstruido pelo checklist de chegada #%d.".formatted(checklist.getId())
        );
        missaoAuditoriaService.registrar(
                saved,
                AcaoAuditoriaMissao.ENCERRAMENTO_CHECKLIST,
                StatusMissao.ATIVA,
                StatusMissao.FINALIZADA,
                checklist.getMotorista(),
                "Fim registrado pelo checklist de chegada em registro reconstruido."
        );
        return saved;
    }

    private void liberarVeiculoParaMissao(Veiculo veiculo) {
        if (veiculo.getStatusAdministrativo() == StatusVeiculo.NO_PATIO) {
            veiculo.setStatusAdministrativo(null);
        }
    }

    private void registrarEncerramentoSemChecklistNoVeiculo(
            Veiculo veiculo,
            Motorista motoristaResponsavel,
            LocalDateTime dataHoraEncerramento
    ) {
        veiculo.setDataHoraUltimoEncerramentoSemChecklist(dataHoraEncerramento);
        veiculo.setMotoristaUltimoEncerramentoSemChecklist(motoristaResponsavel);
        veiculoRepository.save(veiculo);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }
}
