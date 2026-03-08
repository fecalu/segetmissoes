package com.frota.checklist.controller;

import com.frota.checklist.dto.EstatisticasMissoesResponse;
import com.frota.checklist.service.EstatisticasMissoesService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/estatisticas/missoes")
@RequiredArgsConstructor
public class AdminEstatisticasController {

    private final EstatisticasMissoesService estatisticasMissoesService;

    @GetMapping
    public ResponseEntity<EstatisticasMissoesResponse> obter(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicial,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFinal
    ) {
        return ResponseEntity.ok(estatisticasMissoesService.gerar(dataInicial, dataFinal));
    }
}
