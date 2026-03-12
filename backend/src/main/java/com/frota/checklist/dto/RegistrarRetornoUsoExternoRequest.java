package com.frota.checklist.dto;

import com.frota.checklist.entity.StatusVeiculo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record RegistrarRetornoUsoExternoRequest(
        StatusVeiculo statusAdministrativoDestino,

        @NotBlank(message = "Informe de quem o veiculo foi recebido")
        @Size(max = 180, message = "O nome de quem devolveu o veiculo deve ter no maximo 180 caracteres")
        String nomeRecebidoDe,

        @NotNull(message = "Informe a data e hora do retorno")
        LocalDateTime dataHoraRetorno,

        @Size(max = 700, message = "A observacao deve ter no maximo 700 caracteres")
        String observacao
) {
}
