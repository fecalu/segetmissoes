package com.frota.checklist.service;

import com.frota.checklist.dto.AuditoriaMissaoResponse;
import com.frota.checklist.entity.AcaoAuditoriaMissao;
import com.frota.checklist.entity.AuditoriaMissao;
import com.frota.checklist.entity.Missao;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.StatusMissao;
import com.frota.checklist.repository.AuditoriaMissaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MissaoAuditoriaService {

    private final AuditoriaMissaoRepository auditoriaMissaoRepository;

    public void registrar(
            Missao missao,
            AcaoAuditoriaMissao acao,
            StatusMissao statusAnterior,
            StatusMissao statusNovo,
            Motorista usuarioAcao,
            String detalhe
    ) {
        registrarInterno(
                missao,
                acao,
                statusAnterior,
                statusNovo,
                usuarioAcao,
                detalhe,
                null,
                null,
                null
        );
    }

    public void registrarAlteracaoCampo(
            Missao missao,
            Motorista usuarioAcao,
            String campoAlterado,
            String valorAnterior,
            String valorNovo
    ) {
        String detalhe = "Campo '%s' alterado.".formatted(campoAlterado);
        registrarInterno(
                missao,
                AcaoAuditoriaMissao.ATUALIZACAO_DADOS_ADMINISTRATIVOS,
                missao.getStatus(),
                missao.getStatus(),
                usuarioAcao,
                detalhe,
                campoAlterado,
                valorAnterior,
                valorNovo
        );
    }

    private void registrarInterno(
            Missao missao,
            AcaoAuditoriaMissao acao,
            StatusMissao statusAnterior,
            StatusMissao statusNovo,
            Motorista usuarioAcao,
            String detalhe,
            String campoAlterado,
            String valorAnterior,
            String valorNovo
    ) {
        AuditoriaMissao auditoria = new AuditoriaMissao();
        auditoria.setMissao(missao);
        auditoria.setAcao(acao);
        auditoria.setStatusAnterior(statusAnterior);
        auditoria.setStatusNovo(statusNovo);
        auditoria.setUsuarioAcao(usuarioAcao);
        auditoria.setDetalhe(detalhe);
        auditoria.setCampoAlterado(campoAlterado);
        auditoria.setValorAnterior(valorAnterior);
        auditoria.setValorNovo(valorNovo);
        auditoriaMissaoRepository.save(auditoria);
    }

    public List<AuditoriaMissaoResponse> listarPorMissao(Long missaoId) {
        return auditoriaMissaoRepository.findByMissaoIdOrderByDataHoraDesc(missaoId).stream()
                .map(item -> new AuditoriaMissaoResponse(
                        item.getId(),
                        item.getMissao().getId(),
                        item.getAcao(),
                        item.getStatusAnterior(),
                        item.getStatusNovo(),
                        item.getUsuarioAcao() != null ? item.getUsuarioAcao().getId() : null,
                        item.getUsuarioAcao() != null ? item.getUsuarioAcao().getNome() : null,
                        item.getDataHora(),
                        item.getDetalhe(),
                        item.getCampoAlterado(),
                        item.getValorAnterior(),
                        item.getValorNovo()
                ))
                .toList();
    }
}
