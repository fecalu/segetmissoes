package com.frota.checklist.service;

import com.frota.checklist.entity.TipoFoto;
import com.frota.checklist.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
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
    private static final int VEICULO_THUMB_WIDTH = 180;
    private static final int VEICULO_THUMB_HEIGHT = 80;

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

    public String salvarImagemVeiculo(MultipartFile file, Long veiculoId, String placa) {
        validarArquivoPng(file, "imagem do veiculo");

        String nomeUnico = veiculoId + "_" + placa.toLowerCase(Locale.ROOT) + "_" + UUID.randomUUID() + ".png";
        Path targetDir = Path.of(uploadBaseDir, "veiculos");
        Path target = targetDir.resolve(nomeUnico);

        try {
            Files.createDirectories(targetDir);
            BufferedImage original = ImageIO.read(file.getInputStream());
            if (original == null) {
                throw new BusinessException("Imagem do veiculo invalida");
            }
            BufferedImage miniatura = gerarMiniaturaVeiculo(original);
            ImageIO.write(miniatura, "png", target.toFile());
        } catch (IOException e) {
            throw new BusinessException("Falha ao salvar imagem do veiculo");
        }

        return "/uploads/veiculos/" + nomeUnico;
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

    private void validarArquivoPng(MultipartFile file, String nomeCampo) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Arquivo obrigatorio nao enviado: " + nomeCampo);
        }
        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = extrairExtensao(originalName);
        if (!"png".equals(ext.toLowerCase(Locale.ROOT))) {
            throw new BusinessException("Formato invalido para " + nomeCampo + ". Use PNG");
        }
    }

    private BufferedImage gerarMiniaturaVeiculo(BufferedImage original) {
        double escala = Math.min(
                (double) VEICULO_THUMB_WIDTH / original.getWidth(),
                (double) VEICULO_THUMB_HEIGHT / original.getHeight()
        );
        escala = Math.min(escala, 1.0d);
        int largura = Math.max(1, (int) Math.round(original.getWidth() * escala));
        int altura = Math.max(1, (int) Math.round(original.getHeight() * escala));

        BufferedImage miniatura = new BufferedImage(VEICULO_THUMB_WIDTH, VEICULO_THUMB_HEIGHT, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = miniatura.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            int x = (VEICULO_THUMB_WIDTH - largura) / 2;
            int y = (VEICULO_THUMB_HEIGHT - altura) / 2;
            graphics.drawImage(original, x, y, largura, altura, null);
        } finally {
            graphics.dispose();
        }
        return miniatura;
    }

    private String extrairExtensao(String fileName) {
        int idx = fileName.lastIndexOf('.');
        if (idx < 0 || idx == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(idx + 1);
    }
}
