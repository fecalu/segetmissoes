package com.frota.checklist.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

public record SalvarSugestoesCamposMissaoRequest(
        List<@Size(max = 180) String> destinos,
        List<@Size(max = 160) String> setoresSolicitantes,
        List<@Size(max = 160) String> solicitantes,
        List<@Size(max = 700) String> justificativasRegistroManual
) {
}
