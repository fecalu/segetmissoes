package com.frota.checklist.service;

import com.frota.checklist.dto.VistoriaCompletaResponse;
import com.frota.checklist.entity.VistoriaCompleta;
import org.springframework.stereotype.Component;

@Component
public class VistoriaCompletaResponseMapper {

    public VistoriaCompletaResponse toResponse(VistoriaCompleta vistoria) {
        return new VistoriaCompletaResponse(
                vistoria.getId(),
                vistoria.getDataHora(),
                vistoria.getTipoOperacao(),
                vistoria.getQuilometragem(),
                vistoria.getLocalizacao(),
                vistoria.getObservacaoGeral(),
                vistoria.getNomeContraparte(),
                vistoria.getResultado(),
                vistoria.getMotorista().getId(),
                vistoria.getMotorista().getNome(),
                vistoria.getVeiculo().getId(),
                vistoria.getVeiculo().getPlaca(),
                vistoria.getVeiculo().getMarca(),
                vistoria.getVeiculo().getModelo(),
                vistoria.getItens().stream()
                        .map(item -> new VistoriaCompletaResponse.ItemResponse(
                                item.getId(),
                                item.getTipoItem(),
                                item.getStatus(),
                                item.getObservacao()
                        ))
                        .toList(),
                vistoria.getFotos().stream()
                        .map(foto -> new VistoriaCompletaResponse.FotoResponse(
                                foto.getId(),
                                foto.getTipoFoto(),
                                foto.getCaminhoArquivo()
                        ))
                        .toList(),
                vistoria.getAvarias().stream()
                        .map(avaria -> new VistoriaCompletaResponse.AvariaResponse(
                                avaria.getId(),
                                avaria.getLocal(),
                                avaria.getTipoAvaria(),
                                avaria.getDescricao(),
                                avaria.isJaExistia(),
                                avaria.getCaminhoArquivoFoto()
                        ))
                        .toList()
        );
    }
}
