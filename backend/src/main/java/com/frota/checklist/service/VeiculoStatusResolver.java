package com.frota.checklist.service;

import com.frota.checklist.entity.Missao;
import com.frota.checklist.entity.MissaoExcecao;
import com.frota.checklist.entity.StatusExcecaoMissao;
import com.frota.checklist.entity.StatusMissao;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.repository.ChecklistRepository;
import com.frota.checklist.repository.MissaoExcecaoRepository;
import com.frota.checklist.repository.MissaoRepository;
import com.frota.checklist.repository.projection.UltimoChecklistStatusProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.BinaryOperator;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VeiculoStatusResolver {

    private final ChecklistRepository checklistRepository;
    private final MissaoRepository missaoRepository;
    private final MissaoExcecaoRepository missaoExcecaoRepository;

    public VeiculoStatusSnapshot resolver(Veiculo veiculo) {
        return resolverPorVeiculos(List.of(veiculo))
                .getOrDefault(veiculo.getId(), snapshotBase(veiculo));
    }

    public Map<Long, VeiculoStatusSnapshot> resolverPorVeiculos(List<Veiculo> veiculos) {
        if (veiculos == null || veiculos.isEmpty()) {
            return Map.of();
        }

        List<Long> veiculoIds = veiculos.stream()
                .map(Veiculo::getId)
                .filter(Objects::nonNull)
                .toList();

        if (veiculoIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, Missao> missaoAtivaPorVeiculo = missaoRepository
                .findByStatusAndVeiculoIdIn(StatusMissao.ATIVA, veiculoIds)
                .stream()
                .collect(Collectors.toMap(
                        m -> m.getVeiculo().getId(),
                        m -> m,
                        maisRecenteMissao()
                ));

        Map<Long, MissaoExcecao> excecaoAbertaPorVeiculo = missaoExcecaoRepository
                .findByVeiculoIdInAndStatusIn(veiculoIds, StatusExcecaoMissao.abertas())
                .stream()
                .collect(Collectors.toMap(
                        me -> me.getVeiculo().getId(),
                        me -> me,
                        maisRecenteExcecao()
                ));

        Map<Long, UltimoChecklistStatusProjection> ultimoChecklistPorVeiculo = checklistRepository
                .buscarUltimoStatusPorVeiculoIds(veiculoIds)
                .stream()
                .collect(Collectors.toMap(
                        UltimoChecklistStatusProjection::getVeiculoId,
                        row -> row,
                        maisRecenteChecklist()
                ));

        Map<Long, VeiculoStatusSnapshot> snapshots = new LinkedHashMap<>();
        for (Veiculo veiculo : veiculos) {
            Missao missaoAtiva = missaoAtivaPorVeiculo.get(veiculo.getId());
            MissaoExcecao excecaoAberta = excecaoAbertaPorVeiculo.get(veiculo.getId());
            UltimoChecklistStatusProjection ultimoChecklist = ultimoChecklistPorVeiculo.get(veiculo.getId());
            snapshots.put(veiculo.getId(), resolverInterno(veiculo, missaoAtiva, excecaoAberta, ultimoChecklist));
        }

        return snapshots;
    }

    private VeiculoStatusSnapshot resolverInterno(
            Veiculo veiculo,
            Missao missaoAtiva,
            MissaoExcecao excecaoAberta,
            UltimoChecklistStatusProjection ultimoChecklist
    ) {
        StatusVeiculo statusAdministrativo = StatusVeiculo.normalizarStatusAdministrativo(veiculo.getStatusAdministrativo());
        if (Boolean.TRUE.equals(veiculo.getDesativado()) && statusAdministrativo == null) {
            statusAdministrativo = StatusVeiculo.BLOQUEADO;
        }

        StatusVeiculo statusAutomatico = StatusVeiculo.BASE_JOAO_GOULART;
        Long motoristaAtualId = null;
        String motoristaAtualNome = null;

        if (missaoAtiva != null) {
            statusAutomatico = StatusVeiculo.CIRCULANDO;
            motoristaAtualId = missaoAtiva.getMotorista().getId();
            motoristaAtualNome = missaoAtiva.getMotorista().getNome();
        } else if (excecaoAberta != null) {
            statusAutomatico = StatusVeiculo.CIRCULANDO;
            motoristaAtualId = excecaoAberta.getMotorista().getId();
            motoristaAtualNome = excecaoAberta.getMotorista().getNome();
        } else if (ultimoChecklist != null) {
            TipoOperacao tipoUltimoChecklist = parseTipoOperacao(ultimoChecklist.getTipoOperacao());
            if (tipoUltimoChecklist == TipoOperacao.SAIDA) {
                if (veiculo.getDataHoraUltimoEncerramentoSemChecklist() != null
                        && !veiculo.getDataHoraUltimoEncerramentoSemChecklist().isBefore(ultimoChecklist.getDataHora())) {
                    statusAutomatico = StatusVeiculo.BASE_JOAO_GOULART;
                } else {
                    statusAutomatico = StatusVeiculo.CIRCULANDO;
                    motoristaAtualId = ultimoChecklist.getMotoristaId();
                    motoristaAtualNome = ultimoChecklist.getMotoristaNome();
                }
            }
        }

        StatusVeiculo statusAtual = statusAdministrativo != null ? statusAdministrativo : statusAutomatico;
        return new VeiculoStatusSnapshot(statusAutomatico, statusAdministrativo, statusAtual, motoristaAtualId, motoristaAtualNome);
    }

    private VeiculoStatusSnapshot snapshotBase(Veiculo veiculo) {
        StatusVeiculo statusAdministrativo = StatusVeiculo.normalizarStatusAdministrativo(veiculo.getStatusAdministrativo());
        if (Boolean.TRUE.equals(veiculo.getDesativado()) && statusAdministrativo == null) {
            statusAdministrativo = StatusVeiculo.BLOQUEADO;
        }
        StatusVeiculo statusAtual = statusAdministrativo != null ? statusAdministrativo : StatusVeiculo.BASE_JOAO_GOULART;
        return new VeiculoStatusSnapshot(StatusVeiculo.BASE_JOAO_GOULART, statusAdministrativo, statusAtual, null, null);
    }

    private BinaryOperator<Missao> maisRecenteMissao() {
        return (a, b) -> a.getDataHoraInicio().isAfter(b.getDataHoraInicio()) ? a : b;
    }

    private BinaryOperator<MissaoExcecao> maisRecenteExcecao() {
        return (a, b) -> a.getDataHoraAbertura().isAfter(b.getDataHoraAbertura()) ? a : b;
    }

    private BinaryOperator<UltimoChecklistStatusProjection> maisRecenteChecklist() {
        return (a, b) -> a.getDataHora().isAfter(b.getDataHora()) ? a : b;
    }

    private TipoOperacao parseTipoOperacao(String tipoOperacaoRaw) {
        if (tipoOperacaoRaw == null || tipoOperacaoRaw.isBlank()) {
            return null;
        }
        try {
            return TipoOperacao.valueOf(tipoOperacaoRaw);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
