package com.frota.checklist.service;

import com.frota.checklist.dto.AuditoriaMissaoResponse;
import com.frota.checklist.dto.MissaoResponse;
import com.frota.checklist.entity.Missao;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.Perfil;
import com.frota.checklist.entity.StatusDocumentalMissao;
import com.frota.checklist.entity.StatusMissao;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.repository.MissaoRepository;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.exception.NotFoundException;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminMissaoService {

    private final MissaoRepository missaoRepository;
    private final MotoristaRepository motoristaRepository;
    private final MissaoAuditoriaService missaoAuditoriaService;

    public List<MissaoResponse> listar(
            Long motoristaId,
            Long veiculoId,
            StatusMissao status,
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
            }
            if (statusDocumental != null) {
                if (statusDocumental == StatusDocumentalMissao.PENDENTE_DADOS_ADMIN) {
                    predicates.add(cb.or(
                            cb.equal(root.get("statusDocumental"), StatusDocumentalMissao.PENDENTE_DADOS_ADMIN),
                            cb.isNull(root.get("statusDocumental"))
                    ));
                } else {
                    predicates.add(cb.equal(root.get("statusDocumental"), statusDocumental));
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
                .sorted(Comparator.comparing(Missao::getDataHoraInicio).reversed())
                .map(this::toResponse)
                .toList();
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
                missao.getMotorista().getId(),
                missao.getMotorista().getNome(),
                missao.getVeiculo().getId(),
                missao.getVeiculo().getPlaca(),
                missao.getVeiculo().getMarca(),
                missao.getVeiculo().getModelo(),
                missao.getChecklistSaidaId(),
                missao.getChecklistChegadaId(),
                missao.getMissaoExcecaoId(),
                missao.getAdministradorEncerramento() != null ? missao.getAdministradorEncerramento().getId() : null,
                missao.getAdministradorEncerramento() != null ? missao.getAdministradorEncerramento().getNome() : null,
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
            String solicitanteNome
    ) {
        Missao missao = missaoRepository.findById(missaoId)
                .orElseThrow(() -> new NotFoundException("Missao nao encontrada"));
        Motorista administrador = motoristaRepository.findById(administradorId)
                .orElseThrow(() -> new NotFoundException("Administrador nao encontrado"));

        if (administrador.getPerfil() != Perfil.ADMIN) {
            throw new BusinessException("Usuario sem permissao administrativa");
        }

        String novoLocalDestino = trimToNull(localDestino);
        String novoSetorSolicitante = trimToNull(setorSolicitante);
        String novoSolicitanteNome = trimToNull(solicitanteNome);

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

    private StatusDocumentalMissao statusDocumentalEfetivo(Missao missao) {
        return missao.getStatusDocumental() == null
                ? StatusDocumentalMissao.PENDENTE_DADOS_ADMIN
                : missao.getStatusDocumental();
    }
}
