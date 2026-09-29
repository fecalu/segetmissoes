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
@Table(name = "controle_vagas_administrativas_historicos")
public class HistoricoVagaAdministrativa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vaga_administrativa_id", nullable = false)
    private VagaAdministrativa vagaAdministrativa;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoEventoVagaAdministrativa tipo;

    @Column(length = 10)
    private String placaAnterior;

    @Column(length = 10)
    private String placaNova;

    @Column(length = 160)
    private String responsavelAnterior;

    @Column(length = 160)
    private String responsavelNovo;

    @Column(length = 600)
    private String dadosAnteriores;

    @Column(length = 600)
    private String dadosNovos;

    @Column(length = 500)
    private String observacao;

    @Column(nullable = false)
    private LocalDateTime dataHora;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "administrador_id")
    private Motorista administrador;
}
