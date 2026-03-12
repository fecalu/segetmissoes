package com.frota.checklist.controller;

import com.frota.checklist.dto.ChecklistResponse;
import com.frota.checklist.entity.TipoDeslocamentoMissao;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.security.CustomUserDetails;
import com.frota.checklist.service.ChecklistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/checklists")
@RequiredArgsConstructor
public class ChecklistController {

    private final ChecklistService checklistService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ChecklistResponse> criar(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam Long veiculoId,
            @RequestParam TipoOperacao tipoOperacao,
            @RequestParam(defaultValue = "NA_CIDADE") TipoDeslocamentoMissao tipoDeslocamento,
            @RequestParam MultipartFile fotoPainel,
            @RequestParam MultipartFile fotoEstepe,
            @RequestParam MultipartFile fotoLateralEsq,
            @RequestParam MultipartFile fotoLateralDir
    ) {
        ChecklistResponse response = checklistService.criarChecklist(
                userDetails.getMotoristaId(),
                veiculoId,
                tipoOperacao,
                tipoDeslocamento,
                fotoPainel,
                fotoEstepe,
                fotoLateralEsq,
                fotoLateralDir
        );
        return ResponseEntity.ok(response);
    }
}
