package com.frota.checklist.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria_administrativa")
@Getter
@Setter
public class AuditoriaAdministrativa {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long autorId;
    @Column(nullable = false) private String autorNome;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Perfil autorPerfil;
    @Column(nullable = false, length = 60) private String entidade;
    private Long registroId;
    @Column(nullable = false, length = 100) private String acao;
    @Column(length = 80) private String campo;
    @Column(length = 2000) private String valorAnterior;
    @Column(length = 2000) private String valorNovo;
    @Column(length = 700) private String justificativa;
    @Column(nullable = false) private LocalDateTime dataHora = LocalDateTime.now();
}
