package com.frota.checklist.service;

import com.frota.checklist.dto.ChecklistResponse;
import com.frota.checklist.dto.FotoResponse;
import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.Foto;
import com.frota.checklist.entity.Motorista;
import com.frota.checklist.entity.TipoFoto;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.Veiculo;
import com.frota.checklist.entity.StatusVeiculo;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.exception.NotFoundException;
import com.frota.checklist.repository.ChecklistRepository;
import com.frota.checklist.repository.MotoristaRepository;
import com.frota.checklist.repository.VeiculoRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ChecklistService {

    private final ChecklistRepository checklistRepository;
    private final VeiculoRepository veiculoRepository;
    private final MotoristaRepository motoristaRepository;
    private final FileStorageService fileStorageService;

    @Transactional
    public ChecklistResponse criarChecklist(
            Long motoristaId,
            Long veiculoId,
            TipoOperacao tipoOperacao,
            MultipartFile fotoPainel,
            MultipartFile fotoEstepe,
            MultipartFile fotoLateralEsq,
            MultipartFile fotoLateralDir
    ) {
        validarChecklist(tipoOperacao, fotoPainel, fotoEstepe, fotoLateralEsq, fotoLateralDir);

        Motorista motorista = motoristaRepository.findById(motoristaId)
                .orElseThrow(() -> new NotFoundException("Motorista nao encontrado"));
        Veiculo veiculo = veiculoRepository.findById(veiculoId)
                .orElseThrow(() -> new NotFoundException("Veiculo nao encontrado"));
        if (veiculo.getStatus() != StatusVeiculo.ATIVO) {
            throw new BusinessException("Veiculo inativo nao pode receber checklist");
        }

        Checklist checklist = new Checklist();
        checklist.setMotorista(motorista);
        checklist.setVeiculo(veiculo);
        // Quilometragem digitada foi removida do fluxo. Campo reservado para OCR futuro do painel.
        checklist.setQuilometragem(null);
        checklist.setTipoOperacao(tipoOperacao);

        Map<TipoFoto, MultipartFile> arquivos = new EnumMap<>(TipoFoto.class);
        arquivos.put(TipoFoto.PAINEL, fotoPainel);
        arquivos.put(TipoFoto.ESTEPE, fotoEstepe);
        arquivos.put(TipoFoto.LATERAL_ESQ, fotoLateralEsq);
        arquivos.put(TipoFoto.LATERAL_DIR, fotoLateralDir);

        for (Map.Entry<TipoFoto, MultipartFile> entry : arquivos.entrySet()) {
            String caminhoSalvo = fileStorageService.salvarFoto(entry.getValue(), entry.getKey(), motoristaId);
            Foto foto = new Foto();
            foto.setChecklist(checklist);
            foto.setTipoFoto(entry.getKey());
            foto.setCaminhoArquivo(caminhoSalvo);
            checklist.getFotos().add(foto);
        }

        Checklist saved = checklistRepository.save(checklist);
        return toResponse(saved);
    }

    private void validarChecklist(
            TipoOperacao tipoOperacao,
            MultipartFile fotoPainel,
            MultipartFile fotoEstepe,
            MultipartFile fotoLateralEsq,
            MultipartFile fotoLateralDir
    ) {
        if (tipoOperacao == null) {
            throw new BusinessException("Tipo de operacao e obrigatorio");
        }
        if (fotoPainel == null || fotoEstepe == null || fotoLateralEsq == null || fotoLateralDir == null) {
            throw new BusinessException("E obrigatorio enviar as 4 fotos: PAINEL, ESTEPE, LATERAL_ESQ e LATERAL_DIR");
        }
    }

    private ChecklistResponse toResponse(Checklist checklist) {
        List<FotoResponse> fotos = checklist.getFotos().stream()
                .map(f -> new FotoResponse(f.getId(), f.getTipoFoto(), f.getCaminhoArquivo()))
                .toList();

        return new ChecklistResponse(
                checklist.getId(),
                checklist.getDataHora(),
                checklist.getTipoOperacao(),
                checklist.getQuilometragem(),
                checklist.getMotorista().getId(),
                checklist.getMotorista().getNome(),
                checklist.getVeiculo().getId(),
                checklist.getVeiculo().getPlaca(),
                fotos
        );
    }
}
