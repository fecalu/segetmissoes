package com.frota.checklist.dto;

import com.frota.checklist.entity.StatusVeiculo;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record RegistrarRetornoAdministrativoMissaoRequest(
        @NotNull LocalDateTime dataHoraFim,
        StatusVeiculo statusAdministrativoDestino
) {
}
