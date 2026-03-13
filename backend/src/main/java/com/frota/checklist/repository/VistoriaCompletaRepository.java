package com.frota.checklist.repository;

import com.frota.checklist.entity.VistoriaCompleta;
import com.frota.checklist.entity.TipoOperacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface VistoriaCompletaRepository extends JpaRepository<VistoriaCompleta, Long>, JpaSpecificationExecutor<VistoriaCompleta> {
    List<VistoriaCompleta> findByVeiculoIdOrderByDataHoraDescIdDesc(Long veiculoId);
    List<VistoriaCompleta> findByVeiculoIdInAndTipoOperacaoOrderByDataHoraDescIdDesc(Collection<Long> veiculoIds, TipoOperacao tipoOperacao);
    Optional<VistoriaCompleta> findTopByVeiculoIdAndTipoOperacaoOrderByDataHoraDescIdDesc(Long veiculoId, TipoOperacao tipoOperacao);
}
