package com.frota.checklist.dto;

import com.frota.checklist.entity.Perfil;

public record MotoristaResponse(
        Long id,
        String nome,
        String login,
        String cpf,
        Perfil perfil
) {
}
