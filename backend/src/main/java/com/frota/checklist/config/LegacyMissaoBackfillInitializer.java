package com.frota.checklist.config;

import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.Missao;
import com.frota.checklist.entity.MissaoExcecao;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.OrigemAberturaMissao;
import com.frota.checklist.entity.StatusMissao;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.repository.ChecklistRepository;
import com.frota.checklist.repository.MissaoExcecaoRepository;
import com.frota.checklist.repository.MissaoRepository;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.repository.VeiculoRepository;
import com.frota.checklist.service.VeiculoStatusResolver;
import com.frota.checklist.service.VeiculoStatusSnapshot;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Order(350)
@Slf4j
public class LegacyMissaoBackfillInitializer implements CommandLineRunner {

    private final MissaoRepository missaoRepository;
    private final VeiculoRepository veiculoRepository;
    private final MotoristaRepository motoristaRepository;
    private final ChecklistRepository checklistRepository;
    private final MissaoExcecaoRepository missaoExcecaoRepository;
    private final VeiculoStatusResolver veiculoStatusResolver;

    @Override
    public void run(String... args) {
        int criadas = 0;
        for (Veiculo veiculo : veiculoRepository.findAll()) {
            if (missaoRepository.existsByVeiculoIdAndStatus(veiculo.getId(), StatusMissao.ATIVA)) {
                continue;
            }

            VeiculoStatusSnapshot snapshot = veiculoStatusResolver.resolver(veiculo);
            if (snapshot.statusAutomatico() != StatusVeiculo.CIRCULANDO || snapshot.motoristaAtualId() == null) {
                continue;
            }

            Long motoristaId = snapshot.motoristaAtualId();
            if (missaoRepository.existsByMotoristaIdAndStatus(motoristaId, StatusMissao.ATIVA)) {
                continue;
            }

            Optional<Motorista> motoristaOpt = motoristaRepository.findById(motoristaId);
            if (motoristaOpt.isEmpty()) {
                continue;
            }

            Optional<MissaoExcecao> excecaoAberta = missaoExcecaoRepository
                    .findFirstByVeiculoIdAndStatusInOrderByDataHoraAberturaDesc(veiculo.getId(), com.frota.checklist.entity.StatusExcecaoMissao.abertas());
            Optional<Checklist> checklistSaida = checklistRepository
                    .findTopByVeiculoIdAndMotoristaIdAndTipoOperacaoOrderByDataHoraDescIdDesc(
                            veiculo.getId(),
                            motoristaId,
                            TipoOperacao.SAIDA
                    );

            Missao missao = new Missao();
            missao.setMotorista(motoristaOpt.get());
            missao.setVeiculo(veiculo);
            missao.setStatus(StatusMissao.ATIVA);

            LocalDateTime dataHoraInicio = excecaoAberta.map(MissaoExcecao::getDataHoraAbertura)
                    .orElseGet(() -> checklistSaida.map(Checklist::getDataHora).orElse(LocalDateTime.now()));
            missao.setDataHoraInicio(dataHoraInicio);

            if (excecaoAberta.isPresent()) {
                missao.setOrigemAbertura(OrigemAberturaMissao.SEM_CHECKLIST);
                missao.setMissaoExcecaoId(excecaoAberta.get().getId());
            } else {
                missao.setOrigemAbertura(OrigemAberturaMissao.CHECKLIST);
                missao.setChecklistSaidaId(checklistSaida.map(Checklist::getId).orElse(null));
            }

            missaoRepository.save(missao);
            criadas++;
        }

        if (criadas > 0) {
            log.info("Backfill de missoes legadas concluiu com {} missoes ativas criadas.", criadas);
        }
    }
}

