package com.frota.checklist.controller;

import com.frota.checklist.dto.AuditoriaMissaoResponse;
import com.frota.checklist.dto.AtualizarDadosAdministrativosMissaoRequest;
import com.frota.checklist.dto.MissaoResponse;
import com.frota.checklist.entity.StatusDocumentalMissao;
import com.frota.checklist.entity.StatusMissao;
import com.frota.checklist.security.CustomUserDetails;
import com.frota.checklist.service.AdminMissaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/missoes")
@RequiredArgsConstructor
public class AdminMissaoController {

    private final AdminMissaoService adminMissaoService;

    @GetMapping
    public ResponseEntity<List<MissaoResponse>> listar(
            @RequestParam(required = false) Long motoristaId,
            @RequestParam(required = false) Long veiculoId,
            @RequestParam(required = false) StatusMissao status,
            @RequestParam(required = false) StatusDocumentalMissao statusDocumental,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @RequestParam(required = false) String busca
    ) {
        return ResponseEntity.ok(adminMissaoService.listar(
                motoristaId,
                veiculoId,
                status,
                statusDocumental,
                dataInicio,
                dataFim,
                busca
        ));
    }

    @GetMapping("/{id}/auditoria")
    public ResponseEntity<List<AuditoriaMissaoResponse>> listarAuditoria(@PathVariable Long id) {
        return ResponseEntity.ok(adminMissaoService.listarAuditoria(id));
    }

    @PutMapping("/{id}/dados-administrativos")
    public ResponseEntity<MissaoResponse> atualizarDadosAdministrativos(
            @PathVariable Long id,
            @Valid @RequestBody AtualizarDadosAdministrativosMissaoRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        MissaoResponse response = adminMissaoService.atualizarDadosAdministrativos(
                id,
                userDetails.getMotoristaId(),
                request.localDestino(),
                request.setorSolicitante(),
                request.solicitanteNome()
        );
        return ResponseEntity.ok(response);
    }
}
