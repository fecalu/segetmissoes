package com.frota.checklist.service;

import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.AcaoAuditoriaMissao;
import com.frota.checklist.entity.Missao;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.OrigemAberturaMissao;
import com.frota.checklist.entity.OrigemEncerramentoMissao;
import com.frota.checklist.entity.StatusMissao;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.repository.ChecklistRepository;
import com.frota.checklist.repository.MissaoRepository;
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
                    "Motorista ja possui missao ativa no veiculo %s. Finalize a missao atual antes de iniciar outra."
                            .formatted(missao.getVeiculo().getPlaca())
            );
        });
    }

    public void validarVeiculoSemMissaoAtiva(Long veiculoId) {
        buscarMissaoAtivaPorVeiculo(veiculoId).ifPresent(missao -> {
            throw new BusinessException("Veiculo ja possui missao ativa em andamento.");
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
                "Missao aberta a partir do checklist de saida #%d.".formatted(checklist.getId())
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
                "Missao aberta sem checklist. Excecao vinculada: %s".formatted(missaoExcecaoId)
        );
        return saved;
    }

    @Transactional
    public Missao encerrarComChecklist(Checklist checklist) {
        if (checklist.getTipoOperacao() != TipoOperacao.ENTRADA) {
            throw new BusinessException("Checklist invalido para encerramento de missao");
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
                "Missao encerrada pelo checklist de chegada #%d.".formatted(checklist.getId())
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
        Optional<Missao> missaoOpt = buscarMissaoAtivaPorVeiculo(veiculo.getId());
        if (missaoOpt.isEmpty()) {
            Missao missaoLegado = new Missao();
            missaoLegado.setMotorista(motorista);
            missaoLegado.setVeiculo(veiculo);
            missaoLegado.setStatus(StatusMissao.FINALIZADA);
            missaoLegado.setDataHoraInicio(dataHoraInicioFallback != null ? dataHoraInicioFallback : dataHoraFim);
            missaoLegado.setDataHoraFim(dataHoraFim == null ? LocalDateTime.now() : dataHoraFim);
            missaoLegado.setOrigemAbertura(OrigemAberturaMissao.SEM_CHECKLIST);
            missaoLegado.setOrigemEncerramento(OrigemEncerramentoMissao.SEM_CHECKLIST);
            missaoLegado.setMissaoExcecaoId(missaoExcecaoId);
            Missao saved = missaoRepository.save(missaoLegado);
            missaoAuditoriaService.registrar(
                    saved,
                    AcaoAuditoriaMissao.ABERTURA_LEGADO_RECONSTRUIDA,
                    null,
                    StatusMissao.FINALIZADA,
                    motorista,
                    "Missao legada reconstruida e encerrada sem checklist. Excecao vinculada: %s".formatted(missaoExcecaoId)
            );
            missaoAuditoriaService.registrar(
                    saved,
                    AcaoAuditoriaMissao.ENCERRAMENTO_SEM_CHECKLIST,
                    StatusMissao.ATIVA,
                    StatusMissao.FINALIZADA,
                    motorista,
                    "Encerramento sem checklist em missao legada reconstruida."
            );
            return saved;
        }

        Missao missao = missaoOpt.get();
        if (!missao.getMotorista().getId().equals(motorista.getId())) {
            throw new BusinessException("Somente o motorista responsavel pela missao pode finalizar sem checklist");
        }

        missao.setStatus(StatusMissao.FINALIZADA);
        missao.setDataHoraFim(dataHoraFim == null ? LocalDateTime.now() : dataHoraFim);
        missao.setOrigemEncerramento(OrigemEncerramentoMissao.SEM_CHECKLIST);
        missao.setMissaoExcecaoId(missaoExcecaoId != null ? missaoExcecaoId : missao.getMissaoExcecaoId());
        Missao saved = missaoRepository.save(missao);
        missaoAuditoriaService.registrar(
                saved,
                AcaoAuditoriaMissao.ENCERRAMENTO_SEM_CHECKLIST,
                StatusMissao.ATIVA,
                StatusMissao.FINALIZADA,
                motorista,
                "Missao encerrada sem checklist. Excecao vinculada: %s".formatted(saved.getMissaoExcecaoId())
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
        Optional<Missao> missaoAtiva = buscarMissaoAtivaPorVeiculo(veiculo.getId());
        if (missaoAtiva.isEmpty()) {
            Missao missaoLegado = new Missao();
            missaoLegado.setMotorista(motoristaMissao);
            missaoLegado.setVeiculo(veiculo);
            missaoLegado.setStatus(StatusMissao.FINALIZADA);
            missaoLegado.setDataHoraInicio(dataHoraInicioFallback != null ? dataHoraInicioFallback : (dataHoraFim == null ? LocalDateTime.now() : dataHoraFim));
            missaoLegado.setDataHoraFim(dataHoraFim == null ? LocalDateTime.now() : dataHoraFim);
            missaoLegado.setOrigemAbertura(OrigemAberturaMissao.SEM_CHECKLIST);
            missaoLegado.setOrigemEncerramento(OrigemEncerramentoMissao.ADMINISTRATIVO);
            missaoLegado.setMissaoExcecaoId(missaoExcecaoId);
            missaoLegado.setAdministradorEncerramento(administrador);
            Missao saved = missaoRepository.save(missaoLegado);
            missaoAuditoriaService.registrar(
                    saved,
                    AcaoAuditoriaMissao.ABERTURA_LEGADO_RECONSTRUIDA,
                    null,
                    StatusMissao.FINALIZADA,
                    administrador,
                    "Missao legada reconstruida e encerrada administrativamente. Excecao: %s".formatted(missaoExcecaoId)
            );
            missaoAuditoriaService.registrar(
                    saved,
                    AcaoAuditoriaMissao.ENCERRAMENTO_ADMINISTRATIVO,
                    StatusMissao.ATIVA,
                    StatusMissao.FINALIZADA,
                    administrador,
                    "Encerramento administrativo em missao legada."
            );
            return;
        }

        Missao missao = missaoAtiva.get();
        missao.setStatus(StatusMissao.FINALIZADA);
        missao.setDataHoraFim(dataHoraFim == null ? LocalDateTime.now() : dataHoraFim);
        missao.setOrigemEncerramento(OrigemEncerramentoMissao.ADMINISTRATIVO);
        missao.setAdministradorEncerramento(administrador);
        missao.setMissaoExcecaoId(missaoExcecaoId != null ? missaoExcecaoId : missao.getMissaoExcecaoId());
        Missao saved = missaoRepository.save(missao);
        missaoAuditoriaService.registrar(
                saved,
                AcaoAuditoriaMissao.ENCERRAMENTO_ADMINISTRATIVO,
                StatusMissao.ATIVA,
                StatusMissao.FINALIZADA,
                administrador,
                "Missao encerrada administrativamente."
        );
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
                "Missao legada reconstruida por checklist de chegada #%d.".formatted(checklist.getId())
        );
        missaoAuditoriaService.registrar(
                saved,
                AcaoAuditoriaMissao.ENCERRAMENTO_CHECKLIST,
                StatusMissao.ATIVA,
                StatusMissao.FINALIZADA,
                checklist.getMotorista(),
                "Encerramento por checklist de chegada em missao legada reconstruida."
        );
        return saved;
    }
}
