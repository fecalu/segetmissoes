package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterMotoristaRequest(
        @NotBlank String nome,
        @NotBlank String login,
        @NotBlank @Size(min = 6, max = 100) String senha,
        @NotBlank @Pattern(regexp = "\\d{11}", message = "CPF deve conter 11 digitos numericos") String cpf
) {
}
