package com.frota.checklist.dto;

import com.frota.checklist.entity.TipoUsoExternoVeiculo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record RegistrarVeiculoEmUsoExternoRequest(
        @NotBlank(message = "Informe para quem o veiculo foi entregue")
        @Size(max = 180, message = "O nome de quem recebeu o veiculo deve ter no maximo 180 caracteres")
        String nomeEntreguePara,

        @NotNull(message = "Informe o tipo do uso externo")
        TipoUsoExternoVeiculo tipoUsoExterno,

        @NotNull(message = "Informe a data e hora da saida")
        LocalDateTime dataHoraSaida,

        @Size(max = 700, message = "A observacao deve ter no maximo 700 caracteres")
        String observacao,

        @NotBlank(message = "Informe a justificativa por nao haver vistoria")
        @Size(min = 10, max = 700, message = "A justificativa deve ter entre 10 e 700 caracteres")
        String justificativaSemVistoria
) {
}
