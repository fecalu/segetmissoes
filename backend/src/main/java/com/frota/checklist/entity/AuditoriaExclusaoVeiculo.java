package com.frota.checklist.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "auditoria_exclusao_veiculo")
public class AuditoriaExclusaoVeiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "veiculo_id_original", nullable = false)
    private Long veiculoIdOriginal;

    @Column(nullable = false, length = 20)
    private String placa;

    @Column(nullable = false, length = 120)
    private String modelo;

    @Column(nullable = false, length = 120)
    private String marca;

    @Column(nullable = false)
    private Boolean desativado;

    @Column(name = "status_administrativo", length = 30)
    private String statusAdministrativo;

    @Column(name = "total_checklists", nullable = false)
    private Long totalChecklists;

    @Column(name = "data_primeiro_checklist")
    private LocalDateTime dataPrimeiroChecklist;

    @Column(name = "data_ultimo_checklist")
    private LocalDateTime dataUltimoChecklist;

    @Column(name = "total_excecoes", nullable = false)
    private Long totalExcecoes;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "administrador_id", nullable = false)
    private Motorista administrador;

    @Column(nullable = false, length = 700)
    private String justificativa;

    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora;

    @PrePersist
    public void prePersist() {
        if (dataHora == null) {
            dataHora = LocalDateTime.now();
        }
    }
}
