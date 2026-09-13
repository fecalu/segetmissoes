package com.frota.checklist.repository;

import com.frota.checklist.entity.HistoricoAlocacaoVeiculo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HistoricoAlocacaoVeiculoRepository extends JpaRepository<HistoricoAlocacaoVeiculo, Long> {
    List<HistoricoAlocacaoVeiculo> findByAlocacaoIdOrderByDataHoraDesc(Long alocacaoId);
}
