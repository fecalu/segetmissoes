package com.frota.checklist.controller;

import com.frota.checklist.service.RelatorioChecklistPdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/admin/relatorios/checklists")
@RequiredArgsConstructor
public class AdminRelatorioController {

    private static final DateTimeFormatter FILE_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final RelatorioChecklistPdfService relatorioChecklistPdfService;

    @GetMapping(value = "/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> gerarRelatorioPdf(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicial,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFinal
    ) {
        byte[] arquivo = relatorioChecklistPdfService.gerar(dataInicial, dataFinal);

        String nomeArquivo = String.format(
                "relatorio-checklists-%s-%s.pdf",
                dataInicial.format(FILE_DATE_FORMATTER),
                dataFinal.format(FILE_DATE_FORMATTER)
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nomeArquivo + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(arquivo);
    }
}
