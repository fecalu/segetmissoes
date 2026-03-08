package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String login,
        @NotBlank String senha
) {
}
