package com.frota.checklist.repository;

import com.frota.checklist.entity.AuditoriaMissao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditoriaMissaoRepository extends JpaRepository<AuditoriaMissao, Long> {
    List<AuditoriaMissao> findByMissaoIdOrderByDataHoraDesc(Long missaoId);

    List<AuditoriaMissao> findByMissaoVeiculoIdOrderByDataHoraDesc(Long veiculoId);
}
