package com.frota.checklist.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "controle_alocacoes")
public class AlocacaoVeiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Integer numeroControle;

    @Column(nullable = false, length = 10)
    private String placa;

    @Column(nullable = false, length = 180)
    private String modelo;

    @Column(length = 120)
    private String marca;

    @Column(nullable = false, length = 160)
    private String responsavelNome;

    @Column(nullable = false, length = 160)
    private String secretariaOrgao;

    @Column(nullable = false, length = 160)
    private String setor;

    @Column(nullable = false, length = 60)
    private String limiteAutorizado;

    @Column(length = 180)
    private String documentoReferencia;

    @Column(length = 500)
    private String linkConsulta;

    @Column(length = 500)
    private String observacao;

    @Column(nullable = false)
    private Boolean ativa = true;

    @Column(nullable = false)
    private LocalDateTime criadaEm;

    private LocalDateTime encerradaEm;
}
