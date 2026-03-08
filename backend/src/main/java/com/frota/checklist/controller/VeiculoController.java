package com.frota.checklist.controller;

import com.frota.checklist.dto.VeiculoResponse;
import com.frota.checklist.service.VeiculoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/veiculos")
@RequiredArgsConstructor
public class VeiculoController {

    private final VeiculoService veiculoService;

    @GetMapping
    public ResponseEntity<List<VeiculoResponse>> listar() {
        return ResponseEntity.ok(veiculoService.listar());
    }
}
