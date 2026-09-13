package com.frota.checklist.repository;

import com.frota.checklist.entity.VagaAdministrativa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VagaAdministrativaRepository extends JpaRepository<VagaAdministrativa, Long> {
    Optional<VagaAdministrativa> findTopByOrderByNumeroControleDesc();
}
