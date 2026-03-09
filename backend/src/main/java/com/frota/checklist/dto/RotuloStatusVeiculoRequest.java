package com.frota.checklist.dto;

import com.frota.checklist.entity.StatusVeiculo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RotuloStatusVeiculoRequest(
        @NotNull StatusVeiculo status,
        @NotBlank @Size(max = 80) String rotulo
) {
}
