package com.frota.checklist.repository;

import com.frota.checklist.entity.AuditoriaAdministrativa;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditoriaAdministrativaRepository extends JpaRepository<AuditoriaAdministrativa, Long> {
    List<AuditoriaAdministrativa> findTop200ByEntidadeOrderByDataHoraDescIdDesc(String entidade);
}
