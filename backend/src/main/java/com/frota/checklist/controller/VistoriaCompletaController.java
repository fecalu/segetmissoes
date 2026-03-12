package com.frota.checklist.controller;

import com.frota.checklist.dto.CriarVistoriaCompletaRequest;
import com.frota.checklist.dto.VistoriaCompletaResponse;
import com.frota.checklist.security.CustomUserDetails;
import com.frota.checklist.service.VistoriaCompletaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/vistorias-completas")
@RequiredArgsConstructor
public class VistoriaCompletaController {

    private final VistoriaCompletaService vistoriaCompletaService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VistoriaCompletaResponse> criar(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestPart("dados") @Valid CriarVistoriaCompletaRequest request,
            @RequestPart("fotoFrente") MultipartFile fotoFrente,
            @RequestPart("fotoLateralEsq") MultipartFile fotoLateralEsq,
            @RequestPart("fotoLateralDir") MultipartFile fotoLateralDir,
            @RequestPart("fotoTraseira") MultipartFile fotoTraseira,
            @RequestPart("fotoPainel") MultipartFile fotoPainel,
            @RequestPart("fotoEstepe") MultipartFile fotoEstepe,
            @RequestPart(name = "fotosAvarias", required = false) List<MultipartFile> fotosAvarias
    ) {
        return ResponseEntity.ok(vistoriaCompletaService.criar(
                userDetails.getMotoristaId(),
                request,
                fotoFrente,
                fotoLateralEsq,
                fotoLateralDir,
                fotoTraseira,
                fotoPainel,
                fotoEstepe,
                fotosAvarias
        ));
    }
}
