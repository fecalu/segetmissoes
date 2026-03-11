package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record EncerrarMissaoPendenteAdminRequest(
        @NotNull LocalDateTime dataHoraFim,
        @NotBlank @Size(min = 10, max = 700) String justificativaEncerramento
) {
}
