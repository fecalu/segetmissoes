package com.frota.checklist.dto;

import com.frota.checklist.entity.TipoFoto;

public record FotoResponse(
        Long id,
        TipoFoto tipoFoto,
        String caminhoArquivo
) {
}
