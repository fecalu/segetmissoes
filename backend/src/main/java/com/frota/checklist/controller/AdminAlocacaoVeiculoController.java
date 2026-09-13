package com.frota.checklist.controller;

import com.frota.checklist.dto.AlocacaoVeiculoResponse;
import com.frota.checklist.dto.AtualizarDadosAlocacaoVeiculoRequest;
import com.frota.checklist.dto.CriarAlocacaoVeiculoRequest;
import com.frota.checklist.dto.HistoricoAlocacaoVeiculoResponse;
import com.frota.checklist.dto.TrocarResponsavelAlocacaoRequest;
import com.frota.checklist.dto.TrocarVeiculoAlocacaoRequest;
import com.frota.checklist.security.CustomUserDetails;
import com.frota.checklist.service.AdminAlocacaoVeiculoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
@RequestMapping("/api/admin/alocacoes")
@RequiredArgsConstructor
public class AdminAlocacaoVeiculoController {

    private final AdminAlocacaoVeiculoService alocacaoService;

    @GetMapping
    public ResponseEntity<List<AlocacaoVeiculoResponse>> listar(
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) Boolean incluirEncerradas
    ) {
        return ResponseEntity.ok(alocacaoService.listar(busca, incluirEncerradas));
    }

    @PostMapping
    public ResponseEntity<AlocacaoVeiculoResponse> criar(
            @Valid @RequestBody CriarAlocacaoVeiculoRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(alocacaoService.criar(request, userDetails.getMotoristaId()));
    }

    @PutMapping("/{id}/dados")
    public ResponseEntity<AlocacaoVeiculoResponse> atualizarDados(
            @PathVariable Long id,
            @Valid @RequestBody AtualizarDadosAlocacaoVeiculoRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(alocacaoService.atualizarDados(id, request, userDetails.getMotoristaId()));
    }

    @PatchMapping("/{id}/veiculo")
    public ResponseEntity<AlocacaoVeiculoResponse> trocarVeiculo(
            @PathVariable Long id,
            @Valid @RequestBody TrocarVeiculoAlocacaoRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(alocacaoService.trocarVeiculo(id, request, userDetails.getMotoristaId()));
    }

    @PatchMapping("/{id}/responsavel")
    public ResponseEntity<AlocacaoVeiculoResponse> trocarResponsavel(
            @PathVariable Long id,
            @Valid @RequestBody TrocarResponsavelAlocacaoRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(alocacaoService.trocarResponsavel(id, request, userDetails.getMotoristaId()));
    }

    @PatchMapping("/{id}/encerrar")
    public ResponseEntity<AlocacaoVeiculoResponse> encerrar(
            @PathVariable Long id,
            @RequestParam @NotBlank String motivo,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(alocacaoService.encerrar(id, motivo, userDetails.getMotoristaId()));
    }

    @GetMapping("/{id}/historico")
    public ResponseEntity<List<HistoricoAlocacaoVeiculoResponse>> historico(@PathVariable Long id) {
        return ResponseEntity.ok(alocacaoService.listarHistorico(id));
    }
}
