package com.frota.checklist.dto;

import com.frota.checklist.entity.ResultadoVistoriaCompleta;
import com.frota.checklist.entity.StatusItemVistoriaCompleta;
import com.frota.checklist.entity.TipoAvariaVistoriaCompleta;
import com.frota.checklist.entity.TipoFotoVistoriaCompleta;
import com.frota.checklist.entity.TipoItemObrigatorioVistoriaCompleta;
import com.frota.checklist.entity.TipoOperacao;

import java.time.LocalDateTime;
import java.util.List;

public record VistoriaCompletaResponse(
        Long id,
        LocalDateTime dataHora,
        TipoOperacao tipoOperacao,
        Long quilometragem,
        String localizacao,
        String observacaoGeral,
        String nomeContraparte,
        ResultadoVistoriaCompleta resultado,
        Long motoristaId,
        String motoristaNome,
        Long veiculoId,
        String veiculoPlaca,
        String veiculoMarca,
        String veiculoModelo,
        List<ItemResponse> itens,
        List<FotoResponse> fotos,
        List<AvariaResponse> avarias
) {
    public record ItemResponse(
            Long id,
            TipoItemObrigatorioVistoriaCompleta tipoItem,
            StatusItemVistoriaCompleta status,
            String observacao
    ) {}

    public record FotoResponse(
            Long id,
            TipoFotoVistoriaCompleta tipoFoto,
            String caminhoArquivo
    ) {}

    public record AvariaResponse(
            Long id,
            String local,
            TipoAvariaVistoriaCompleta tipoAvaria,
            String descricao,
            boolean jaExistia,
            String caminhoArquivoFoto
    ) {}
}
