package com.frota.checklist.controller;

import com.frota.checklist.dto.LocalOperacionalResponse;
import com.frota.checklist.dto.SalvarLocaisOperacionaisRequest;
import com.frota.checklist.security.CustomUserDetails;
import com.frota.checklist.service.ConfiguracaoLocalOperacionalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/configuracoes/locais-operacionais")
@RequiredArgsConstructor
public class AdminConfiguracaoLocalOperacionalController {

    private final ConfiguracaoLocalOperacionalService configuracaoService;

    @GetMapping
    public ResponseEntity<List<LocalOperacionalResponse>> listar() {
        return ResponseEntity.ok(configuracaoService.listar());
    }

    @PutMapping
    public ResponseEntity<List<LocalOperacionalResponse>> salvar(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SalvarLocaisOperacionaisRequest request
    ) {
        return ResponseEntity.ok(configuracaoService.salvar(userDetails.getMotoristaId(), request.locais()));
    }
}
