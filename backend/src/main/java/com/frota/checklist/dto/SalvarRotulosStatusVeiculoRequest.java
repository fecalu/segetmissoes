package com.frota.checklist.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SalvarRotulosStatusVeiculoRequest(
        @NotEmpty List<@Valid RotuloStatusVeiculoRequest> rotulos
) {
}
