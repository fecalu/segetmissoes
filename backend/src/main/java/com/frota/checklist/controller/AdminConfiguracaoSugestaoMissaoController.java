package com.frota.checklist.controller;

import com.frota.checklist.dto.SalvarSugestoesCamposMissaoRequest;
import com.frota.checklist.dto.SugestoesCamposMissaoResponse;
import com.frota.checklist.security.CustomUserDetails;
import com.frota.checklist.service.ConfiguracaoSugestaoMissaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/configuracoes/sugestoes-missao")
@RequiredArgsConstructor
public class AdminConfiguracaoSugestaoMissaoController {

    private final ConfiguracaoSugestaoMissaoService configuracaoService;

    @GetMapping
    public ResponseEntity<SugestoesCamposMissaoResponse> listar() {
        return ResponseEntity.ok(configuracaoService.listar());
    }

    @PutMapping
    public ResponseEntity<SugestoesCamposMissaoResponse> salvar(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SalvarSugestoesCamposMissaoRequest request
    ) {
        return ResponseEntity.ok(configuracaoService.salvar(
                userDetails.getMotoristaId(),
                request.destinos(),
                request.setoresSolicitantes(),
                request.solicitantes(),
                request.justificativasRegistroManual()
        ));
    }
}
