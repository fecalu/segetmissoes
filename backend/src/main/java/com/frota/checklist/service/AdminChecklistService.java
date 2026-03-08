package com.frota.checklist.service;

import com.frota.checklist.dto.ChecklistResponse;
import com.frota.checklist.dto.FotoResponse;
import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.repository.ChecklistRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminChecklistService {

    private final ChecklistRepository checklistRepository;

    public List<ChecklistResponse> listar(
            Long motoristaId,
            Long veiculoId,
            TipoOperacao tipoOperacao,
            LocalDate dataInicio,
            LocalDate dataFim,
            String busca
    ) {
        Specification<Checklist> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (motoristaId != null) {
                predicates.add(cb.equal(root.get("motorista").get("id"), motoristaId));
            }
            if (veiculoId != null) {
                predicates.add(cb.equal(root.get("veiculo").get("id"), veiculoId));
            }
            if (tipoOperacao != null) {
                predicates.add(cb.equal(root.get("tipoOperacao"), tipoOperacao));
            }
            if (dataInicio != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dataHora"), dataInicio.atStartOfDay()));
            }
            if (dataFim != null) {
                LocalDateTime fimDoDia = dataFim.atTime(23, 59, 59);
                predicates.add(cb.lessThanOrEqualTo(root.get("dataHora"), fimDoDia));
            }
            if (busca != null && !busca.isBlank()) {
                String pattern = "%" + busca.toLowerCase(Locale.ROOT) + "%";
                Predicate nomeMotorista = cb.like(cb.lower(root.get("motorista").get("nome")), pattern);
                Predicate cpfMotorista = cb.like(root.get("motorista").get("cpf"), "%" + busca + "%");
                Predicate placaVeiculo = cb.like(cb.lower(root.get("veiculo").get("placa")), pattern);
                predicates.add(cb.or(nomeMotorista, cpfMotorista, placaVeiculo));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return checklistRepository.findAll(spec).stream()
                .map(this::toResponse)
                .toList();
    }

    private ChecklistResponse toResponse(Checklist checklist) {
        List<FotoResponse> fotos = checklist.getFotos().stream()
                .map(f -> new FotoResponse(f.getId(), f.getTipoFoto(), f.getCaminhoArquivo()))
                .toList();

        return new ChecklistResponse(
                checklist.getId(),
                checklist.getDataHora(),
                checklist.getTipoOperacao(),
                checklist.getQuilometragem(),
                checklist.getMotorista().getId(),
                checklist.getMotorista().getNome(),
                checklist.getVeiculo().getId(),
                checklist.getVeiculo().getPlaca(),
                fotos
        );
    }
}
