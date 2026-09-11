package com.frota.checklist.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "controle_alocacoes_historicos")
public class HistoricoAlocacaoVeiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "alocacao_id", nullable = false)
    private AlocacaoVeiculo alocacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoEventoAlocacaoVeiculo tipo;

    @Column(length = 10)
    private String placaVeiculoAnterior;

    @Column(length = 10)
    private String placaVeiculoNovo;

    @Column(length = 160)
    private String responsavelAnterior;

    @Column(length = 160)
    private String responsavelNovo;

    @Column(length = 60)
    private String limiteAnterior;

    @Column(length = 60)
    private String limiteNovo;

    @Column(length = 500)
    private String observacao;

    @Column(nullable = false)
    private LocalDateTime dataHora;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "administrador_id", nullable = false)
    private Motorista administrador;
}
