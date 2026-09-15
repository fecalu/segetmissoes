package com.frota.checklist.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SalvarLocaisOperacionaisRequest(
        @NotNull List<@Valid LocalOperacionalRequest> locais
) {
}
