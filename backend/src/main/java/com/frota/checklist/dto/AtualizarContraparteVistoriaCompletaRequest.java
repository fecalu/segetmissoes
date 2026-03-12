package com.frota.checklist.dto;

import jakarta.validation.constraints.Size;

public record AtualizarContraparteVistoriaCompletaRequest(
        @Size(max = 180) String nomeContraparte
) {
}
