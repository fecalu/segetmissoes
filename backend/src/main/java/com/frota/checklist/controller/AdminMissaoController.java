package com.frota.checklist.controller;

import com.frota.checklist.dto.AuditoriaMissaoResponse;
import com.frota.checklist.dto.AjustarHorarioMissaoAdminRequest;
import com.frota.checklist.dto.AtualizarDadosAdministrativosMissaoRequest;
import com.frota.checklist.dto.CriarMissaoContingenciaAdminRequest;
import com.frota.checklist.dto.EditarMissaoManualAdminRequest;
import com.frota.checklist.dto.EncerrarMissaoPendenteAdminRequest;
import com.frota.checklist.dto.MissaoResponse;
import com.frota.checklist.entity.OrigemAberturaMissao;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
            @RequestParam(required = false) OrigemAberturaMissao origemAbertura,
            @RequestParam(required = false) StatusDocumentalMissao statusDocumental,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @RequestParam(required = false) String busca
    ) {
        return ResponseEntity.ok(adminMissaoService.listar(
                motoristaId,
                veiculoId,
                status,
                origemAbertura,
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

    @PostMapping("/contingencias")
    public ResponseEntity<MissaoResponse> criarContingencia(
            @Valid @RequestBody CriarMissaoContingenciaAdminRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        MissaoResponse response = adminMissaoService.criarContingencia(
                userDetails.getMotoristaId(),
                request.motoristaId(),
                request.veiculoId(),
                request.dataHoraInicio(),
                request.motivoContingencia(),
                request.justificativaAbertura(),
                request.localDestino(),
                request.setorSolicitante(),
                request.solicitanteNome()
        );
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/encerrar-pendente")
    public ResponseEntity<MissaoResponse> encerrarPendente(
            @PathVariable Long id,
            @Valid @RequestBody EncerrarMissaoPendenteAdminRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        MissaoResponse response = adminMissaoService.encerrarPendente(
                id,
                userDetails.getMotoristaId(),
                request.dataHoraFim(),
                request.justificativaEncerramento()
        );
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/horario")
    public ResponseEntity<MissaoResponse> ajustarHorario(
            @PathVariable Long id,
            @Valid @RequestBody AjustarHorarioMissaoAdminRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        MissaoResponse response = adminMissaoService.ajustarHorario(
                id,
                userDetails.getMotoristaId(),
                request.dataHoraInicio(),
                request.dataHoraFim(),
                request.justificativa()
        );
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/edicao-manual")
    public ResponseEntity<MissaoResponse> editarMissaoManual(
            @PathVariable Long id,
            @Valid @RequestBody EditarMissaoManualAdminRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        MissaoResponse response = adminMissaoService.editarMissaoManual(
                id,
                userDetails.getMotoristaId(),
                request.motoristaId(),
                request.veiculoId(),
                request.dataHoraInicio(),
                request.dataHoraFim(),
                request.justificativaAbertura(),
                request.justificativaEncerramento(),
                request.localDestino(),
                request.setorSolicitante(),
                request.solicitanteNome(),
                request.justificativaEdicao()
        );
        return ResponseEntity.ok(response);
    }
}
