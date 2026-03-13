package com.frota.checklist.entity;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "vistorias_completas")
public class VistoriaCompleta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime dataHora;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoOperacao tipoOperacao;

    @Column(nullable = false)
    private Long quilometragem;

    @Column(length = 120)
    private String localizacao;

    @Column(length = 700)
    private String observacaoGeral;

    @Column(length = 180)
    private String nomeContraparte;

    @Enumerated(EnumType.STRING)
    @Column(length = 24)
    private TipoUsoExternoVeiculo tipoUsoExterno;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ResultadoVistoriaCompleta resultado;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "motorista_id", nullable = false)
    private Motorista motorista;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "veiculo_id", nullable = false)
    private Veiculo veiculo;

    @OneToMany(mappedBy = "vistoria", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VistoriaCompletaItem> itens = new ArrayList<>();

    @OneToMany(mappedBy = "vistoria", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VistoriaCompletaFoto> fotos = new ArrayList<>();

    @OneToMany(mappedBy = "vistoria", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VistoriaCompletaAvaria> avarias = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (dataHora == null) {
            dataHora = LocalDateTime.now();
        }
    }
}
