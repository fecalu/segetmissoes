package com.frota.checklist.service;

import com.frota.checklist.dto.IniciarMissaoExcecaoRequest;
import com.frota.checklist.dto.MissaoExcecaoResponse;
import com.frota.checklist.dto.FinalizarMissaoSemChecklistRequest;
import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.MissaoExcecao;
import com.frota.checklist.entity.MotivoExcecaoMissao;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.entity.StatusExcecaoMissao;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.MissaoExcecaoRepository;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.repository.VeiculoRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MissaoExcecaoService {

    private static final EnumSet<MotivoExcecaoMissao> MOTIVOS_PERMITIDOS = EnumSet.of(
            MotivoExcecaoMissao.URGENCIA_OPERACIONAL,
            MotivoExcecaoMissao.CHUVA_FORTE,
            MotivoExcecaoMissao.FALHA_CAMERA,
            MotivoExcecaoMissao.OUTROS
    );

    private final MissaoExcecaoRepository missaoExcecaoRepository;
    private final MotoristaRepository motoristaRepository;
    private final VeiculoRepository veiculoRepository;
    private final VeiculoStatusResolver veiculoStatusResolver;
    private final MissaoAtivaValidatorService missaoAtivaValidatorService;
    private final MissaoService missaoService;

    @Transactional
    public MissaoExcecaoResponse iniciarSemChecklist(
            Long motoristaId,
            IniciarMissaoExcecaoRequest request,
            String ipOrigem,
            String dispositivo
    ) {
        atualizarAtrasosPendentes();

        if (!request.aceiteResponsabilidade()) {
            throw new BusinessException("Aceite de responsabilidade e obrigatorio");
        }
        validarMotivoPermitido(request.motivo());

        Motorista motorista = motoristaRepository.findById(motoristaId)
                .orElseThrow(() -> new NotFoundException("Motorista nao encontrado"));
        missaoAtivaValidatorService.validarMotoristaSemMissaoAtiva(motoristaId);
        Veiculo veiculo = veiculoRepository.findById(request.veiculoId())
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));

        if (Boolean.TRUE.equals(veiculo.getDesativado())) {
            throw new BusinessException("Veiculo desativado nao pode iniciar missao");
        }

        VeiculoStatusSnapshot statusVeiculo = veiculoStatusResolver.resolver(veiculo);
        if (!statusVeiculo.statusAtual().permiteInicioMissaoMotorista()) {
            throw new BusinessException("Veiculo indisponivel para iniciar missao sem checklist. Status atual: " + statusVeiculo.statusAtual());
        }

        Optional<MissaoExcecao> excecaoVeiculoAberta = missaoExcecaoRepository
                .findFirstByVeiculoIdAndStatusInOrderByDataHoraAberturaDesc(veiculo.getId(), StatusExcecaoMissao.abertas());
        if (excecaoVeiculoAberta.isPresent()) {
            throw new BusinessException("Veiculo ja possui uma missao em excecao aberta");
        }

        MissaoExcecao missaoExcecao = new MissaoExcecao();
        missaoExcecao.setMotorista(motorista);
        missaoExcecao.setVeiculo(veiculo);
        missaoExcecao.setMotivo(request.motivo());
        missaoExcecao.setAceiteResponsabilidade(true);
        missaoExcecao.setStatus(StatusExcecaoMissao.EXCECAO_ABERTA);
        missaoExcecao.setIpOrigem(trimToNull(ipOrigem));
        missaoExcecao.setDispositivo(trimToNull(dispositivo));

        MissaoExcecao saved = missaoExcecaoRepository.save(missaoExcecao);
        missaoService.abrirSemChecklist(motorista, veiculo, saved.getId(), saved.getDataHoraAbertura());
        return toResponse(saved);
    }

    @Transactional
    public MissaoExcecaoResponse finalizarSemChecklist(Long motoristaId, FinalizarMissaoSemChecklistRequest request) {
        atualizarAtrasosPendentes();

        if (!request.aceiteResponsabilidade()) {
            throw new BusinessException("Aceite de responsabilidade e obrigatorio");
        }
        validarMotivoPermitido(request.motivo());

        Motorista motorista = motoristaRepository.findById(motoristaId)
                .orElseThrow(() -> new NotFoundException("Motorista nao encontrado"));
        Veiculo veiculo = veiculoRepository.findById(request.veiculoId())
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));

        LocalDateTime agora = LocalDateTime.now();
        Optional<MissaoExcecao> missaoAbertaOpt = missaoExcecaoRepository
                .findFirstByVeiculoIdAndStatusInOrderByDataHoraAberturaDesc(veiculo.getId(), StatusExcecaoMissao.abertas());

        MissaoExcecao registro;
        if (missaoAbertaOpt.isPresent()) {
            MissaoExcecao aberta = missaoAbertaOpt.get();
            if (!aberta.getMotorista().getId().equals(motoristaId)) {
                throw new BusinessException("Existe uma excecao aberta para este veiculo em nome de outro motorista");
            }
            aberta.setStatus(StatusExcecaoMissao.REGULARIZADA_SEM_CHECKLIST);
            aberta.setDataHoraRegularizacao(agora);
            registro = missaoExcecaoRepository.save(aberta);
        } else {
            MissaoExcecao regularizacao = new MissaoExcecao();
            regularizacao.setMotorista(motorista);
            regularizacao.setVeiculo(veiculo);
            regularizacao.setMotivo(request.motivo());
            regularizacao.setAceiteResponsabilidade(true);
            regularizacao.setStatus(StatusExcecaoMissao.REGULARIZADA_SEM_CHECKLIST);
            regularizacao.setDataHoraRegularizacao(agora);
            regularizacao.setSomenteEncerramentoSemChecklist(true);
            registro = missaoExcecaoRepository.save(regularizacao);
        }

        missaoService.encerrarSemChecklist(motorista, veiculo, registro.getId(), agora, registro.getDataHoraAbertura());

        veiculo.setDataHoraUltimoEncerramentoSemChecklist(agora);
        veiculo.setMotoristaUltimoEncerramentoSemChecklist(motorista);
        veiculoRepository.save(veiculo);

        return toResponse(registro);
    }

    @Transactional
    public MissaoExcecaoResponse encerrarAdministrativamente(Long missaoExcecaoId, Long administradorId, String justificativaEncerramento) {
        atualizarAtrasosPendentes();

        MissaoExcecao missao = missaoExcecaoRepository.findById(missaoExcecaoId)
                .orElseThrow(() -> new NotFoundException("Missao em excecao nao encontrada"));
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));

        if (administrador.getPerfil() != Perfil.ADMIN) {
            throw new BusinessException("Somente administradores podem encerrar excecao");
        }
        if (!missao.getStatus().isAberta()) {
            throw new BusinessException("Missao em excecao ja foi encerrada");
        }
        if (justificativaEncerramento == null || justificativaEncerramento.trim().length() < 10) {
            throw new BusinessException("Justificativa de encerramento deve ter pelo menos 10 caracteres");
        }

        missao.setStatus(StatusExcecaoMissao.ENCERRADA_ADMIN);
        missao.setDataHoraRegularizacao(LocalDateTime.now());
        missao.setAdministradorEncerramento(administrador);
        missao.setJustificativaEncerramentoAdmin(justificativaEncerramento.trim());
        MissaoExcecao saved = missaoExcecaoRepository.save(missao);
        missaoService.encerrarPorAdministracao(
                saved.getVeiculo(),
                saved.getMotorista(),
                administrador,
                saved.getId(),
                saved.getDataHoraAbertura(),
                saved.getDataHoraRegularizacao()
        );
        return toResponse(saved);
    }

    @Transactional
    public void regularizarPorChecklistChegada(Checklist checklist) {
        if (checklist.getTipoOperacao() != TipoOperacao.ENTRADA) {
            return;
        }

        Optional<MissaoExcecao> missaoAbertaOpt = missaoExcecaoRepository
                .findFirstByVeiculoIdAndStatusInOrderByDataHoraAberturaDesc(checklist.getVeiculo().getId(), StatusExcecaoMissao.abertas());
        if (missaoAbertaOpt.isEmpty()) {
            return;
        }

        MissaoExcecao missao = missaoAbertaOpt.get();
        missao.setStatus(StatusExcecaoMissao.REGULARIZADA_POR_CHECKLIST);
        missao.setDataHoraRegularizacao(LocalDateTime.now());
        missao.setChecklistRegularizacaoId(checklist.getId());
        missaoExcecaoRepository.save(missao);
    }

    @Transactional
    public void atualizarAtrasosPendentes() {
        List<MissaoExcecao> pendentes = missaoExcecaoRepository.findByStatusInAndPrazoRegularizacaoBefore(
                List.of(StatusExcecaoMissao.EXCECAO_ABERTA),
                LocalDateTime.now()
        );
        pendentes.forEach(m -> m.setStatus(StatusExcecaoMissao.ATRASADA));
        if (!pendentes.isEmpty()) {
            missaoExcecaoRepository.saveAll(pendentes);
        }
    }

    public Optional<MissaoExcecao> buscarMissaoAbertaPorVeiculo(Long veiculoId) {
        return missaoExcecaoRepository.findFirstByVeiculoIdAndStatusInOrderByDataHoraAberturaDesc(
                veiculoId,
                StatusExcecaoMissao.abertas()
        );
    }

    @Transactional
    public MissaoExcecao regularizarPorVistoriaCompleta(
            MissaoExcecao missaoExcecao,
            Motorista motoristaResponsavel,
            LocalDateTime dataHoraRegularizacao
    ) {
        if (missaoExcecao == null || !missaoExcecao.getStatus().isAberta()) {
            return missaoExcecao;
        }
        if (!missaoExcecao.getMotorista().getId().equals(motoristaResponsavel.getId())) {
            throw new BusinessException("Somente o motorista responsavel pode regularizar a excecao pela vistoria completa");
        }

        missaoExcecao.setStatus(StatusExcecaoMissao.REGULARIZADA_SEM_CHECKLIST);
        missaoExcecao.setDataHoraRegularizacao(dataHoraRegularizacao == null ? LocalDateTime.now() : dataHoraRegularizacao);
        return missaoExcecaoRepository.save(missaoExcecao);
    }

    public List<MissaoExcecaoResponse> listarAdmin(
            StatusExcecaoMissao status,
            Long motoristaId,
            Long veiculoId,
            LocalDate dataInicio,
            LocalDate dataFim,
            String busca
    ) {
        atualizarAtrasosPendentes();

        Specification<MissaoExcecao> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (motoristaId != null) {
                predicates.add(cb.equal(root.get("motorista").get("id"), motoristaId));
            }
            if (veiculoId != null) {
                predicates.add(cb.equal(root.get("veiculo").get("id"), veiculoId));
            }
            if (dataInicio != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dataHoraAbertura"), dataInicio.atStartOfDay()));
            }
            if (dataFim != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dataHoraAbertura"), dataFim.atTime(23, 59, 59)));
            }
            if (busca != null && !busca.isBlank()) {
                String pattern = "%" + busca.toLowerCase(Locale.ROOT) + "%";
                Predicate nomeMotorista = cb.like(cb.lower(root.get("motorista").get("nome")), pattern);
                Predicate placa = cb.like(cb.lower(root.get("veiculo").get("placa")), pattern);
                predicates.add(cb.or(nomeMotorista, placa));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return missaoExcecaoRepository.findAll(spec).stream()
                .sorted((a, b) -> b.getDataHoraAbertura().compareTo(a.getDataHoraAbertura()))
                .map(this::toResponse)
                .toList();
    }

    private void validarMotivoPermitido(MotivoExcecaoMissao motivo) {
        if (!MOTIVOS_PERMITIDOS.contains(motivo)) {
            throw new BusinessException("Motivo de excecao invalido para este fluxo");
        }
    }

    private MissaoExcecaoResponse toResponse(MissaoExcecao missao) {
        LocalDateTime agora = LocalDateTime.now();
        boolean atrasada = missao.getStatus().isAberta() && agora.isAfter(missao.getPrazoRegularizacao());
        long minutosEmAberto = ChronoUnit.MINUTES.between(missao.getDataHoraAbertura(), missao.getDataHoraRegularizacao() != null ? missao.getDataHoraRegularizacao() : agora);

        String statusRegularizacao;
        if (missao.getStatus() == StatusExcecaoMissao.ENCERRADA_ADMIN
                || missao.getStatus() == StatusExcecaoMissao.REGULARIZADA_POR_CHECKLIST
                || missao.getStatus() == StatusExcecaoMissao.REGULARIZADA_SEM_CHECKLIST) {
            statusRegularizacao = "REGULARIZADA";
        } else if (atrasada || missao.getStatus() == StatusExcecaoMissao.ATRASADA) {
            statusRegularizacao = "ATRASADA";
        } else {
            statusRegularizacao = "PENDENTE";
        }

        return new MissaoExcecaoResponse(
                missao.getId(),
                missao.getStatus(),
                statusRegularizacao,
                missao.getDataHoraAbertura(),
                missao.getPrazoRegularizacao(),
                missao.getDataHoraRegularizacao(),
                atrasada,
                minutosEmAberto,
                missao.getMotorista().getId(),
                missao.getMotorista().getNome(),
                missao.getVeiculo().getId(),
                missao.getVeiculo().getPlaca(),
                missao.getMotivo(),
                missao.getJustificativa(),
                missao.getJustificativaEncerramentoAdmin(),
                missao.getAdministradorEncerramento() != null ? missao.getAdministradorEncerramento().getId() : null,
                missao.getAdministradorEncerramento() != null ? missao.getAdministradorEncerramento().getNome() : null,
                missao.getChecklistRegularizacaoId(),
                missao.getIpOrigem(),
                missao.getDispositivo(),
                missao.getLocalizacao(),
                missao.isSomenteEventoEncerramentoSemChecklist()
        );
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }
}
