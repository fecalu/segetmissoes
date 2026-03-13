package com.frota.checklist.service;

import com.frota.checklist.dto.VeiculoResponse;
import com.frota.checklist.entity.RegistroUsoExternoVeiculo;
import com.frota.checklist.entity.RegistroViagemVeiculo;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.entity.VistoriaCompleta;
import com.frota.checklist.repository.RegistroViagemVeiculoRepository;
import com.frota.checklist.repository.RegistroUsoExternoVeiculoRepository;
import com.frota.checklist.repository.VeiculoRepository;
import com.frota.checklist.repository.VistoriaCompletaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VeiculoService {

    private final VeiculoRepository veiculoRepository;
    private final RegistroViagemVeiculoRepository registroViagemVeiculoRepository;
    private final RegistroUsoExternoVeiculoRepository registroUsoExternoVeiculoRepository;
    private final VistoriaCompletaRepository vistoriaCompletaRepository;
    private final VeiculoStatusResolver veiculoStatusResolver;
    private final ConfiguracaoRotuloStatusVeiculoService configuracaoRotuloStatusVeiculoService;

    public List<VeiculoResponse> listar() {
        List<Veiculo> veiculos = veiculoRepository.findAll(Sort.by(Sort.Direction.ASC, "placa")).stream()
                .filter(v -> !Boolean.TRUE.equals(v.getDesativado()))
                .toList();
        Map<Long, VeiculoStatusSnapshot> snapshots = veiculoStatusResolver.resolverPorVeiculos(veiculos);
        Map<Long, RegistroViagemVeiculo> viagensAtivas = carregarViagensAtivasPorVeiculo(veiculos);
        Map<Long, RegistroUsoExternoVeiculo> usosExternosAtivos = carregarUsosExternosAtivosPorVeiculo(veiculos);
        Map<Long, VistoriaCompleta> vistoriasSaidaRecentes = carregarUltimasVistoriasSaidaPorVeiculo(veiculos);
        Map<StatusVeiculo, String> rotulos = configuracaoRotuloStatusVeiculoService.mapaRotulosAtuais();
        return veiculos.stream()
                .map(v -> toResponse(v, snapshots.get(v.getId()), rotulos, viagensAtivas.get(v.getId()), usosExternosAtivos.get(v.getId()), vistoriasSaidaRecentes.get(v.getId())))
                .toList();
    }

    private VeiculoResponse toResponse(
            Veiculo veiculo,
            VeiculoStatusSnapshot snapshot,
            Map<StatusVeiculo, String> rotulos,
            RegistroViagemVeiculo viagemAtiva,
            RegistroUsoExternoVeiculo usoExternoAtivo,
            VistoriaCompleta vistoriaSaidaRecente
    ) {
        StatusVeiculo statusAutomaticoEfetivo = snapshot.statusAutomatico();
        Long motoristaAtualIdEfetivo = snapshot.motoristaAtualId();
        String motoristaAtualNomeEfetivo = snapshot.motoristaAtualNome();
        if (snapshot.statusAtual() == StatusVeiculo.EM_VIAGEM && viagemAtiva != null && motoristaAtualIdEfetivo == null) {
            statusAutomaticoEfetivo = StatusVeiculo.EM_VIAGEM;
            motoristaAtualIdEfetivo = viagemAtiva.getMotorista().getId();
            motoristaAtualNomeEfetivo = viagemAtiva.getMotorista().getNome();
        }

        String statusAtualRotulo = rotulos.getOrDefault(snapshot.statusAtual(), snapshot.statusAtual().name());
        String statusAutomaticoRotulo = rotulos.getOrDefault(statusAutomaticoEfetivo, statusAutomaticoEfetivo.name());
        String statusAdministrativoRotulo = snapshot.statusAdministrativo() == null
                ? null
                : rotulos.getOrDefault(snapshot.statusAdministrativo(), snapshot.statusAdministrativo().name());

        UsoExternoContexto usoExterno = resolverUsoExternoContexto(snapshot, usoExternoAtivo, vistoriaSaidaRecente);

        return new VeiculoResponse(
                veiculo.getId(),
                veiculo.getPlaca(),
                veiculo.getModelo(),
                veiculo.getMarca(),
                Boolean.TRUE.equals(veiculo.getDesativado()),
                snapshot.statusAtual(),
                statusAutomaticoEfetivo,
                snapshot.statusAdministrativo(),
                motoristaAtualIdEfetivo,
                motoristaAtualNomeEfetivo,
                statusAtualRotulo,
                statusAutomaticoRotulo,
                statusAdministrativoRotulo,
                viagemAtiva != null ? viagemAtiva.getId() : null,
                viagemAtiva != null ? viagemAtiva.getMotorista().getId() : null,
                viagemAtiva != null ? viagemAtiva.getMotorista().getNome() : null,
                viagemAtiva != null ? viagemAtiva.getLocalDestino() : null,
                viagemAtiva != null ? viagemAtiva.getObservacao() : null,
                viagemAtiva != null ? viagemAtiva.getDataHoraSaida() : null,
                usoExterno.registroId(),
                usoExterno.nomeContraparte(),
                usoExterno.tipoUsoExterno(),
                usoExterno.observacaoSaida(),
                usoExterno.dataHoraSaida(),
                usoExterno.origem(),
                usoExterno.vistoriaId()
        );
    }

    private Map<Long, RegistroViagemVeiculo> carregarViagensAtivasPorVeiculo(List<Veiculo> veiculos) {
        if (veiculos.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = veiculos.stream().map(Veiculo::getId).toList();
        Map<Long, RegistroViagemVeiculo> viagens = new java.util.HashMap<>();
        registroViagemVeiculoRepository.findByVeiculoIdInAndDataHoraRetornoIsNull(ids)
                .forEach(viagem -> viagens.put(viagem.getVeiculo().getId(), viagem));
        return viagens;
    }

    private Map<Long, RegistroUsoExternoVeiculo> carregarUsosExternosAtivosPorVeiculo(List<Veiculo> veiculos) {
        if (veiculos.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = veiculos.stream().map(Veiculo::getId).toList();
        Map<Long, RegistroUsoExternoVeiculo> usosExternos = new java.util.HashMap<>();
        registroUsoExternoVeiculoRepository.findByVeiculoIdInAndDataHoraRetornoIsNull(ids)
                .forEach(registro -> usosExternos.put(registro.getVeiculo().getId(), registro));
        return usosExternos;
    }

    private Map<Long, VistoriaCompleta> carregarUltimasVistoriasSaidaPorVeiculo(List<Veiculo> veiculos) {
        if (veiculos.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = veiculos.stream().map(Veiculo::getId).toList();
        Map<Long, VistoriaCompleta> vistorias = new java.util.HashMap<>();
        vistoriaCompletaRepository.findByVeiculoIdInAndTipoOperacaoOrderByDataHoraDescIdDesc(ids, TipoOperacao.SAIDA)
                .forEach(vistoria -> vistorias.putIfAbsent(vistoria.getVeiculo().getId(), vistoria));
        return vistorias;
    }

    private UsoExternoContexto resolverUsoExternoContexto(
            VeiculoStatusSnapshot snapshot,
            RegistroUsoExternoVeiculo usoExternoAtivo,
            VistoriaCompleta vistoriaSaidaRecente
    ) {
        if (usoExternoAtivo != null) {
            boolean possuiVistoriaSaida = usoExternoAtivo.getVistoriaSaidaId() != null;
            return new UsoExternoContexto(
                    usoExternoAtivo.getId(),
                    usoExternoAtivo.getNomeEntreguePara(),
                    usoExternoAtivo.getTipoUsoExterno() != null ? usoExternoAtivo.getTipoUsoExterno().name() : null,
                    usoExternoAtivo.getObservacaoSaida(),
                    usoExternoAtivo.getDataHoraSaida(),
                    possuiVistoriaSaida ? "VISTORIA_COMPLETA" : "REGISTRO_MANUAL",
                    usoExternoAtivo.getVistoriaSaidaId()
            );
        }

        if (snapshot.statusAtual() == StatusVeiculo.EM_USO_EXTERNO
                && vistoriaSaidaRecente != null
                && vistoriaSaidaRecente.getTipoOperacao() == TipoOperacao.SAIDA) {
            return new UsoExternoContexto(
                    null,
                    vistoriaSaidaRecente.getNomeContraparte(),
                    vistoriaSaidaRecente.getTipoUsoExterno() != null ? vistoriaSaidaRecente.getTipoUsoExterno().name() : null,
                    vistoriaSaidaRecente.getObservacaoGeral(),
                    vistoriaSaidaRecente.getDataHora(),
                    "VISTORIA_COMPLETA",
                    vistoriaSaidaRecente.getId()
            );
        }

        if (snapshot.statusAtual() == StatusVeiculo.OFICINA || snapshot.statusAtual() == StatusVeiculo.MANUTENCAO) {
            return new UsoExternoContexto(null, null, "OFICINA", null, null, null, null);
        }

        return new UsoExternoContexto(null, null, null, null, null, null, null);
    }

    private record UsoExternoContexto(
            Long registroId,
            String nomeContraparte,
            String tipoUsoExterno,
            String observacaoSaida,
            java.time.LocalDateTime dataHoraSaida,
            String origem,
            Long vistoriaId
    ) {}
}
