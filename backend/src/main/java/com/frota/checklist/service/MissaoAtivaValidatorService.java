package com.frota.checklist.service;

import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.repository.VeiculoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MissaoAtivaValidatorService {

    private final VeiculoRepository veiculoRepository;
    private final VeiculoStatusResolver veiculoStatusResolver;

    public void validarMotoristaSemMissaoAtiva(Long motoristaId) {
        Optional<MissaoAtivaInfo> missaoAtiva = buscarMissaoAtiva(motoristaId);
        if (missaoAtiva.isPresent()) {
            throw new BusinessException(
                    "Motorista ja possui missao ativa no veiculo %s. Finalize a missao atual antes de iniciar outra."
                            .formatted(missaoAtiva.get().placa())
            );
        }
    }

    public Optional<MissaoAtivaInfo> buscarMissaoAtiva(Long motoristaId) {
        if (motoristaId == null) {
            return Optional.empty();
        }

        return veiculoRepository.findAll(Sort.by(Sort.Direction.ASC, "placa")).stream()
                .map(veiculo -> new VeiculoSnapshot(veiculo, veiculoStatusResolver.resolver(veiculo)))
                .filter(item -> item.snapshot().statusAutomatico() == StatusVeiculo.CIRCULANDO
                        && motoristaId.equals(item.snapshot().motoristaAtualId()))
                .findFirst()
                .map(item -> new MissaoAtivaInfo(
                        item.veiculo().getId(),
                        item.veiculo().getPlaca(),
                        item.veiculo().getMarca(),
                        item.veiculo().getModelo()
                ));
    }

    public record MissaoAtivaInfo(Long veiculoId, String placa, String marca, String modelo) {}

    private record VeiculoSnapshot(Veiculo veiculo, VeiculoStatusSnapshot snapshot) {}
}
