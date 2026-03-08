package com.frota.checklist.repository;

import com.frota.checklist.entity.Checklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ChecklistRepository extends JpaRepository<Checklist, Long>, JpaSpecificationExecutor<Checklist> {
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
