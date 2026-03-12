package com.frota.checklist.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record RegistrarVeiculoEmViagemRequest(
        @NotNull Long motoristaId,
        @NotBlankTrimmed @Size(max = 180) String localDestino,
        @NotNull LocalDateTime dataHoraSaida,
        @Size(max = 700) String observacao
) {
}
