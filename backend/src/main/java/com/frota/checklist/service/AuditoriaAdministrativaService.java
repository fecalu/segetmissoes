package com.frota.checklist.service;

import com.frota.checklist.entity.*;
import com.frota.checklist.repository.AuditoriaAdministrativaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditoriaAdministrativaService {
    private final AuditoriaAdministrativaRepository repository;

    public void registrar(Motorista autor, String entidade, Long id, String acao, String campo,
                          String anterior, String novo, String justificativa) {
        var evento = new AuditoriaAdministrativa();
        evento.setAutorId(autor.getId());
        evento.setAutorNome(autor.getNome());
        evento.setAutorPerfil(autor.getPerfil());
        evento.setEntidade(entidade);
        evento.setRegistroId(id);
        evento.setAcao(acao);
        evento.setCampo(campo);
        evento.setValorAnterior(anterior);
        evento.setValorNovo(novo);
        evento.setJustificativa(justificativa);
        repository.save(evento);
    }
}
