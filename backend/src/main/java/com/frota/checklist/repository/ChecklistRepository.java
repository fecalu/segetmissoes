package com.frota.checklist.repository;

import com.frota.checklist.entity.Checklist;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ChecklistRepository extends JpaRepository<Checklist, Long>, JpaSpecificationExecutor<Checklist> {

    boolean existsByVeiculoId(Long veiculoId);
    long countByVeiculoId(Long veiculoId);
    List<Checklist> findByVeiculoId(Long veiculoId);
    Optional<Checklist> findTopByVeiculoIdOrderByDataHoraAscIdAsc(Long veiculoId);

    @EntityGraph(attributePaths = {"motorista"})
    Optional<Checklist> findTopByVeiculoIdOrderByDataHoraDescIdDesc(Long veiculoId);

    @Query("""
            select c
            from Checklist c
            join fetch c.motorista
            join fetch c.veiculo
            where c.dataHora between :inicio and :fim
            order by c.dataHora asc
            """)
    List<Checklist> buscarParaRelatorio(
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim
    );
}
