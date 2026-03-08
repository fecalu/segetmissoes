package com.frota.checklist.repository;

import com.frota.checklist.entity.MissaoExcecao;
import com.frota.checklist.entity.StatusExcecaoMissao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MissaoExcecaoRepository extends JpaRepository<MissaoExcecao, Long>, JpaSpecificationExecutor<MissaoExcecao> {
    Optional<MissaoExcecao> findFirstByVeiculoIdAndStatusInOrderByDataHoraAberturaDesc(
            Long veiculoId,
            Collection<StatusExcecaoMissao> statuses
    );

    Optional<MissaoExcecao> findFirstByMotoristaIdAndStatusInOrderByDataHoraAberturaDesc(
            Long motoristaId,
            Collection<StatusExcecaoMissao> statuses
    );

    List<MissaoExcecao> findByStatusInAndPrazoRegularizacaoBefore(
            Collection<StatusExcecaoMissao> statuses,
            LocalDateTime dataHora
    );

    long countByVeiculoId(Long veiculoId);
    List<MissaoExcecao> findByVeiculoId(Long veiculoId);
}
