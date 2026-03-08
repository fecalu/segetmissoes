package com.frota.checklist.service;

import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.MissaoExcecao;
import com.frota.checklist.entity.StatusExcecaoMissao;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.repository.ChecklistRepository;
import com.frota.checklist.repository.MissaoExcecaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class VeiculoStatusResolver {

    private final ChecklistRepository checklistRepository;
    private final MissaoExcecaoRepository missaoExcecaoRepository;

    public VeiculoStatusSnapshot resolver(Veiculo veiculo) {
        StatusVeiculo statusAdministrativo = StatusVeiculo.normalizarStatusAdministrativo(veiculo.getStatusAdministrativo());
        if (Boolean.TRUE.equals(veiculo.getDesativado()) && statusAdministrativo == null) {
            statusAdministrativo = StatusVeiculo.BLOQUEADO;
        }

        Optional<Checklist> ultimoChecklistOpt = checklistRepository.findTopByVeiculoIdOrderByDataHoraDescIdDesc(veiculo.getId());
        Optional<MissaoExcecao> missaoExcecaoAberta = missaoExcecaoRepository
                .findFirstByVeiculoIdAndStatusInOrderByDataHoraAberturaDesc(
                        veiculo.getId(),
                        StatusExcecaoMissao.abertas()
                );
        StatusVeiculo statusAutomatico = StatusVeiculo.BASE_JOAO_GOULART;
        Long motoristaAtualId = null;
        String motoristaAtualNome = null;

        if (missaoExcecaoAberta.isPresent()) {
            statusAutomatico = StatusVeiculo.CIRCULANDO;
            motoristaAtualId = missaoExcecaoAberta.get().getMotorista().getId();
            motoristaAtualNome = missaoExcecaoAberta.get().getMotorista().getNome();
        } else if (ultimoChecklistOpt.isPresent() && ultimoChecklistOpt.get().getTipoOperacao() == TipoOperacao.SAIDA) {
            if (veiculo.getDataHoraUltimoEncerramentoSemChecklist() != null
                    && !veiculo.getDataHoraUltimoEncerramentoSemChecklist().isBefore(ultimoChecklistOpt.get().getDataHora())) {
                statusAutomatico = StatusVeiculo.BASE_JOAO_GOULART;
            } else {
                statusAutomatico = StatusVeiculo.CIRCULANDO;
                motoristaAtualId = ultimoChecklistOpt.get().getMotorista().getId();
                motoristaAtualNome = ultimoChecklistOpt.get().getMotorista().getNome();
            }
        }

        StatusVeiculo statusAtual = statusAdministrativo != null ? statusAdministrativo : statusAutomatico;
        return new VeiculoStatusSnapshot(statusAutomatico, statusAdministrativo, statusAtual, motoristaAtualId, motoristaAtualNome);
    }
}
