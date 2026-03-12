package com.frota.checklist.service;

import com.frota.checklist.entity.TipoFoto;
import com.frota.checklist.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Set<String> EXTENSOES_PERMITIDAS = Set.of("jpg", "jpeg", "png", "webp");

    @Value("${app.upload.base-dir}")
    private String uploadBaseDir;

    public String salvarFoto(MultipartFile file, TipoFoto tipoFoto, Long motoristaId) {
        validarArquivo(file, tipoFoto);

        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = extrairExtensao(originalName);
        String nomeUnico = motoristaId + "_" + tipoFoto.name().toLowerCase(Locale.ROOT) + "_" + UUID.randomUUID() + "." + ext;

        Path targetDir = Path.of(uploadBaseDir, "checklists");
        Path target = targetDir.resolve(nomeUnico);

        try {
            Files.createDirectories(targetDir);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BusinessException("Falha ao salvar arquivo: " + tipoFoto.name());
        }

        return "/uploads/checklists/" + nomeUnico;
    }

    public String salvarFotoVistoriaCompleta(MultipartFile file, String categoriaArquivo, Long motoristaId) {
        validarArquivoGenerico(file, categoriaArquivo);

        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = extrairExtensao(originalName);
        String nomeUnico = motoristaId + "_" + categoriaArquivo.toLowerCase(Locale.ROOT) + "_" + UUID.randomUUID() + "." + ext;

        Path targetDir = Path.of(uploadBaseDir, "vistorias-completas");
        Path target = targetDir.resolve(nomeUnico);

        try {
            Files.createDirectories(targetDir);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BusinessException("Falha ao salvar arquivo da vistoria completa: " + categoriaArquivo);
        }

        return "/uploads/vistorias-completas/" + nomeUnico;
    }

    private void validarArquivo(MultipartFile file, TipoFoto tipoFoto) {
        validarArquivoGenerico(file, tipoFoto.name());
    }

    private void validarArquivoGenerico(MultipartFile file, String nomeCampo) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Arquivo obrigatorio nao enviado: " + nomeCampo);
        }
        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = extrairExtensao(originalName);
        if (!EXTENSOES_PERMITIDAS.contains(ext.toLowerCase(Locale.ROOT))) {
            throw new BusinessException("Formato invalido para " + nomeCampo + ". Use jpg, jpeg, png ou webp");
        }
    }

    private String extrairExtensao(String fileName) {
        int idx = fileName.lastIndexOf('.');
        if (idx < 0 || idx == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(idx + 1);
    }
}
