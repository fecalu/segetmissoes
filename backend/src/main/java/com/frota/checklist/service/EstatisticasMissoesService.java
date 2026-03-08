package com.frota.checklist.service;

import com.frota.checklist.dto.EstatisticasMissoesResponse;
import com.frota.checklist.dto.MissaoMotoristaStatsResponse;
import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.repository.ChecklistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EstatisticasMissoesService {

    private final ChecklistRepository checklistRepository;

    @Transactional(readOnly = true)
    public EstatisticasMissoesResponse gerar(LocalDate dataInicial, LocalDate dataFinal) {
        validarPeriodo(dataInicial, dataFinal);

        LocalDateTime inicio = dataInicial.atStartOfDay();
        LocalDateTime fim = dataFinal.atTime(23, 59, 59);

        List<Checklist> registros = checklistRepository.buscarParaRelatorio(inicio, fim);

        Map<Long, AcumuladorMotorista> agregados = new HashMap<>();
        Map<Long, Map<Long, Deque<LocalDateTime>>> saidasPendentes = new HashMap<>();

        for (Checklist checklist : registros) {
            Long motoristaId = checklist.getMotorista().getId();
            Long veiculoId = checklist.getVeiculo().getId();
            LocalDateTime dataHora = checklist.getDataHora();

            if (checklist.getTipoOperacao() == TipoOperacao.SAIDA) {
                saidasPendentes
                        .computeIfAbsent(motoristaId, id -> new HashMap<>())
                        .computeIfAbsent(veiculoId, id -> new LinkedList<>())
                        .addLast(dataHora);
                continue;
            }

            LocalDateTime saida = consumirSaidaCorrespondente(saidasPendentes.get(motoristaId), veiculoId);
            if (saida == null || dataHora.isBefore(saida)) {
                continue;
            }

            long duracaoSegundos = Duration.between(saida, dataHora).getSeconds();
            AcumuladorMotorista acumulador = agregados.computeIfAbsent(
                    motoristaId,
                    id -> new AcumuladorMotorista(motoristaId, checklist.getMotorista().getNome())
            );
            acumulador.incrementar(duracaoSegundos);
        }

        List<MissaoMotoristaStatsResponse> base = agregados.values().stream()
                .map(this::toResponse)
                .toList();

        List<MissaoMotoristaStatsResponse> rankingPorMissoes = new ArrayList<>(base);
        rankingPorMissoes.sort(
                Comparator.comparingLong(MissaoMotoristaStatsResponse::quantidadeMissoes).reversed()
                        .thenComparing(MissaoMotoristaStatsResponse::motoristaNome)
        );

        List<MissaoMotoristaStatsResponse> rankingPorTempo = new ArrayList<>(base);
        rankingPorTempo.sort(
                Comparator.comparingLong(MissaoMotoristaStatsResponse::tempoTotalSegundos).reversed()
                        .thenComparing(MissaoMotoristaStatsResponse::motoristaNome)
        );

        long totalMissoes = base.stream().mapToLong(MissaoMotoristaStatsResponse::quantidadeMissoes).sum();
        long totalSegundos = base.stream().mapToLong(MissaoMotoristaStatsResponse::tempoTotalSegundos).sum();

        return new EstatisticasMissoesResponse(
                dataInicial,
                dataFinal,
                totalMissoes,
                horasArredondadas(totalSegundos),
                rankingPorMissoes,
                rankingPorTempo
        );
    }

    private void validarPeriodo(LocalDate dataInicial, LocalDate dataFinal) {
        if (dataInicial == null || dataFinal == null) {
            throw new BusinessException("Informe dataInicial e dataFinal.");
        }
        if (dataFinal.isBefore(dataInicial)) {
            throw new BusinessException("dataFinal nao pode ser menor que dataInicial.");
        }
    }

    private LocalDateTime consumirSaidaCorrespondente(Map<Long, Deque<LocalDateTime>> saidasMotorista, Long veiculoId) {
        if (saidasMotorista == null || saidasMotorista.isEmpty()) {
            return null;
        }

        Deque<LocalDateTime> saidasVeiculo = saidasMotorista.get(veiculoId);
        if (saidasVeiculo != null && !saidasVeiculo.isEmpty()) {
            return saidasVeiculo.removeFirst();
        }

        LocalDateTime candidata = null;
        Long veiculoCandidato = null;
        for (Map.Entry<Long, Deque<LocalDateTime>> entry : saidasMotorista.entrySet()) {
            Deque<LocalDateTime> fila = entry.getValue();
            if (fila == null || fila.isEmpty()) {
                continue;
            }
            LocalDateTime primeira = fila.peekFirst();
            if (candidata == null || primeira.isBefore(candidata)) {
                candidata = primeira;
                veiculoCandidato = entry.getKey();
            }
        }

        if (candidata == null || veiculoCandidato == null) {
            return null;
        }
        return saidasMotorista.get(veiculoCandidato).removeFirst();
    }

    private MissaoMotoristaStatsResponse toResponse(AcumuladorMotorista acumulador) {
        return new MissaoMotoristaStatsResponse(
                acumulador.motoristaId(),
                acumulador.motoristaNome(),
                acumulador.quantidadeMissoes(),
                acumulador.tempoTotalSegundos(),
                horasArredondadas(acumulador.tempoTotalSegundos())
        );
    }

    private double horasArredondadas(long segundos) {
        return BigDecimal.valueOf(segundos)
                .divide(BigDecimal.valueOf(3600), 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private static final class AcumuladorMotorista {
        private final Long motoristaId;
        private final String motoristaNome;
        private long quantidadeMissoes;
        private long tempoTotalSegundos;

        private AcumuladorMotorista(Long motoristaId, String motoristaNome) {
            this.motoristaId = motoristaId;
            this.motoristaNome = motoristaNome;
        }

        private void incrementar(long duracaoSegundos) {
            quantidadeMissoes++;
            tempoTotalSegundos += duracaoSegundos;
        }

        private Long motoristaId() {
            return motoristaId;
        }

        private String motoristaNome() {
            return motoristaNome;
        }

        private long quantidadeMissoes() {
            return quantidadeMissoes;
        }

        private long tempoTotalSegundos() {
            return tempoTotalSegundos;
        }
    }
}
