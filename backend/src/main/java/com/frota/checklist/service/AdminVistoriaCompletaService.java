package com.frota.checklist.service;

import com.frota.checklist.dto.VistoriaCompletaResponse;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.entity.ResultadoVistoriaCompleta;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.VistoriaCompleta;
import com.frota.checklist.repository.VistoriaCompletaRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminVistoriaCompletaService {

    private final VistoriaCompletaRepository vistoriaCompletaRepository;
    private final VistoriaCompletaResponseMapper responseMapper;

    @Transactional
    public List<VistoriaCompletaResponse> listar(
            Long motoristaId,
            Long veiculoId,
            TipoOperacao tipoOperacao,
            ResultadoVistoriaCompleta resultado,
            LocalDate dataInicio,
            LocalDate dataFim,
            String busca
    ) {
        String buscaNormalizada = busca == null ? "" : busca.trim().toLowerCase(Locale.ROOT);

        return vistoriaCompletaRepository.findAll(Sort.by(Sort.Direction.DESC, "dataHora", "id")).stream()
                .filter(v -> motoristaId == null || v.getMotorista().getId().equals(motoristaId))
                .filter(v -> veiculoId == null || v.getVeiculo().getId().equals(veiculoId))
                .filter(v -> tipoOperacao == null || v.getTipoOperacao() == tipoOperacao)
                .filter(v -> resultado == null || v.getResultado() == resultado)
                .filter(v -> dataInicio == null || !v.getDataHora().toLocalDate().isBefore(dataInicio))
                .filter(v -> dataFim == null || !v.getDataHora().toLocalDate().isAfter(dataFim))
                .filter(v -> buscaNormalizada.isBlank() || correspondeBusca(v, buscaNormalizada))
                .map(responseMapper::toResponse)
                .toList();
    }

    @Transactional
    public VistoriaCompletaResponse atualizarContraparte(Long vistoriaId, String nomeContraparte) {
        VistoriaCompleta vistoria = vistoriaCompletaRepository.findById(vistoriaId)
                .orElseThrow(() -> new NotFoundException("Vistoria completa nao encontrada"));

        vistoria.setNomeContraparte(trimToNull(nomeContraparte));
        return responseMapper.toResponse(vistoriaCompletaRepository.save(vistoria));
    }

    private boolean correspondeBusca(VistoriaCompleta vistoria, String buscaNormalizada) {
        return vistoria.getMotorista().getNome().toLowerCase(Locale.ROOT).contains(buscaNormalizada)
                || vistoria.getMotorista().getCpf().contains(buscaNormalizada)
                || vistoria.getVeiculo().getPlaca().toLowerCase(Locale.ROOT).contains(buscaNormalizada);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
