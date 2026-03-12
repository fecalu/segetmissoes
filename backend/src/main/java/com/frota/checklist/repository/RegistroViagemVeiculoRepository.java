package com.frota.checklist.repository;

import com.frota.checklist.entity.RegistroViagemVeiculo;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RegistroViagemVeiculoRepository extends JpaRepository<RegistroViagemVeiculo, Long> {

    @EntityGraph(attributePaths = {"motorista", "administradorRegistro", "administradorEncerramento", "veiculo"})
    Optional<RegistroViagemVeiculo> findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(Long veiculoId);

    @EntityGraph(attributePaths = {"motorista", "administradorRegistro", "administradorEncerramento", "veiculo"})
    List<RegistroViagemVeiculo> findByVeiculoIdOrderByDataHoraSaidaDescIdDesc(Long veiculoId);

    @EntityGraph(attributePaths = {"motorista", "administradorRegistro", "administradorEncerramento", "veiculo"})
    List<RegistroViagemVeiculo> findByVeiculoIdInAndDataHoraRetornoIsNull(Collection<Long> veiculoIds);

    void deleteByVeiculoId(Long veiculoId);
}
