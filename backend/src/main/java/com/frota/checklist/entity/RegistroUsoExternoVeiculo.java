package com.frota.checklist.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
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
@Table(
        name = "registros_uso_externo_veiculo",
        indexes = {
                @Index(name = "idx_registro_uso_externo_veiculo", columnList = "veiculo_id"),
                @Index(name = "idx_registro_uso_externo_saida", columnList = "data_hora_saida"),
                @Index(name = "idx_registro_uso_externo_retorno", columnList = "data_hora_retorno")
        }
)
public class RegistroUsoExternoVeiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "veiculo_id", nullable = false)
    private Veiculo veiculo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "administrador_registro_id", nullable = false)
    private Motorista administradorRegistro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "administrador_encerramento_id")
    private Motorista administradorEncerramento;

    @Column(name = "nome_entregue_para", nullable = false, length = 180)
    private String nomeEntreguePara;

    @Column(name = "observacao_saida", length = 700)
    private String observacaoSaida;

    @Column(name = "data_hora_saida", nullable = false)
    private LocalDateTime dataHoraSaida;

    @Column(name = "nome_recebido_de", length = 180)
    private String nomeRecebidoDe;

    @Column(name = "observacao_retorno", length = 700)
    private String observacaoRetorno;

    @Column(name = "data_hora_retorno")
    private LocalDateTime dataHoraRetorno;

    @PrePersist
    public void prePersist() {
        if (dataHoraSaida == null) {
            dataHoraSaida = LocalDateTime.now();
        }
    }
}
