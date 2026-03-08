package com.frota.checklist.repository;

import com.frota.checklist.entity.HistoricoStatusVeiculo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HistoricoStatusVeiculoRepository extends JpaRepository<HistoricoStatusVeiculo, Long> {
    List<HistoricoStatusVeiculo> findByVeiculoIdOrderByDataHoraDesc(Long veiculoId);
    void deleteByVeiculoId(Long veiculoId);
}
