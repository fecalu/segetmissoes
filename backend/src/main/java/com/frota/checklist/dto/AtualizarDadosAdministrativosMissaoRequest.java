package com.frota.checklist.dto;

import jakarta.validation.constraints.Size;

public record AtualizarDadosAdministrativosMissaoRequest(
        @Size(max = 180) String localDestino,
        @Size(max = 160) String setorSolicitante,
        @Size(max = 160) String solicitanteNome
) {
}
