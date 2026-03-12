package com.frota.checklist.service;

import com.frota.checklist.dto.HistoricoVeiculoResponse;
import com.frota.checklist.dto.TipoEventoHistoricoVeiculo;
import com.frota.checklist.entity.AuditoriaMissao;
import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.HistoricoStatusVeiculo;
import com.frota.checklist.entity.Missao;
import com.frota.checklist.entity.MissaoExcecao;
import com.frota.checklist.entity.MotivoExcecaoMissao;
import com.frota.checklist.entity.ResultadoVistoriaCompleta;
import com.frota.checklist.entity.RegistroViagemVeiculo;
import com.frota.checklist.entity.StatusExcecaoMissao;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.TipoDeslocamentoMissao;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.entity.VistoriaCompleta;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.ChecklistRepository;
import com.frota.checklist.repository.AuditoriaMissaoRepository;
import com.frota.checklist.repository.HistoricoStatusVeiculoRepository;
import com.frota.checklist.repository.MissaoExcecaoRepository;
import com.frota.checklist.repository.MissaoRepository;
import com.frota.checklist.repository.RegistroViagemVeiculoRepository;
import com.frota.checklist.repository.VeiculoRepository;
import com.frota.checklist.repository.VistoriaCompletaRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AdminHistoricoVeiculoService {

    private final VeiculoRepository veiculoRepository;
    private final MissaoRepository missaoRepository;
    private final ChecklistRepository checklistRepository;
    private final AuditoriaMissaoRepository auditoriaMissaoRepository;
    private final MissaoExcecaoRepository missaoExcecaoRepository;
    private final RegistroViagemVeiculoRepository registroViagemVeiculoRepository;
    private final VistoriaCompletaRepository vistoriaCompletaRepository;
    private final HistoricoStatusVeiculoRepository historicoStatusVeiculoRepository;
    private final VeiculoStatusResolver veiculoStatusResolver;
    private final ConfiguracaoRotuloStatusVeiculoService configuracaoRotuloStatusVeiculoService;

    @Transactional
    public HistoricoVeiculoResponse buscar(Long veiculoId) {
        Veiculo veiculo = veiculoRepository.findById(veiculoId)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));

        List<Missao> missoes = missaoRepository.findByVeiculoIdOrderByDataHoraInicioDescIdDesc(veiculoId);
        List<Checklist> checklists = checklistRepository.findByVeiculoIdOrderByDataHoraDescIdDesc(veiculoId);
        List<AuditoriaMissao> auditoriasMissao = auditoriaMissaoRepository.findByMissaoVeiculoIdOrderByDataHoraDesc(veiculoId);
        List<MissaoExcecao> excecoes = missaoExcecaoRepository.findByVeiculoIdOrderByDataHoraAberturaDescIdDesc(veiculoId);
        List<RegistroViagemVeiculo> viagens = registroViagemVeiculoRepository.findByVeiculoIdOrderByDataHoraSaidaDescIdDesc(veiculoId);
        List<VistoriaCompleta> vistorias = vistoriaCompletaRepository.findByVeiculoIdOrderByDataHoraDescIdDesc(veiculoId);
        List<HistoricoStatusVeiculo> historicoStatus = historicoStatusVeiculoRepository.findByVeiculoIdOrderByDataHoraDesc(veiculoId);

        Map<Long, Checklist> checklistsPorId = new HashMap<>();
        checklists.forEach(checklist -> checklistsPorId.put(checklist.getId(), checklist));

        List<HistoricoVeiculoResponse.Evento> eventos = new ArrayList<>();

        missoes.forEach(missao -> {
            eventos.add(mapearMissaoIniciada(missao, checklistsPorId));
            if (missao.getDataHoraFim() != null) {
                eventos.add(mapearMissaoFinalizada(missao, checklistsPorId));
            }
        });
        auditoriasMissao.stream()
                .filter(this::isAjusteHorarioMissao)
                .forEach(auditoria -> eventos.add(mapearAjusteHorarioMissao(auditoria)));
        auditoriasMissao.stream()
                .filter(this::isEdicaoAdministrativaMissao)
                .forEach(auditoria -> eventos.add(mapearEdicaoAdministrativaMissao(auditoria)));

        checklists.forEach(checklist -> eventos.add(mapearChecklist(checklist)));

        excecoes.forEach(excecao -> {
            if (!excecao.isSomenteEncerramentoSemChecklist()) {
                eventos.add(mapearExcecaoAbertura(excecao));
            }
            if (excecao.getDataHoraRegularizacao() != null) {
                eventos.add(mapearExcecaoRegularizada(excecao, checklistsPorId));
            }
        });

        viagens.forEach(viagem -> {
            eventos.add(mapearViagemIniciada(viagem));
            if (viagem.getDataHoraRetorno() != null) {
                eventos.add(mapearViagemFinalizada(viagem));
            }
        });

        vistorias.forEach(vistoria -> eventos.add(mapearVistoria(vistoria)));
        historicoStatus.forEach(item -> eventos.add(mapearHistoricoStatus(item)));

        eventos.sort(Comparator
                .comparing(HistoricoVeiculoResponse.Evento::dataHora, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(HistoricoVeiculoResponse.Evento::idExibicao, Comparator.reverseOrder()));

        VeiculoStatusSnapshot snapshot = veiculoStatusResolver.resolver(veiculo);
        Map<StatusVeiculo, String> rotulos = configuracaoRotuloStatusVeiculoService.mapaRotulosAtuais();
        LocalDateTime ultimaMovimentacaoEm = eventos.stream()
                .map(HistoricoVeiculoResponse.Evento::dataHora)
                .filter(java.util.Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        HistoricoVeiculoResponse.Resumo resumo = new HistoricoVeiculoResponse.Resumo(
                eventos.size(),
                missoes.size(),
                checklists.size(),
                excecoes.size(),
                vistorias.size(),
                (int) vistorias.stream().filter(v -> v.getTipoOperacao() == TipoOperacao.SAIDA).count(),
                (int) historicoStatus.stream().filter(h -> h.getStatusNovo() == StatusVeiculo.OFICINA).count(),
                missoes.stream()
                        .map(this::ultimaDataMissao)
                        .flatMap(Optional::stream)
                        .max(LocalDateTime::compareTo)
                        .orElse(null),
                vistorias.stream()
                        .map(VistoriaCompleta::getDataHora)
                        .max(LocalDateTime::compareTo)
                        .orElse(null)
        );

        return new HistoricoVeiculoResponse(
                veiculo.getId(),
                veiculo.getPlaca(),
                veiculo.getMarca(),
                veiculo.getModelo(),
                snapshot.statusAtual(),
                rotulos.getOrDefault(snapshot.statusAtual(), snapshot.statusAtual().name()),
                snapshot.motoristaAtualNome(),
                ultimaMovimentacaoEm,
                resumo,
                eventos
        );
    }

    private HistoricoVeiculoResponse.Evento mapearMissaoIniciada(Missao missao, Map<Long, Checklist> checklistsPorId) {
        Checklist checklistSaida = missao.getChecklistSaidaId() == null ? null : checklistsPorId.get(missao.getChecklistSaidaId());
        int quantidadeFotos = checklistSaida == null ? 0 : checklistSaida.getFotos().size();
        return new HistoricoVeiculoResponse.Evento(
                "MISSAO-INICIO-" + missao.getId(),
                TipoEventoHistoricoVeiculo.MISSAO_INICIADA,
                missao.getDataHoraInicio(),
                tituloInicioMissao(missao),
                descricaoDadosMissao(missao),
                missao.getMotorista().getNome(),
                nomeResponsavelAberturaMissao(missao),
                quantidadeFotos > 0,
                quantidadeFotos,
                false,
                0,
                missao.getId(),
                missao.getChecklistSaidaId(),
                missao.getMissaoExcecaoId(),
                null,
                null,
                new HistoricoVeiculoResponse.Detalhe(
                        null,
                        missao.getOrigemAbertura(),
                        null,
                        missao.getStatusDocumental(),
                        null,
                        null,
                        missao.getMotivoContingencia(),
                        missao.getLocalDestino(),
                        missao.getSetorSolicitante(),
                        missao.getSolicitanteNome(),
                        missao.getJustificativaContingenciaAbertura(),
                        null,
                        null,
                        checklistSaida != null ? checklistSaida.getQuilometragem() : null,
                        null,
                        null,
                        null,
                        null
                )
        );
    }

    private HistoricoVeiculoResponse.Evento mapearMissaoFinalizada(Missao missao, Map<Long, Checklist> checklistsPorId) {
        Checklist checklistChegada = missao.getChecklistChegadaId() == null ? null : checklistsPorId.get(missao.getChecklistChegadaId());
        int quantidadeFotos = checklistChegada == null ? 0 : checklistChegada.getFotos().size();
        return new HistoricoVeiculoResponse.Evento(
                "MISSAO-FIM-" + missao.getId(),
                TipoEventoHistoricoVeiculo.MISSAO_FINALIZADA,
                missao.getDataHoraFim(),
                tituloFimMissao(missao),
                descricaoDadosMissao(missao),
                missao.getMotorista().getNome(),
                nomeResponsavelEncerramentoMissao(missao),
                quantidadeFotos > 0,
                quantidadeFotos,
                false,
                0,
                missao.getId(),
                missao.getChecklistChegadaId(),
                missao.getMissaoExcecaoId(),
                null,
                null,
                new HistoricoVeiculoResponse.Detalhe(
                        null,
                        null,
                        missao.getOrigemEncerramento(),
                        missao.getStatusDocumental(),
                        null,
                        null,
                        null,
                        missao.getLocalDestino(),
                        missao.getSetorSolicitante(),
                        missao.getSolicitanteNome(),
                        null,
                        missao.getJustificativaContingenciaEncerramento(),
                        null,
                        checklistChegada != null ? checklistChegada.getQuilometragem() : null,
                        null,
                        null,
                        null,
                        null
                )
        );
    }

    private HistoricoVeiculoResponse.Evento mapearChecklist(Checklist checklist) {
        int quantidadeFotos = checklist.getFotos() == null ? 0 : checklist.getFotos().size();
        return new HistoricoVeiculoResponse.Evento(
                "CHECKLIST-" + checklist.getId(),
                checklist.getTipoOperacao() == TipoOperacao.SAIDA
                        ? TipoEventoHistoricoVeiculo.CHECKLIST_SAIDA
                        : TipoEventoHistoricoVeiculo.CHECKLIST_CHEGADA,
                checklist.getDataHora(),
                checklist.getTipoOperacao() == TipoOperacao.SAIDA ? "Checklist de saida" : "Checklist de chegada",
                checklist.getQuilometragem() == null
                        ? "Checklist fotografico enviado."
                        : "Checklist fotografico enviado. Quilometragem: %s km.".formatted(checklist.getQuilometragem()),
                checklist.getMotorista().getNome(),
                checklist.getMotorista().getNome(),
                quantidadeFotos > 0,
                quantidadeFotos,
                false,
                0,
                null,
                checklist.getId(),
                null,
                null,
                null,
                new HistoricoVeiculoResponse.Detalhe(
                        checklist.getTipoOperacao(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        checklist.getQuilometragem(),
                        null,
                        null,
                        null,
                        null
                )
        );
    }

    private HistoricoVeiculoResponse.Evento mapearAjusteHorarioMissao(AuditoriaMissao auditoria) {
        String campo = auditoria.getCampoAlterado();
        String descricao = "Horario ajustado: %s -> %s".formatted(
                valorOuTraco(auditoria.getValorAnterior()),
                valorOuTraco(auditoria.getValorNovo())
        );

        return new HistoricoVeiculoResponse.Evento(
                "MISSAO-AJUSTE-" + auditoria.getId(),
                TipoEventoHistoricoVeiculo.MISSAO_HORARIO_AJUSTADO,
                auditoria.getDataHora(),
                "Horario da missao ajustado",
                descricaoCampoHorario(campo) + ". " + descricao,
                auditoria.getMissao().getMotorista().getNome(),
                auditoria.getUsuarioAcao() != null ? auditoria.getUsuarioAcao().getNome() : null,
                false,
                0,
                false,
                0,
                auditoria.getMissao().getId(),
                null,
                auditoria.getMissao().getMissaoExcecaoId(),
                null,
                null,
                new HistoricoVeiculoResponse.Detalhe(
                        null,
                        auditoria.getMissao().getOrigemAbertura(),
                        auditoria.getMissao().getOrigemEncerramento(),
                        auditoria.getMissao().getStatusDocumental(),
                        null,
                        null,
                        auditoria.getMissao().getMotivoContingencia(),
                        auditoria.getMissao().getLocalDestino(),
                        auditoria.getMissao().getSetorSolicitante(),
                        auditoria.getMissao().getSolicitanteNome(),
                        auditoria.getDetalhe(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                )
        );
    }

    private HistoricoVeiculoResponse.Evento mapearEdicaoAdministrativaMissao(AuditoriaMissao auditoria) {
        String campo = auditoria.getCampoAlterado();
        String descricao = "%s: %s -> %s".formatted(
                labelCampoEdicaoMissao(campo),
                valorOuTraco(auditoria.getValorAnterior()),
                valorOuTraco(auditoria.getValorNovo())
        );

        return new HistoricoVeiculoResponse.Evento(
                "MISSAO-EDICAO-" + auditoria.getId(),
                TipoEventoHistoricoVeiculo.MISSAO_EDITADA_ADMIN,
                auditoria.getDataHora(),
                "Dados da missao ajustados",
                descricao,
                auditoria.getMissao().getMotorista().getNome(),
                auditoria.getUsuarioAcao() != null ? auditoria.getUsuarioAcao().getNome() : null,
                false,
                0,
                false,
                0,
                auditoria.getMissao().getId(),
                null,
                auditoria.getMissao().getMissaoExcecaoId(),
                null,
                null,
                new HistoricoVeiculoResponse.Detalhe(
                        null,
                        auditoria.getMissao().getOrigemAbertura(),
                        auditoria.getMissao().getOrigemEncerramento(),
                        auditoria.getMissao().getStatusDocumental(),
                        null,
                        null,
                        auditoria.getMissao().getMotivoContingencia(),
                        auditoria.getMissao().getLocalDestino(),
                        auditoria.getMissao().getSetorSolicitante(),
                        auditoria.getMissao().getSolicitanteNome(),
                        auditoria.getDetalhe(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                )
        );
    }

    private HistoricoVeiculoResponse.Evento mapearExcecaoAbertura(MissaoExcecao excecao) {
        return new HistoricoVeiculoResponse.Evento(
                "EXCECAO-ABERTURA-" + excecao.getId(),
                TipoEventoHistoricoVeiculo.EXCECAO_ABERTA,
                excecao.getDataHoraAbertura(),
                "Saida sem checklist",
                "Motivo: %s".formatted(labelMotivoExcecao(excecao.getMotivo())),
                excecao.getMotorista().getNome(),
                excecao.getMotorista().getNome(),
                false,
                0,
                false,
                0,
                null,
                null,
                excecao.getId(),
                null,
                null,
                new HistoricoVeiculoResponse.Detalhe(
                        TipoOperacao.SAIDA,
                        null,
                        null,
                        null,
                        excecao.getStatus(),
                        null,
                        excecao.getMotivo(),
                        null,
                        null,
                        null,
                        excecao.getJustificativa(),
                        null,
                        null,
                        null,
                        excecao.getLocalizacao(),
                        null,
                        null,
                        null
                )
        );
    }

    private HistoricoVeiculoResponse.Evento mapearExcecaoRegularizada(MissaoExcecao excecao, Map<Long, Checklist> checklistsPorId) {
        Checklist checklistRegularizacao = excecao.getChecklistRegularizacaoId() == null
                ? null
                : checklistsPorId.get(excecao.getChecklistRegularizacaoId());
        int quantidadeFotos = checklistRegularizacao == null ? 0 : checklistRegularizacao.getFotos().size();
        return new HistoricoVeiculoResponse.Evento(
                "EXCECAO-REGULARIZADA-" + excecao.getId(),
                TipoEventoHistoricoVeiculo.EXCECAO_REGULARIZADA,
                excecao.getDataHoraRegularizacao(),
                "Regularizacao sem checklist",
                "Status final: %s".formatted(labelStatusExcecao(excecao.getStatus())),
                excecao.getMotorista().getNome(),
                nomeResponsavelRegularizacaoExcecao(excecao),
                quantidadeFotos > 0,
                quantidadeFotos,
                false,
                0,
                null,
                excecao.getChecklistRegularizacaoId(),
                excecao.getId(),
                null,
                null,
                new HistoricoVeiculoResponse.Detalhe(
                        TipoOperacao.ENTRADA,
                        null,
                        null,
                        null,
                        excecao.getStatus(),
                        null,
                        excecao.getMotivo(),
                        null,
                        null,
                        null,
                        excecao.getJustificativa(),
                        excecao.getJustificativaEncerramentoAdmin(),
                        null,
                        checklistRegularizacao != null ? checklistRegularizacao.getQuilometragem() : null,
                        excecao.getLocalizacao(),
                        null,
                        null,
                        null
                )
        );
    }

    private HistoricoVeiculoResponse.Evento mapearVistoria(VistoriaCompleta vistoria) {
        int quantidadeFotos = vistoria.getFotos().size() + vistoria.getAvarias().size();
        int quantidadeAvarias = vistoria.getAvarias().size();
        String descricao = vistoria.getTipoOperacao() == TipoOperacao.SAIDA
                ? "Entregue para: %s".formatted(valorOuTraco(vistoria.getNomeContraparte()))
                : "Recebido de: %s".formatted(valorOuTraco(vistoria.getNomeContraparte()));

        return new HistoricoVeiculoResponse.Evento(
                "VISTORIA-" + vistoria.getId(),
                vistoria.getTipoOperacao() == TipoOperacao.SAIDA
                        ? TipoEventoHistoricoVeiculo.VISTORIA_COMPLETA_SAIDA
                        : TipoEventoHistoricoVeiculo.VISTORIA_COMPLETA_CHEGADA,
                vistoria.getDataHora(),
                vistoria.getTipoOperacao() == TipoOperacao.SAIDA
                        ? "Vistoria completa de saida"
                        : "Vistoria completa de chegada",
                descricao,
                vistoria.getMotorista().getNome(),
                vistoria.getMotorista().getNome(),
                quantidadeFotos > 0,
                quantidadeFotos,
                quantidadeAvarias > 0,
                quantidadeAvarias,
                null,
                null,
                null,
                vistoria.getId(),
                null,
                new HistoricoVeiculoResponse.Detalhe(
                        vistoria.getTipoOperacao(),
                        null,
                        null,
                        null,
                        null,
                        vistoria.getResultado(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        vistoria.getNomeContraparte(),
                        vistoria.getQuilometragem(),
                        vistoria.getLocalizacao(),
                        vistoria.getObservacaoGeral(),
                        null,
                        null
                )
        );
    }

    private HistoricoVeiculoResponse.Evento mapearViagemIniciada(RegistroViagemVeiculo viagem) {
        return new HistoricoVeiculoResponse.Evento(
                "VIAGEM-INICIO-" + viagem.getId(),
                TipoEventoHistoricoVeiculo.VIAGEM_INICIADA,
                viagem.getDataHoraSaida(),
                "Viagem iniciada",
                "Destino: %s".formatted(valorOuTraco(viagem.getLocalDestino())),
                viagem.getMotorista().getNome(),
                viagem.getAdministradorRegistro().getNome(),
                false,
                0,
                false,
                0,
                null,
                null,
                null,
                null,
                null,
                new HistoricoVeiculoResponse.Detalhe(
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        viagem.getLocalDestino(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        viagem.getObservacao(),
                        null,
                        null
                )
        );
    }

    private HistoricoVeiculoResponse.Evento mapearViagemFinalizada(RegistroViagemVeiculo viagem) {
        return new HistoricoVeiculoResponse.Evento(
                "VIAGEM-FIM-" + viagem.getId(),
                TipoEventoHistoricoVeiculo.VIAGEM_FINALIZADA,
                viagem.getDataHoraRetorno(),
                "Viagem finalizada",
                "Retorno da viagem registrado.",
                viagem.getMotorista().getNome(),
                viagem.getAdministradorEncerramento() != null ? viagem.getAdministradorEncerramento().getNome() : null,
                false,
                0,
                false,
                0,
                null,
                null,
                null,
                null,
                null,
                new HistoricoVeiculoResponse.Detalhe(
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        viagem.getLocalDestino(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        viagem.getObservacao(),
                        null,
                        null
                )
        );
    }

    private HistoricoVeiculoResponse.Evento mapearHistoricoStatus(HistoricoStatusVeiculo item) {
        return new HistoricoVeiculoResponse.Evento(
                "STATUS-" + item.getId(),
                TipoEventoHistoricoVeiculo.STATUS_ALTERADO,
                item.getDataHora(),
                "Status alterado",
                "De: %s | Para: %s".formatted(item.getStatusAnterior().name(), item.getStatusNovo().name()),
                null,
                item.getAdministrador().getNome(),
                false,
                0,
                false,
                0,
                null,
                null,
                null,
                null,
                item.getId(),
                new HistoricoVeiculoResponse.Detalhe(
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        item.getStatusAnterior(),
                        item.getStatusNovo()
                )
        );
    }

    private Optional<LocalDateTime> ultimaDataMissao(Missao missao) {
        if (missao.getDataHoraFim() != null && missao.getDataHoraFim().isAfter(missao.getDataHoraInicio())) {
            return Optional.of(missao.getDataHoraFim());
        }
        return Optional.ofNullable(missao.getDataHoraInicio());
    }

    private String descricaoDadosMissao(Missao missao) {
        return "Destino: %s | Setor: %s | Solicitante: %s".formatted(
                valorOuTraco(missao.getLocalDestino()),
                valorOuTraco(missao.getSetorSolicitante()),
                valorOuTraco(missao.getSolicitanteNome())
        );
    }

    private String tituloInicioMissao(Missao missao) {
        return missao.getTipoDeslocamento() == TipoDeslocamentoMissao.VIAGEM
                ? "Viagem iniciada"
                : "Missao iniciada";
    }

    private String tituloFimMissao(Missao missao) {
        return missao.getTipoDeslocamento() == TipoDeslocamentoMissao.VIAGEM
                ? "Viagem finalizada"
                : "Missao finalizada";
    }

    private String nomeResponsavelAberturaMissao(Missao missao) {
        return missao.getAdministradorAbertura() != null
                ? missao.getAdministradorAbertura().getNome()
                : missao.getMotorista().getNome();
    }

    private String nomeResponsavelEncerramentoMissao(Missao missao) {
        return missao.getAdministradorEncerramento() != null
                ? missao.getAdministradorEncerramento().getNome()
                : missao.getMotorista().getNome();
    }

    private String nomeResponsavelRegularizacaoExcecao(MissaoExcecao excecao) {
        return excecao.getAdministradorEncerramento() != null
                ? excecao.getAdministradorEncerramento().getNome()
                : excecao.getMotorista().getNome();
    }

    private String labelMotivoExcecao(MotivoExcecaoMissao motivo) {
        return switch (motivo) {
            case TROCA_RAPIDA_VEICULO -> "Troca rapida de veiculo";
            case CHUVA_FORTE -> "Chuva forte";
            case URGENCIA_OPERACIONAL -> "Urgencia operacional";
            case SEM_TEMPO_OPERACIONAL -> "Sem tempo operacional";
            case FALHA_CAMERA -> "Falha da camera";
            case SEM_INTERNET -> "Sem internet";
            case SEM_CELULAR -> "Sem celular";
            case BATERIA_DESCARREGADA -> "Bateria descarregada";
            case APP_INDISPONIVEL -> "App indisponivel";
            case OUTROS -> "Outros";
        };
    }

    private String labelStatusExcecao(StatusExcecaoMissao status) {
        return switch (status) {
            case EXCECAO_ABERTA -> "Pendente";
            case ATRASADA -> "Atrasada";
            case REGULARIZADA_POR_CHECKLIST -> "Regularizada por checklist";
            case REGULARIZADA_SEM_CHECKLIST -> "Regularizada sem checklist";
            case ENCERRADA_ADMIN -> "Regularizada pelo admin";
        };
    }

    private String valorOuTraco(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }

    private boolean isAjusteHorarioMissao(AuditoriaMissao auditoria) {
        return "dataHoraInicio".equals(auditoria.getCampoAlterado()) || "dataHoraFim".equals(auditoria.getCampoAlterado());
    }

    private boolean isEdicaoAdministrativaMissao(AuditoriaMissao auditoria) {
        return auditoria.getCampoAlterado() != null && !isAjusteHorarioMissao(auditoria);
    }

    private String descricaoCampoHorario(String campo) {
        return switch (campo) {
            case "dataHoraInicio" -> "Data/hora de inicio corrigida";
            case "dataHoraFim" -> "Data/hora de fim corrigida";
            default -> "Horario corrigido";
        };
    }

    private String labelCampoEdicaoMissao(String campo) {
        return switch (campo) {
            case "motorista" -> "Motorista corrigido";
            case "veiculo" -> "Veiculo corrigido";
            case "justificativaContingenciaAbertura" -> "Justificativa do registro manual corrigida";
            case "justificativaContingenciaEncerramento" -> "Justificativa do encerramento manual corrigida";
            case "localDestino" -> "Destino corrigido";
            case "setorSolicitante" -> "Setor solicitante corrigido";
            case "solicitanteNome" -> "Quem solicitou corrigido";
            case "statusDocumental" -> "Status dos dados da missao atualizado";
            default -> "Campo da missao ajustado";
        };
    }
}
