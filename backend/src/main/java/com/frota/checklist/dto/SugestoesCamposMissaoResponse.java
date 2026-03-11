package com.frota.checklist.dto;

import java.util.List;

public record SugestoesCamposMissaoResponse(
        List<String> destinos,
        List<String> setoresSolicitantes,
        List<String> solicitantes,
        List<String> justificativasRegistroManual
) {
}
