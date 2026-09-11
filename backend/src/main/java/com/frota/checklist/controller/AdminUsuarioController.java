package com.frota.checklist.controller;

import com.frota.checklist.dto.*;
import com.frota.checklist.entity.AuditoriaAdministrativa;
import com.frota.checklist.repository.AuditoriaAdministrativaRepository;
import com.frota.checklist.service.AdminMotoristaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;

@RestController
@RequestMapping("/api/admin/usuarios")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ACESSO_GERIR')")
public class AdminUsuarioController {
    private final AdminMotoristaService service;
    private final AuditoriaAdministrativaRepository auditoria;

    @GetMapping public List<UsuarioResponse> listar() { return service.listarUsuarios(); }
    @PostMapping public UsuarioResponse criar(@Valid @RequestBody AdminMotoristaRequest request) {
        return service.criarUsuario(request);
    }
    @PutMapping("/{id}") public UsuarioResponse editar(@PathVariable Long id, @Valid @RequestBody AdminMotoristaRequest request) {
        return service.editarUsuario(id, request);
    }
    @PatchMapping("/{id}/acesso") public UsuarioResponse acesso(@PathVariable Long id, @Valid @RequestBody AcessoRequest request) {
        return service.alterarAcesso(id, request.habilitado(), request.justificativa());
    }
    @DeleteMapping("/{id}") public void excluir(@PathVariable Long id) { service.excluirUsuario(id); }
    @GetMapping("/auditoria") public List<AuditoriaAdministrativa> auditoria() {
        return auditoria.findTop200ByEntidadeOrderByDataHoraDescIdDesc("USUARIO");
    }
    public record AcessoRequest(@jakarta.validation.constraints.NotNull Boolean habilitado,
                               @NotBlank @Size(min = 10, max = 700) String justificativa) {}
}
