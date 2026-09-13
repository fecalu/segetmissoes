package com.frota.checklist.dto;

import com.frota.checklist.entity.TipoDeslocamentoMissao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record CriarRegistroAdministrativoMissaoRequest(
        @NotNull Long motoristaId,
        @NotNull Long veiculoId,
        @NotNull LocalDateTime dataHoraInicio,
        @NotNull TipoDeslocamentoMissao tipoDeslocamento,
        @NotBlank @Size(max = 180) String localDestino,
        @Size(max = 160) String setorSolicitante,
        @Size(max = 160) String solicitanteNome
) {
}
