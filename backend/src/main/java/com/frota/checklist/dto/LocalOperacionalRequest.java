package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record LocalOperacionalRequest(
        Long id,
        @NotBlank @Size(max = 80) String nome,
        @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String cor,
        @NotNull Integer ordemExibicao,
        boolean ativo
) {
}
