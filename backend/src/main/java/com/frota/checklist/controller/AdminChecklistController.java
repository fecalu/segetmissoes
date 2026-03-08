package com.frota.checklist.controller;

import com.frota.checklist.dto.ChecklistResponse;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.service.AdminChecklistService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/checklists")
@RequiredArgsConstructor
public class AdminChecklistController {

    private final AdminChecklistService adminChecklistService;

    @GetMapping
    public ResponseEntity<List<ChecklistResponse>> listar(
            @RequestParam(required = false) Long motoristaId,
            @RequestParam(required = false) Long veiculoId,
            @RequestParam(required = false) TipoOperacao tipoOperacao,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @RequestParam(required = false) String busca
    ) {
        return ResponseEntity.ok(adminChecklistService.listar(
                motoristaId, veiculoId, tipoOperacao, dataInicio, dataFim, busca
        ));
    }
}
