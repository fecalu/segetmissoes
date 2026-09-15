package com.frota.checklist.controller;

import com.frota.checklist.dto.LoginRequest;
import com.frota.checklist.dto.LoginResponse;
import com.frota.checklist.dto.MotoristaResponse;
import com.frota.checklist.dto.RegisterMotoristaRequest;
import com.frota.checklist.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @org.springframework.web.bind.annotation.GetMapping("/me")
    public com.frota.checklist.dto.SessaoResponse sessao(
            @org.springframework.security.core.annotation.AuthenticationPrincipal
            com.frota.checklist.security.CustomUserDetails usuario) {
        return new com.frota.checklist.dto.SessaoResponse(usuario.getMotoristaId(), usuario.getNome(),
                usuario.getPerfil(), usuario.getPerfil().permissoes(), usuario.isDeveAlterarSenha(),
                usuario.isCadastroCompleto(), usuario.isMotoristaOperacional());
    }

    @PostMapping("/register")
    public ResponseEntity<MotoristaResponse> register(@Valid @RequestBody RegisterMotoristaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/alterar-senha-inicial")
    public ResponseEntity<LoginResponse> alterarSenhaInicial(
            @org.springframework.security.core.annotation.AuthenticationPrincipal
            com.frota.checklist.security.CustomUserDetails usuario,
            @Valid @RequestBody AlterarSenhaInicialRequest request) {
        return ResponseEntity.ok(authService.alterarSenhaInicial(usuario.getMotoristaId(), request.novaSenha()));
    }

    public record AlterarSenhaInicialRequest(
            @NotBlank @Size(min = 8, max = 100) String novaSenha
    ) {}
}
