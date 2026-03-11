package com.frota.checklist.repository;

import com.frota.checklist.entity.MissaoExcecao;
import com.frota.checklist.entity.StatusExcecaoMissao;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @EntityGraph(attributePaths = {"motorista"})
    List<MissaoExcecao> findByVeiculoIdInAndStatusIn(
            Collection<Long> veiculoIds,
            Collection<StatusExcecaoMissao> statuses
    );

    @Query("""
            select e
            from MissaoExcecao e
            join fetch e.motorista
            join fetch e.veiculo
            where e.dataHoraAbertura between :inicio and :fim
            order by e.dataHoraAbertura asc, e.id asc
            """)
    List<MissaoExcecao> buscarParaRelatorio(
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim
    );

    long countByVeiculoId(Long veiculoId);
    List<MissaoExcecao> findByVeiculoId(Long veiculoId);
}
