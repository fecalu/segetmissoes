package com.frota.checklist.repository;

import com.frota.checklist.entity.RegistroUsoExternoVeiculo;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RegistroUsoExternoVeiculoRepository extends JpaRepository<RegistroUsoExternoVeiculo, Long> {

    @EntityGraph(attributePaths = {"administradorRegistro", "administradorEncerramento", "veiculo"})
    Optional<RegistroUsoExternoVeiculo> findFirstByVeiculoIdAndDataHoraRetornoIsNullOrderByDataHoraSaidaDesc(Long veiculoId);

    @EntityGraph(attributePaths = {"administradorRegistro", "administradorEncerramento", "veiculo"})
    List<RegistroUsoExternoVeiculo> findByVeiculoIdOrderByDataHoraSaidaDescIdDesc(Long veiculoId);

    @EntityGraph(attributePaths = {"administradorRegistro", "administradorEncerramento", "veiculo"})
    List<RegistroUsoExternoVeiculo> findByVeiculoIdInAndDataHoraRetornoIsNull(Collection<Long> veiculoIds);

    Optional<RegistroUsoExternoVeiculo> findFirstByVistoriaSaidaId(Long vistoriaSaidaId);

    Optional<RegistroUsoExternoVeiculo> findFirstByVistoriaChegadaId(Long vistoriaChegadaId);

    void deleteByVeiculoId(Long veiculoId);
}
