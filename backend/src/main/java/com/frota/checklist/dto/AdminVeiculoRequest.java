package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AdminVeiculoRequest(
        @NotBlank @Pattern(regexp = "^[A-Za-z0-9-]{7,8}$", message = "Placa invalida") String placa,
        @NotBlank String modelo,
        @Size(max = 120) String marca,
        @Size(max = 18) String cnpj,
        @Size(max = 20) String renavam
) {
}
