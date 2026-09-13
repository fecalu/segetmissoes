package com.frota.checklist.controller;

import com.frota.checklist.dto.AtualizarVagaAdministrativaRequest;
import com.frota.checklist.dto.CriarVagaAdministrativaRequest;
import com.frota.checklist.dto.VagaAdministrativaResponse;
import com.frota.checklist.service.AdminVagaAdministrativaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/alocacoes/vagas")
@RequiredArgsConstructor
public class AdminVagaAdministrativaController {

    private final AdminVagaAdministrativaService vagaService;

    @GetMapping
    public ResponseEntity<List<VagaAdministrativaResponse>> listar(
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) Boolean incluirDesativadas
    ) {
        return ResponseEntity.ok(vagaService.listar(busca, incluirDesativadas));
    }

    @PostMapping
    public ResponseEntity<VagaAdministrativaResponse> criar(@Valid @RequestBody CriarVagaAdministrativaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(vagaService.criar(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VagaAdministrativaResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody AtualizarVagaAdministrativaRequest request
    ) {
        return ResponseEntity.ok(vagaService.atualizar(id, request));
    }

    @PatchMapping("/{id}/desativar")
    public ResponseEntity<VagaAdministrativaResponse> desativar(@PathVariable Long id) {
        return ResponseEntity.ok(vagaService.desativar(id));
    }

    @PatchMapping("/{id}/reativar")
    public ResponseEntity<VagaAdministrativaResponse> reativar(@PathVariable Long id) {
        return ResponseEntity.ok(vagaService.reativar(id));
    }
}
