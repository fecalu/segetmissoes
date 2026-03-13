package com.frota.checklist.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record RegistrarRetornoViagemRequest(
        @NotNull LocalDateTime dataHoraRetorno,
        @Size(max = 700) String observacao,
        @NotBlankTrimmed @Size(min = 10, max = 700) String justificativaSemChecklist
) {
}
