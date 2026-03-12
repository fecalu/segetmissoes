package com.frota.checklist.repository;

import com.frota.checklist.entity.VistoriaCompleta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface VistoriaCompletaRepository extends JpaRepository<VistoriaCompleta, Long>, JpaSpecificationExecutor<VistoriaCompleta> {
    java.util.List<VistoriaCompleta> findByVeiculoIdOrderByDataHoraDescIdDesc(Long veiculoId);
}
