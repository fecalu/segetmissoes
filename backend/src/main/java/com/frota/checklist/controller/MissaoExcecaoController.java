package com.frota.checklist.controller;

import com.frota.checklist.dto.IniciarMissaoExcecaoRequest;
import com.frota.checklist.dto.MissaoExcecaoResponse;
import com.frota.checklist.dto.FinalizarMissaoSemChecklistRequest;
import com.frota.checklist.security.CustomUserDetails;
import com.frota.checklist.service.MissaoExcecaoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/missoes/excecoes")
@RequiredArgsConstructor
public class MissaoExcecaoController {

    private final MissaoExcecaoService missaoExcecaoService;

    @PostMapping
    public ResponseEntity<MissaoExcecaoResponse> iniciarSemChecklist(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody IniciarMissaoExcecaoRequest request,
            HttpServletRequest httpRequest
    ) {
        MissaoExcecaoResponse response = missaoExcecaoService.iniciarSemChecklist(
                userDetails.getMotoristaId(),
                request,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/finalizar-sem-checklist")
    public ResponseEntity<MissaoExcecaoResponse> finalizarSemChecklist(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody FinalizarMissaoSemChecklistRequest request
    ) {
        MissaoExcecaoResponse response = missaoExcecaoService.finalizarSemChecklist(
                userDetails.getMotoristaId(),
                request
        );
        return ResponseEntity.ok(response);
    }
}
