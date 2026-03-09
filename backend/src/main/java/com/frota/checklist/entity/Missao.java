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
        name = "missoes",
        indexes = {
                @Index(name = "idx_missao_status", columnList = "status"),
                @Index(name = "idx_missao_status_documental", columnList = "status_documental"),
                @Index(name = "idx_missao_motorista_status", columnList = "motorista_id,status"),
                @Index(name = "idx_missao_veiculo_status", columnList = "veiculo_id,status"),
                @Index(name = "idx_missao_data_inicio", columnList = "data_hora_inicio")
        }
)
public class Missao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "motorista_id", nullable = false)
    private Motorista motorista;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "veiculo_id", nullable = false)
    private Veiculo veiculo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusMissao status;

    @Column(name = "data_hora_inicio", nullable = false)
    private LocalDateTime dataHoraInicio;

    @Column(name = "data_hora_fim")
    private LocalDateTime dataHoraFim;

    @Enumerated(EnumType.STRING)
    @Column(name = "origem_abertura", nullable = false, length = 30)
    private OrigemAberturaMissao origemAbertura;

    @Enumerated(EnumType.STRING)
    @Column(name = "origem_encerramento", length = 30)
    private OrigemEncerramentoMissao origemEncerramento;

    @Column(name = "checklist_saida_id")
    private Long checklistSaidaId;

    @Column(name = "checklist_chegada_id")
    private Long checklistChegadaId;

    @Column(name = "missao_excecao_id")
    private Long missaoExcecaoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "administrador_encerramento_id")
    private Motorista administradorEncerramento;

    @Column(name = "local_destino", length = 180)
    private String localDestino;

    @Column(name = "setor_solicitante", length = 160)
    private String setorSolicitante;

    @Column(name = "solicitante_nome", length = 160)
    private String solicitanteNome;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_documental", length = 40)
    private StatusDocumentalMissao statusDocumental;

    @PrePersist
    public void prePersist() {
        if (status == null) {
            status = StatusMissao.ATIVA;
        }
        if (dataHoraInicio == null) {
            dataHoraInicio = LocalDateTime.now();
        }
        if (statusDocumental == null) {
            statusDocumental = StatusDocumentalMissao.PENDENTE_DADOS_ADMIN;
        }
    }

    public void atualizarStatusDocumental() {
        if (possuiDadosAdministrativosCompletos()) {
            statusDocumental = StatusDocumentalMissao.DADOS_ADMIN_COMPLETOS;
            return;
        }
        statusDocumental = StatusDocumentalMissao.PENDENTE_DADOS_ADMIN;
    }

    public boolean possuiDadosAdministrativosCompletos() {
        return isFilled(localDestino) && isFilled(setorSolicitante) && isFilled(solicitanteNome);
    }

    private boolean isFilled(String valor) {
        return valor != null && !valor.isBlank();
    }
}
