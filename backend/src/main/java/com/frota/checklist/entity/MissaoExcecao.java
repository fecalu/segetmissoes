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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "missoes_excecao")
public class MissaoExcecao {

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
    @Column(nullable = false, length = 40)
    private MotivoExcecaoMissao motivo;

    @Column(length = 700)
    private String justificativa;

    @Column(nullable = false)
    private boolean aceiteResponsabilidade;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private StatusExcecaoMissao status;

    @Column(nullable = false)
    private LocalDateTime dataHoraAbertura;

    @Column(nullable = false)
    private LocalDateTime prazoRegularizacao;

    @Column
    private LocalDateTime dataHoraRegularizacao;

    @Column
    private Long checklistRegularizacaoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "administrador_encerramento_id")
    private Motorista administradorEncerramento;

    @Column(length = 700)
    private String justificativaEncerramentoAdmin;

    @Column(length = 80)
    private String ipOrigem;

    @Column(length = 300)
    private String dispositivo;

    @Column(length = 140)
    private String localizacao;

    @Column(nullable = false, columnDefinition = "boolean not null default false")
    private boolean somenteEncerramentoSemChecklist;

    public boolean isSomenteEventoEncerramentoSemChecklist() {
        if (somenteEncerramentoSemChecklist) {
            return true;
        }
        return dataHoraRegularizacao != null
                && dataHoraAbertura != null
                && !dataHoraRegularizacao.isAfter(dataHoraAbertura);
    }

    @PrePersist
    public void prePersist() {
        if (dataHoraAbertura == null) {
            dataHoraAbertura = LocalDateTime.now();
        }
        if (prazoRegularizacao == null) {
            prazoRegularizacao = dataHoraAbertura.plusHours(12);
        }
        if (status == null) {
            status = StatusExcecaoMissao.EXCECAO_ABERTA;
        }
    }
}
