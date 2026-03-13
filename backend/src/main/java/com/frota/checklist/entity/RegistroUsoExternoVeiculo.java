package com.frota.checklist.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "administrador_registro_id")
    private Motorista administradorRegistro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "administrador_encerramento_id")
    private Motorista administradorEncerramento;

    @Column(name = "nome_entregue_para", nullable = false, length = 180)
    private String nomeEntreguePara;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_uso_externo", nullable = false, length = 24)
    private TipoUsoExternoVeiculo tipoUsoExterno;

    @Enumerated(EnumType.STRING)
    @Column(name = "origem_abertura", nullable = false, length = 24)
    private OrigemRegistroUsoExterno origemAbertura;

    @Column(name = "observacao_saida", length = 700)
    private String observacaoSaida;

    @Column(name = "justificativa_sem_vistoria_abertura", length = 700)
    private String justificativaSemVistoriaAbertura;

    @Column(name = "data_hora_saida", nullable = false)
    private LocalDateTime dataHoraSaida;

    @Column(name = "vistoria_saida_id")
    private Long vistoriaSaidaId;

    @Column(name = "nome_recebido_de", length = 180)
    private String nomeRecebidoDe;

    @Enumerated(EnumType.STRING)
    @Column(name = "origem_retorno", length = 24)
    private OrigemRegistroUsoExterno origemRetorno;

    @Column(name = "observacao_retorno", length = 700)
    private String observacaoRetorno;

    @Column(name = "justificativa_sem_vistoria_retorno", length = 700)
    private String justificativaSemVistoriaRetorno;

    @Column(name = "data_hora_retorno")
    private LocalDateTime dataHoraRetorno;

    @Column(name = "vistoria_chegada_id")
    private Long vistoriaChegadaId;

    @PrePersist
    public void prePersist() {
        if (dataHoraSaida == null) {
            dataHoraSaida = LocalDateTime.now();
        }
    }
}
