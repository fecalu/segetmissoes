package com.frota.checklist.repository;

import com.frota.checklist.entity.AlocacaoVeiculo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AlocacaoVeiculoRepository extends JpaRepository<AlocacaoVeiculo, Long> {
    List<AlocacaoVeiculo> findAllByAtivaTrueOrderByNumeroControleAsc();
    boolean existsByPlacaIgnoreCaseAndAtivaTrue(String placa);
    boolean existsByPlacaIgnoreCaseAndAtivaTrueAndIdNot(String placa, Long id);
    Optional<AlocacaoVeiculo> findByVagaAdministrativaIdAndAtivaTrue(Long vagaAdministrativaId);
}
