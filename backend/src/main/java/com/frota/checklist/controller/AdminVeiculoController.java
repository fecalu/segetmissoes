package com.frota.checklist.controller;

import com.frota.checklist.dto.AdminVeiculoRequest;
import com.frota.checklist.dto.VeiculoResponse;
import com.frota.checklist.service.AdminVeiculoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/veiculos")
@RequiredArgsConstructor
public class AdminVeiculoController {

    private final AdminVeiculoService adminVeiculoService;

    @GetMapping
    public ResponseEntity<List<VeiculoResponse>> listar(@RequestParam(required = false) String buscaPlaca) {
        return ResponseEntity.ok(adminVeiculoService.listar(buscaPlaca));
    }

    @PostMapping
    public ResponseEntity<VeiculoResponse> criar(@Valid @RequestBody AdminVeiculoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminVeiculoService.criar(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VeiculoResponse> editar(@PathVariable Long id, @Valid @RequestBody AdminVeiculoRequest request) {
        return ResponseEntity.ok(adminVeiculoService.editar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        adminVeiculoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
