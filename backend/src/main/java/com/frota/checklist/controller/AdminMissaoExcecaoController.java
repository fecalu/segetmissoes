package com.frota.checklist.controller;

import com.frota.checklist.dto.EncerrarMissaoExcecaoRequest;
import com.frota.checklist.dto.MissaoExcecaoResponse;
import com.frota.checklist.entity.StatusExcecaoMissao;
import com.frota.checklist.security.CustomUserDetails;
import com.frota.checklist.service.MissaoExcecaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/missoes/excecoes")
@RequiredArgsConstructor
public class AdminMissaoExcecaoController {

    private final MissaoExcecaoService missaoExcecaoService;

    @GetMapping
    public ResponseEntity<List<MissaoExcecaoResponse>> listar(
            @RequestParam(required = false) StatusExcecaoMissao status,
            @RequestParam(required = false) Long motoristaId,
            @RequestParam(required = false) Long veiculoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @RequestParam(required = false) String busca
    ) {
        return ResponseEntity.ok(missaoExcecaoService.listarAdmin(
                status,
                motoristaId,
                veiculoId,
                dataInicio,
                dataFim,
                busca
        ));
    }

    @PatchMapping("/{id}/encerrar")
    public ResponseEntity<MissaoExcecaoResponse> encerrarAdministrativamente(
            @PathVariable Long id,
            @Valid @RequestBody EncerrarMissaoExcecaoRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(missaoExcecaoService.encerrarAdministrativamente(
                id,
                userDetails.getMotoristaId(),
                request.justificativaEncerramento()
        ));
    }
}
