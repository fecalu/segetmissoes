package com.frota.checklist.dto;

import com.frota.checklist.entity.Perfil;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminMotoristaRequest(
        @NotBlank String nome,
        @NotBlank String login,
        String cpf,
        @Size(min = 6, max = 100) String senha,
        @NotNull Perfil perfil
) {
}
