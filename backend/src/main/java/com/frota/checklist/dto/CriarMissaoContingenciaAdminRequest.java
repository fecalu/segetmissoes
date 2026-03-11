package com.frota.checklist.dto;

import com.frota.checklist.entity.MotivoExcecaoMissao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record CriarMissaoContingenciaAdminRequest(
        @NotNull Long motoristaId,
        @NotNull Long veiculoId,
        @NotNull LocalDateTime dataHoraInicio,
        MotivoExcecaoMissao motivoContingencia,
        @NotBlank @Size(min = 10, max = 700) String justificativaAbertura,
        @Size(max = 180) String localDestino,
        @Size(max = 160) String setorSolicitante,
        @Size(max = 160) String solicitanteNome
) {
}
