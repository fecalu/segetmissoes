package com.frota.checklist.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record AjustarHorarioMissaoAdminRequest(
        @NotNull LocalDateTime dataHoraInicio,
        LocalDateTime dataHoraFim
) {
}
