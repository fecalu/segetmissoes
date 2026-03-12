package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record RegistrarVeiculoEmUsoExternoRequest(
        @NotBlank(message = "Informe para quem o veiculo foi entregue")
        @Size(max = 180, message = "O nome de quem recebeu o veiculo deve ter no maximo 180 caracteres")
        String nomeEntreguePara,

        @NotNull(message = "Informe a data e hora da saida")
        LocalDateTime dataHoraSaida,

        @Size(max = 700, message = "A observacao deve ter no maximo 700 caracteres")
        String observacao
) {
}
