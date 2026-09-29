package com.frota.checklist.repository;

import com.frota.checklist.entity.HistoricoVagaAdministrativa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HistoricoVagaAdministrativaRepository extends JpaRepository<HistoricoVagaAdministrativa, Long> {
    List<HistoricoVagaAdministrativa> findByVagaAdministrativaIdOrderByDataHoraDesc(Long vagaAdministrativaId);
}
