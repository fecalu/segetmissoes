package com.frota.checklist.controller;

import com.frota.checklist.dto.AdminVeiculoRequest;
import com.frota.checklist.dto.AtualizarStatusAdministrativoRequest;
import com.frota.checklist.dto.ExclusaoDefinitivaVeiculoRequest;
import com.frota.checklist.dto.HistoricoVeiculoResponse;
import com.frota.checklist.dto.HistoricoStatusVeiculoResponse;
import com.frota.checklist.dto.RegistrarVeiculoEmViagemRequest;
import com.frota.checklist.dto.VeiculoResponse;
import com.frota.checklist.security.CustomUserDetails;
import com.frota.checklist.service.AdminHistoricoVeiculoService;
import com.frota.checklist.service.AdminVeiculoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/admin/veiculos")
@RequiredArgsConstructor
public class AdminVeiculoController {

    private final AdminVeiculoService adminVeiculoService;
    private final AdminHistoricoVeiculoService adminHistoricoVeiculoService;

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

    @PatchMapping("/{id}/status-administrativo")
    public ResponseEntity<VeiculoResponse> atualizarStatusAdministrativo(
            @PathVariable Long id,
            @RequestBody AtualizarStatusAdministrativoRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(adminVeiculoService.atualizarStatusAdministrativo(
                id,
                request.statusAdministrativo(),
                userDetails.getMotoristaId()
        ));
    }

    @PostMapping("/{id}/em-viagem")
    public ResponseEntity<VeiculoResponse> registrarEmViagem(
            @PathVariable Long id,
            @Valid @RequestBody RegistrarVeiculoEmViagemRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(adminVeiculoService.registrarEmViagem(id, request, userDetails.getMotoristaId()));
    }

    @PatchMapping("/{id}/desativar")
    public ResponseEntity<VeiculoResponse> desativar(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(adminVeiculoService.desativar(id, userDetails.getMotoristaId()));
    }

    @PatchMapping("/{id}/reativar")
    public ResponseEntity<VeiculoResponse> reativar(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(adminVeiculoService.reativar(id, userDetails.getMotoristaId()));
    }

    @GetMapping("/{id}/historico-status")
    public ResponseEntity<List<HistoricoStatusVeiculoResponse>> listarHistoricoStatus(@PathVariable Long id) {
        return ResponseEntity.ok(adminVeiculoService.listarHistoricoStatus(id));
    }

    @GetMapping("/{id}/historico")
    public ResponseEntity<HistoricoVeiculoResponse> buscarHistorico(@PathVariable Long id) {
        return ResponseEntity.ok(adminHistoricoVeiculoService.buscar(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        adminVeiculoService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/exclusao-definitiva")
    public ResponseEntity<Void> excluirDefinitivamente(
            @PathVariable Long id,
            @Valid @RequestBody ExclusaoDefinitivaVeiculoRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        adminVeiculoService.excluirDefinitivamente(
                id,
                userDetails.getMotoristaId(),
                request.senhaAdmin(),
                request.justificativa()
        );
        return ResponseEntity.noContent().build();
    }
}
