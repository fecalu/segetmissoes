package com.frota.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;


public record CriarAlocacaoVeiculoRequest(
        @NotBlank @Size(max = 10) String placa,
        @NotBlank @Size(max = 180) String modelo,
        @Size(max = 120) String marca,
        @NotBlank @Size(max = 160) String responsavelNome,
        @NotBlank @Size(max = 160) String secretariaOrgao,
        @NotBlank @Size(max = 160) String setor,
        @NotBlank @Size(max = 60) String limiteAutorizado,
        @Size(max = 180) String documentoReferencia,
        @Size(max = 500) String linkConsulta,
        @Size(max = 500) String observacao
) {
}
