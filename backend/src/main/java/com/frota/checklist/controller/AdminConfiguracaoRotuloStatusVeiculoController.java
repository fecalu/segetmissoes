package com.frota.checklist.controller;

import com.frota.checklist.dto.RotuloStatusVeiculoResponse;
import com.frota.checklist.dto.SalvarRotulosStatusVeiculoRequest;
import com.frota.checklist.security.CustomUserDetails;
import com.frota.checklist.service.ConfiguracaoRotuloStatusVeiculoService;
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
@RequestMapping("/api/admin/configuracoes/rotulos-status-veiculo")
@RequiredArgsConstructor
public class AdminConfiguracaoRotuloStatusVeiculoController {

    private final ConfiguracaoRotuloStatusVeiculoService configuracaoService;

    @GetMapping
    public ResponseEntity<List<RotuloStatusVeiculoResponse>> listar() {
        return ResponseEntity.ok(configuracaoService.listar());
    }

    @PutMapping
    public ResponseEntity<List<RotuloStatusVeiculoResponse>> salvar(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SalvarRotulosStatusVeiculoRequest request
    ) {
        return ResponseEntity.ok(configuracaoService.salvar(userDetails.getMotoristaId(), request.rotulos()));
    }
}
