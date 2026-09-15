package com.frota.checklist.repository;

import com.frota.checklist.entity.ConfiguracaoLocalOperacional;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConfiguracaoLocalOperacionalRepository extends JpaRepository<ConfiguracaoLocalOperacional, Long> {

    List<ConfiguracaoLocalOperacional> findAllByOrderByOrdemExibicaoAscNomeAsc();
}
