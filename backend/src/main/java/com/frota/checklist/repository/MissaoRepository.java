package com.frota.checklist.repository;

import com.frota.checklist.entity.Missao;
import com.frota.checklist.entity.StatusMissao;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MissaoRepository extends JpaRepository<Missao, Long>, JpaSpecificationExecutor<Missao> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from Missao m where m.id = :id")
    Optional<Missao> buscarParaAtualizacao(@Param("id") Long id);

    @EntityGraph(attributePaths = {"motorista", "veiculo"})
    Optional<Missao> findFirstByMotoristaIdAndStatusOrderByDataHoraInicioDesc(Long motoristaId, StatusMissao status);

    @EntityGraph(attributePaths = {"motorista", "veiculo"})
    Optional<Missao> findFirstByVeiculoIdAndStatusOrderByDataHoraInicioDesc(Long veiculoId, StatusMissao status);

    @EntityGraph(attributePaths = {"motorista", "veiculo"})
    List<Missao> findByStatusAndVeiculoIdIn(StatusMissao status, List<Long> veiculoIds);

    List<Missao> findByVeiculoIdOrderByDataHoraInicioDescIdDesc(Long veiculoId);

    long countByVeiculoId(Long veiculoId);

    boolean existsByMotoristaIdAndStatus(Long motoristaId, StatusMissao status);

    boolean existsByVeiculoIdAndStatus(Long veiculoId, StatusMissao status);

    long countByStatus(StatusMissao status);

    @EntityGraph(attributePaths = {"motorista", "veiculo"})
    @Query("""
            select m
            from Missao m
            where m.dataHoraInicio between :inicio and :fim
              and m.status <> com.frota.checklist.entity.StatusMissao.CANCELADA
            order by m.dataHoraInicio asc
            """)
    List<Missao> buscarParaRelatorio(
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim
    );
}
