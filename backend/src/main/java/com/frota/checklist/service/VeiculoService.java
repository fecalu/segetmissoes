package com.frota.checklist.service;

import com.frota.checklist.dto.VeiculoResponse;
import com.frota.checklist.entity.RegistroUsoExternoVeiculo;
import com.frota.checklist.entity.RegistroViagemVeiculo;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.repository.RegistroViagemVeiculoRepository;
import com.frota.checklist.repository.RegistroUsoExternoVeiculoRepository;
import com.frota.checklist.repository.VeiculoRepository;
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
    private final VeiculoStatusResolver veiculoStatusResolver;
    private final ConfiguracaoRotuloStatusVeiculoService configuracaoRotuloStatusVeiculoService;

    public List<VeiculoResponse> listar() {
        List<Veiculo> veiculos = veiculoRepository.findAll(Sort.by(Sort.Direction.ASC, "placa")).stream()
                .filter(v -> !Boolean.TRUE.equals(v.getDesativado()))
                .toList();
        Map<Long, VeiculoStatusSnapshot> snapshots = veiculoStatusResolver.resolverPorVeiculos(veiculos);
        Map<Long, RegistroViagemVeiculo> viagensAtivas = carregarViagensAtivasPorVeiculo(veiculos);
        Map<Long, RegistroUsoExternoVeiculo> usosExternosAtivos = carregarUsosExternosAtivosPorVeiculo(veiculos);
        Map<StatusVeiculo, String> rotulos = configuracaoRotuloStatusVeiculoService.mapaRotulosAtuais();
        return veiculos.stream()
                .map(v -> toResponse(v, snapshots.get(v.getId()), rotulos, viagensAtivas.get(v.getId()), usosExternosAtivos.get(v.getId())))
                .toList();
    }

    private VeiculoResponse toResponse(
            Veiculo veiculo,
            VeiculoStatusSnapshot snapshot,
            Map<StatusVeiculo, String> rotulos,
            RegistroViagemVeiculo viagemAtiva,
            RegistroUsoExternoVeiculo usoExternoAtivo
    ) {
        String statusAtualRotulo = rotulos.getOrDefault(snapshot.statusAtual(), snapshot.statusAtual().name());
        String statusAutomaticoRotulo = rotulos.getOrDefault(snapshot.statusAutomatico(), snapshot.statusAutomatico().name());
        String statusAdministrativoRotulo = snapshot.statusAdministrativo() == null
                ? null
                : rotulos.getOrDefault(snapshot.statusAdministrativo(), snapshot.statusAdministrativo().name());

        return new VeiculoResponse(
                veiculo.getId(),
                veiculo.getPlaca(),
                veiculo.getModelo(),
                veiculo.getMarca(),
                Boolean.TRUE.equals(veiculo.getDesativado()),
                snapshot.statusAtual(),
                snapshot.statusAutomatico(),
                snapshot.statusAdministrativo(),
                snapshot.motoristaAtualId(),
                snapshot.motoristaAtualNome(),
                statusAtualRotulo,
                statusAutomaticoRotulo,
                statusAdministrativoRotulo,
                viagemAtiva != null ? viagemAtiva.getId() : null,
                viagemAtiva != null ? viagemAtiva.getMotorista().getId() : null,
                viagemAtiva != null ? viagemAtiva.getMotorista().getNome() : null,
                viagemAtiva != null ? viagemAtiva.getLocalDestino() : null,
                viagemAtiva != null ? viagemAtiva.getObservacao() : null,
                viagemAtiva != null ? viagemAtiva.getDataHoraSaida() : null,
                usoExternoAtivo != null ? usoExternoAtivo.getId() : null,
                usoExternoAtivo != null ? usoExternoAtivo.getNomeEntreguePara() : null,
                usoExternoAtivo != null ? usoExternoAtivo.getObservacaoSaida() : null,
                usoExternoAtivo != null ? usoExternoAtivo.getDataHoraSaida() : null
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
}
