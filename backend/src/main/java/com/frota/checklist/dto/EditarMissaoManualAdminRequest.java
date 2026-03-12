package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record EditarMissaoManualAdminRequest(
        @NotNull Long motoristaId,
        @NotNull Long veiculoId,
        @NotNull LocalDateTime dataHoraInicio,
        LocalDateTime dataHoraFim,
        @NotBlank @Size(min = 10, max = 700) String justificativaAbertura,
        @Size(max = 700) String justificativaEncerramento,
        @Size(max = 180) String localDestino,
        @Size(max = 160) String setorSolicitante,
        @Size(max = 160) String solicitanteNome,
        @NotBlank @Size(min = 10, max = 700) String justificativaEdicao
) {
}
