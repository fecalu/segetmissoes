package com.frota.checklist.dto;

import com.frota.checklist.entity.ResultadoVistoriaCompleta;
import com.frota.checklist.entity.StatusItemVistoriaCompleta;
import com.frota.checklist.entity.TipoAvariaVistoriaCompleta;
import com.frota.checklist.entity.TipoItemObrigatorioVistoriaCompleta;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.TipoUsoExternoVeiculo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CriarVistoriaCompletaRequest(
        @NotNull Long veiculoId,
        @NotNull TipoOperacao tipoOperacao,
        @NotNull @Min(0) Long quilometragem,
        @Size(max = 120) String localizacao,
        @Size(max = 700) String observacaoGeral,
        @NotBlankTrimmed @Size(max = 180) String nomeContraparte,
        @NotNull TipoUsoExternoVeiculo tipoUsoExterno,
        Boolean encerrarMissaoAtivaVeiculo,
        @NotNull ResultadoVistoriaCompleta resultado,
        @NotEmpty List<@Valid ItemRequest> itens,
        List<@Valid AvariaRequest> avarias
) {
    public record ItemRequest(
            @NotNull TipoItemObrigatorioVistoriaCompleta tipoItem,
            @NotNull StatusItemVistoriaCompleta status,
            @Size(max = 500) String observacao
    ) {}

    public record AvariaRequest(
            @NotBlankTrimmed @Size(max = 120) String local,
            @NotNull TipoAvariaVistoriaCompleta tipoAvaria,
            @Size(max = 500) String descricao,
            boolean jaExistia
    ) {}
}
