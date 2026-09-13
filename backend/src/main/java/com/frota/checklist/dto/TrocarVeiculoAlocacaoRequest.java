package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TrocarVeiculoAlocacaoRequest(
        @NotBlank @Size(max = 10) String placa,
        @NotBlank @Size(max = 180) String modelo,
        @Size(max = 120) String marca,
        @NotBlank @Size(max = 500) String motivo
) {
}
