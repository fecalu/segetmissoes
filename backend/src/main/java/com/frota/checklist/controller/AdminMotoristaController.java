package com.frota.checklist.controller;

import com.frota.checklist.dto.AdminMotoristaRequest;
import com.frota.checklist.dto.MotoristaResponse;
import com.frota.checklist.service.AdminMotoristaService;
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
@RequestMapping("/api/admin/motoristas")
@RequiredArgsConstructor
public class AdminMotoristaController {

    private final AdminMotoristaService adminMotoristaService;

    @GetMapping
    public ResponseEntity<List<MotoristaResponse>> listar(@RequestParam(required = false) String busca) {
        return ResponseEntity.ok(adminMotoristaService.listar(busca));
    }

    @PostMapping
    public ResponseEntity<MotoristaResponse> criar(@Valid @RequestBody AdminMotoristaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminMotoristaService.criar(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MotoristaResponse> editar(@PathVariable Long id, @Valid @RequestBody AdminMotoristaRequest request) {
        return ResponseEntity.ok(adminMotoristaService.editar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        adminMotoristaService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
