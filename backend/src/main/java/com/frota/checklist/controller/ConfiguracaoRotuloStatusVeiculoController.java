package com.frota.checklist.controller;

import com.frota.checklist.dto.RotuloStatusVeiculoResponse;
import com.frota.checklist.service.ConfiguracaoRotuloStatusVeiculoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/configuracoes/rotulos-status-veiculo")
@RequiredArgsConstructor
public class ConfiguracaoRotuloStatusVeiculoController {

    private final ConfiguracaoRotuloStatusVeiculoService configuracaoService;

    @GetMapping
    public ResponseEntity<List<RotuloStatusVeiculoResponse>> listar() {
        return ResponseEntity.ok(configuracaoService.listar());
    }
}
