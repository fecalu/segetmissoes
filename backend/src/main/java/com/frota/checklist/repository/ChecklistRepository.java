package com.frota.checklist.repository;

import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.repository.projection.UltimoChecklistStatusProjection;
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

    Optional<Checklist> findTopByVeiculoIdAndMotoristaIdAndTipoOperacaoOrderByDataHoraDescIdDesc(
            Long veiculoId,
            Long motoristaId,
            TipoOperacao tipoOperacao
    );

    Optional<Checklist> findTopByVeiculoIdAndMotoristaIdAndTipoOperacaoAndDataHoraLessThanOrderByDataHoraDescIdDesc(
            Long veiculoId,
            Long motoristaId,
            TipoOperacao tipoOperacao,
            LocalDateTime dataHora
    );

    @Query("""
            select distinct c
            from Checklist c
            join fetch c.motorista
            join fetch c.veiculo
            left join fetch c.fotos
            where c.dataHora between :inicio and :fim
            order by c.dataHora asc, c.id asc
            """)
    List<Checklist> buscarParaRelatorio(
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim
    );

    @Query(value = """
            select c.veiculo_id as veiculoId,
                   c.tipo_operacao as tipoOperacao,
                   c.motorista_id as motoristaId,
                   m.nome as motoristaNome,
                   c.data_hora as dataHora
            from checklists c
            join motoristas m on m.id = c.motorista_id
            join (
                select distinct on (veiculo_id) id, veiculo_id
                from checklists
                where veiculo_id in (:veiculoIds)
                order by veiculo_id, data_hora desc, id desc
            ) ult on ult.id = c.id
            """, nativeQuery = true)
    List<UltimoChecklistStatusProjection> buscarUltimoStatusPorVeiculoIds(@Param("veiculoIds") List<Long> veiculoIds);
}
