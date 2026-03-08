package com.frota.checklist.dto;

import com.frota.checklist.entity.Perfil;

public record LoginResponse(
        String token,
        Long motoristaId,
        String nome,
        Perfil perfil
) {
}
