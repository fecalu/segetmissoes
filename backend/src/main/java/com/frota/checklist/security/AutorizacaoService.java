package com.frota.checklist.security;

import com.frota.checklist.entity.*;
import com.frota.checklist.repository.MotoristaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AutorizacaoService {
    private final MotoristaRepository motoristaRepository;

    public Motorista exigir(Permissao permissao) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails principal)) {
            throw new AccessDeniedException("Acesso nao autorizado");
        }
        Motorista usuario = motoristaRepository.findById(principal.getMotoristaId())
                .orElseThrow(() -> new AccessDeniedException("Acesso nao autorizado"));
        if (!usuario.isAcessoHabilitado() || usuario.getPerfil() == null
                || !usuario.getPerfil().permissoes().contains(permissao)) {
            throw new AccessDeniedException("Seu perfil nao permite realizar esta operacao");
        }
        return usuario;
    }

    public Motorista exigir(Long autorId, Permissao permissao) {
        Motorista usuario = exigir(permissao);
        if (!Objects.equals(usuario.getId(), autorId)) throw new AccessDeniedException("Autor invalido");
        return usuario;
    }

    public void validarInicio(Motorista autor, Veiculo veiculo, StatusVeiculo status) {
        if (autor.getPerfil() == Perfil.OPERADOR && (Boolean.TRUE.equals(veiculo.getDesativado())
                || (status != StatusVeiculo.BASE_JOAO_GOULART && status != StatusVeiculo.NO_PATIO))) {
            throw new AccessDeniedException("A liberacao deste veiculo precisa ser feita por um Gestor ou Administrador");
        }
    }

    public void validarDestinoRetorno(Motorista autor, StatusVeiculo destino) {
        if (autor.getPerfil() == Perfil.OPERADOR && destino != null
                && destino != StatusVeiculo.NO_PATIO && destino != StatusVeiculo.AGUARDANDO_REALOCACAO) {
            throw new AccessDeniedException("Este destino precisa de um Gestor ou Administrador");
        }
    }

    public void validarRetornoMissao(Motorista autor, Missao missao) {
        if (autor.getPerfil() == Perfil.OPERADOR
                && missao.getOrigemAbertura() != OrigemAberturaMissao.REGISTRO_ADMINISTRATIVO) {
            throw new AccessDeniedException("O encerramento excepcional precisa de um Gestor ou Administrador");
        }
        Veiculo veiculo = missao.getVeiculo();
        StatusVeiculo status = veiculo.getStatusAdministrativo();
        if (autor.getPerfil() == Perfil.OPERADOR && (Boolean.TRUE.equals(veiculo.getDesativado())
                || (status != null && status != StatusVeiculo.NO_PATIO && status != StatusVeiculo.EM_VIAGEM))) {
            throw new AccessDeniedException("O retorno deste veiculo precisa de um Gestor ou Administrador");
        }
    }
}
