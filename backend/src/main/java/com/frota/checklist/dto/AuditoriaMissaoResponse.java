package com.frota.checklist.dto;

import com.frota.checklist.entity.AcaoAuditoriaMissao;
import com.frota.checklist.entity.StatusMissao;

import java.time.LocalDateTime;

public record AuditoriaMissaoResponse(
        Long id,
        Long missaoId,
        AcaoAuditoriaMissao acao,
        StatusMissao statusAnterior,
        StatusMissao statusNovo,
        Long usuarioAcaoId,
        String usuarioAcaoNome,
        LocalDateTime dataHora,
        String detalhe,
        String campoAlterado,
        String valorAnterior,
        String valorNovo
) {
}
