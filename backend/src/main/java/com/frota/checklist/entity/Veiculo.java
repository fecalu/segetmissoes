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
@Table(name = "veiculos")
public class Veiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String placa;

    @Column(nullable = false)
    private String modelo;

    @Column(nullable = false)
    private String marca;

    @Column(name = "desativado")
    private Boolean desativado = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    private StatusVeiculo statusAdministrativo;

    @Column(name = "data_hora_ultimo_encerramento_sem_checklist")
    private LocalDateTime dataHoraUltimoEncerramentoSemChecklist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "motorista_ultimo_encerramento_sem_checklist_id")
    private Motorista motoristaUltimoEncerramentoSemChecklist;
}
