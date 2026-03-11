package com.frota.checklist.repository;

import com.frota.checklist.entity.CampoSugestaoMissao;
import com.frota.checklist.entity.ConfiguracaoSugestaoMissao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConfiguracaoSugestaoMissaoRepository extends JpaRepository<ConfiguracaoSugestaoMissao, Long> {

    List<ConfiguracaoSugestaoMissao> findAllByOrderByCampoAscValorAsc();

    void deleteByCampo(CampoSugestaoMissao campo);
}
