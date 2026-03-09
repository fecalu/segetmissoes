package com.frota.checklist.repository;

import com.frota.checklist.entity.ConfiguracaoRotuloStatusVeiculo;
import com.frota.checklist.entity.StatusVeiculo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfiguracaoRotuloStatusVeiculoRepository extends JpaRepository<ConfiguracaoRotuloStatusVeiculo, StatusVeiculo> {
}
