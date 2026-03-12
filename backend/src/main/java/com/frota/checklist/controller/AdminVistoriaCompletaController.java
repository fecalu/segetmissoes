package com.frota.checklist.controller;

import com.frota.checklist.dto.AtualizarContraparteVistoriaCompletaRequest;
import com.frota.checklist.dto.VistoriaCompletaResponse;
import com.frota.checklist.entity.ResultadoVistoriaCompleta;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.service.AdminVistoriaCompletaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/vistorias-completas")
@RequiredArgsConstructor
public class AdminVistoriaCompletaController {

    private final AdminVistoriaCompletaService adminVistoriaCompletaService;

    @GetMapping
    public ResponseEntity<List<VistoriaCompletaResponse>> listar(
            @RequestParam(required = false) Long motoristaId,
            @RequestParam(required = false) Long veiculoId,
            @RequestParam(required = false) TipoOperacao tipoOperacao,
            @RequestParam(required = false) ResultadoVistoriaCompleta resultado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @RequestParam(required = false) String busca
    ) {
        return ResponseEntity.ok(adminVistoriaCompletaService.listar(
                motoristaId,
                veiculoId,
                tipoOperacao,
                resultado,
                dataInicio,
                dataFim,
                busca
        ));
    }

    @PatchMapping("/{vistoriaId}/contraparte")
    public ResponseEntity<VistoriaCompletaResponse> atualizarContraparte(
            @PathVariable Long vistoriaId,
            @RequestBody @Valid AtualizarContraparteVistoriaCompletaRequest request
    ) {
        return ResponseEntity.ok(adminVistoriaCompletaService.atualizarContraparte(
                vistoriaId,
                request.nomeContraparte()
        ));
    }
}
