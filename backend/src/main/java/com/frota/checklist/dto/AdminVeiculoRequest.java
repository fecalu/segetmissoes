package com.frota.checklist.dto;

import com.frota.checklist.entity.StatusVeiculo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record AdminVeiculoRequest(
        @NotBlank @Pattern(regexp = "^[A-Za-z0-9-]{7,8}$", message = "Placa invalida") String placa,
        @NotBlank String modelo,
        @NotBlank String marca,
        @NotNull StatusVeiculo status
) {
}
