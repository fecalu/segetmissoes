package com.frota.checklist.dto;

import com.frota.checklist.entity.Perfil;
import com.frota.checklist.security.Permissao;
import java.util.Set;

public record SessaoResponse(Long motoristaId, String nome, Perfil perfil, Set<Permissao> permissoes) {}
