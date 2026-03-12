package com.frota.checklist.service;

import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.Foto;
import com.frota.checklist.entity.MissaoExcecao;
import com.frota.checklist.entity.MotivoExcecaoMissao;
import com.frota.checklist.entity.StatusExcecaoMissao;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.entity.TipoFoto;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.repository.ChecklistRepository;
import com.frota.checklist.repository.MissaoExcecaoRepository;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RelatorioChecklistPdfService {

    private static final Logger log = LoggerFactory.getLogger(RelatorioChecklistPdfService.class);

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Color BLUE = new Color(27, 76, 148);
    private static final Color LIGHT_BLUE = new Color(232, 240, 255);
    private static final Color BORDER = new Color(209, 219, 237);
    private static final Color TEXT = new Color(30, 41, 59);

    private final ChecklistRepository checklistRepository;
    private final MissaoExcecaoRepository missaoExcecaoRepository;
    private final ResourceLoader resourceLoader;

    @Value("${app.upload.base-dir}")
    private String uploadBaseDir;

    @Transactional(readOnly = true)
    public byte[] gerar(LocalDate dataInicial, LocalDate dataFinal) {
        validarPeriodo(dataInicial, dataFinal);

        LocalDateTime inicio = dataInicial.atStartOfDay();
        LocalDateTime fim = dataFinal.atTime(23, 59, 59);
        List<Checklist> checklists = checklistRepository.buscarParaRelatorio(inicio, fim);
        List<MissaoExcecao> excecoes = missaoExcecaoRepository.buscarParaRelatorio(inicio, fim);
        List<RegistroConsultaChecklistPdf> registros = montarRegistros(checklists, excecoes);

        long total = registros.size();
        long comChecklist = registros.stream().filter(RegistroConsultaChecklistPdf::comChecklist).count();
        long semChecklist = total - comChecklist;

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 30, 30, 48, 42);
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            writer.setPageEvent(new FooterPageEvent());

            document.open();
            adicionarCabecalho(document, dataInicial, dataFinal);
            adicionarResumo(document, total, comChecklist, semChecklist);
            adicionarBlocosChecklist(document, registros);
            document.close();

            return outputStream.toByteArray();
        } catch (Exception ex) {
            log.error(
                    "Falha ao gerar PDF de consulta de checklists. dataInicial={}, dataFinal={}, total={}, comChecklist={}, semChecklist={}",
                    dataInicial, dataFinal, total, comChecklist, semChecklist, ex
            );
            throw new BusinessException("Nao foi possivel gerar o relatorio em PDF.");
        }
    }

    private void validarPeriodo(LocalDate dataInicial, LocalDate dataFinal) {
        if (dataInicial == null || dataFinal == null) {
            throw new BusinessException("Informe dataInicial e dataFinal para gerar o relatorio.");
        }
        if (dataFinal.isBefore(dataInicial)) {
            throw new BusinessException("dataFinal nao pode ser menor que dataInicial.");
        }
    }

    private void adicionarCabecalho(Document document, LocalDate dataInicial, LocalDate dataFinal) throws DocumentException {
        PdfPTable top = new PdfPTable(new float[]{1.3f, 4.7f});
        top.setWidthPercentage(100);
        top.setSpacingAfter(6);

        PdfPCell logoCell = new PdfPCell();
        logoCell.setBorder(Rectangle.NO_BORDER);
        logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        Image logo = carregarLogo();
        if (logo != null) {
            logo.scaleToFit(130, 56);
            logoCell.addElement(logo);
        }
        top.addCell(logoCell);

        PdfPCell textCell = new PdfPCell();
        textCell.setBorder(Rectangle.NO_BORDER);
        textCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        textCell.addElement(new Paragraph("SEGET", font(15, Font.BOLD, BLUE)));
        textCell.addElement(new Paragraph("Servicos Gerais e Transportes", font(11, Font.NORMAL, TEXT)));
        textCell.addElement(new Paragraph("RELATORIO DE CONSULTA DE CHECKLISTS", font(13, Font.BOLD, TEXT)));
        top.addCell(textCell);
        document.add(top);

        Paragraph infoPeriodo = new Paragraph(
                "Periodo: " + dataInicial.format(DATE_FORMATTER) + " ate " + dataFinal.format(DATE_FORMATTER),
                font(10, Font.BOLD, TEXT)
        );
        infoPeriodo.setSpacingAfter(2);
        document.add(infoPeriodo);

        Paragraph geradoEm = new Paragraph(
                "Gerado em: " + LocalDateTime.now().format(DATE_TIME_FORMATTER),
                font(9, Font.NORMAL, new Color(71, 85, 105))
        );
        geradoEm.setSpacingAfter(12);
        document.add(geradoEm);
    }

    private void adicionarResumo(Document document, long total, long comChecklist, long semChecklist) throws DocumentException {
        PdfPTable resumo = new PdfPTable(3);
        resumo.setWidthPercentage(100);
        resumo.setWidths(new float[]{1f, 1f, 1f});
        resumo.setSpacingAfter(12);

        resumo.addCell(buildResumoCell("Total de registros", String.valueOf(total)));
        resumo.addCell(buildResumoCell("Com checklist", String.valueOf(comChecklist)));
        resumo.addCell(buildResumoCell("Sem checklist", String.valueOf(semChecklist)));
        document.add(resumo);
    }

    private PdfPCell buildResumoCell(String titulo, String valor) {
        PdfPCell cell = new PdfPCell();
        cell.setBorderColor(BORDER);
        cell.setBackgroundColor(LIGHT_BLUE);
        cell.setPadding(10);
        cell.setPhrase(new Phrase(titulo + "\n" + valor, font(11, Font.BOLD, BLUE)));
        return cell;
    }

    private void adicionarBlocosChecklist(Document document, List<RegistroConsultaChecklistPdf> registros) throws DocumentException {
        if (registros.isEmpty()) {
            Paragraph empty = new Paragraph("Nenhum registro encontrado no periodo informado.", font(10, Font.NORMAL, TEXT));
            empty.setSpacingBefore(8);
            document.add(empty);
            return;
        }

        for (int i = 0; i < registros.size(); i++) {
            adicionarBlocoChecklist(document, registros.get(i));
            if (i < registros.size() - 1) {
                Paragraph separador = new Paragraph(" ", font(6, Font.NORMAL, TEXT));
                separador.setSpacingAfter(6);
                document.add(separador);
            }
        }
    }

    private void adicionarBlocoChecklist(Document document, RegistroConsultaChecklistPdf registro) throws DocumentException {
        Paragraph titulo = new Paragraph(
                "REGISTRO " + registro.idExibicao()
                        + " | " + tipoOperacaoLabel(registro.tipoOperacao())
                        + " | " + origemRegistroLabel(registro.comChecklist())
                        + " | " + registro.dataHora().format(DATE_TIME_FORMATTER),
                font(12, Font.BOLD, BLUE)
        );
        titulo.setSpacingBefore(2);
        titulo.setSpacingAfter(8);
        document.add(titulo);

        PdfPTable dados = new PdfPTable(new float[]{1.15f, 3.85f});
        dados.setWidthPercentage(100);
        dados.setSpacingAfter(12);

        adicionarLinhaDados(dados, "Veiculo", registro.veiculoDescricao());
        adicionarLinhaDados(dados, "Placa", registro.placa());
        adicionarLinhaDados(dados, "Motorista", registro.motoristaNome());
        adicionarLinhaDados(dados, "Status", registro.statusRegularizacao());
        adicionarLinhaDados(dados, "Resumo", registro.resumo());
        adicionarLinhaDados(dados, "Fotos", String.valueOf(registro.quantidadeFotos()));
        document.add(dados);

        if (!registro.comChecklist()) {
            Paragraph semFotos = new Paragraph("Registro sem fotos.", font(9, Font.NORMAL, TEXT));
            semFotos.setSpacingAfter(8);
            document.add(semFotos);
            return;
        }

        Paragraph subtitulo = new Paragraph("Fotos do checklist", font(10, Font.BOLD, TEXT));
        subtitulo.setSpacingAfter(6);
        document.add(subtitulo);

        if (registro.fotos().isEmpty()) {
            Paragraph semFotos = new Paragraph("Checklist registrado sem fotos.", font(9, Font.NORMAL, TEXT));
            semFotos.setSpacingAfter(8);
            document.add(semFotos);
            return;
        }

        PdfPTable galeria = new PdfPTable(2);
        galeria.setWidthPercentage(100);
        galeria.setWidths(new float[]{1f, 1f});
        galeria.setSpacingAfter(8);

        for (Foto foto : registro.fotos()) {
            galeria.addCell(criarCelulaFoto(foto));
        }
        if (registro.fotos().size() % 2 != 0) {
            PdfPCell vazia = new PdfPCell();
            vazia.setBorder(Rectangle.NO_BORDER);
            galeria.addCell(vazia);
        }

        document.add(galeria);
    }

    private void adicionarLinhaDados(PdfPTable tabela, String rotulo, String valor) {
        PdfPCell label = new PdfPCell(new Phrase(rotulo, font(9, Font.BOLD, BLUE)));
        label.setPadding(7);
        label.setBorderColor(BORDER);
        label.setBackgroundColor(LIGHT_BLUE);
        tabela.addCell(label);

        PdfPCell body = new PdfPCell(new Phrase(valor, font(9, Font.NORMAL, TEXT)));
        body.setPadding(7);
        body.setBorderColor(BORDER);
        tabela.addCell(body);
    }

    private PdfPCell criarCelulaFoto(Foto foto) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(6);
        cell.setBorderColor(BORDER);
        cell.setMinimumHeight(140);

        Paragraph caption = new Paragraph(tipoFotoLabel(foto.getTipoFoto()), font(9, Font.BOLD, BLUE));
        caption.setAlignment(Element.ALIGN_CENTER);
        caption.setSpacingAfter(4);
        cell.addElement(caption);

        Image imagem = carregarFotoChecklist(foto.getCaminhoArquivo());
        if (imagem != null) {
            imagem.scaleToFit(220, 115);
            imagem.setAlignment(Element.ALIGN_CENTER);
            cell.addElement(imagem);
            return cell;
        }

        Paragraph indisponivel = new Paragraph("Imagem indisponivel no PDF.", font(8.5f, Font.NORMAL, TEXT));
        indisponivel.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(indisponivel);
        return cell;
    }

    private Image carregarLogo() {
        try {
            Resource resource = resourceLoader.getResource("classpath:report/gov.png");
            if (!resource.exists()) {
                return null;
            }
            try (var inputStream = resource.getInputStream()) {
                return Image.getInstance(inputStream.readAllBytes());
            }
        } catch (Exception ex) {
            log.warn("Logo do relatorio de checklists nao carregada. causa={}:{}", ex.getClass().getSimpleName(), ex.getMessage());
            return null;
        }
    }

    private String tipoOperacaoLabel(TipoOperacao tipoOperacao) {
        return tipoOperacao == TipoOperacao.ENTRADA ? "CHEGADA" : "SAIDA";
    }

    private String origemRegistroLabel(boolean comChecklist) {
        return comChecklist ? "COM CHECKLIST" : "SEM CHECKLIST";
    }

    private List<RegistroConsultaChecklistPdf> montarRegistros(List<Checklist> checklists, List<MissaoExcecao> excecoes) {
        List<RegistroConsultaChecklistPdf> registrosChecklist = checklists.stream()
                .map(this::mapearChecklist)
                .toList();

        List<RegistroConsultaChecklistPdf> registrosExcecao = excecoes.stream()
                .flatMap(excecao -> mapearEventosExcecao(excecao).stream())
                .toList();

        return java.util.stream.Stream.concat(registrosChecklist.stream(), registrosExcecao.stream())
                .sorted(Comparator.comparing(RegistroConsultaChecklistPdf::dataHora))
                .toList();
    }

    private RegistroConsultaChecklistPdf mapearChecklist(Checklist checklist) {
        List<Foto> fotosOrdenadas = checklist.getFotos().stream()
                .sorted(Comparator.comparing(Foto::getTipoFoto))
                .toList();

        return new RegistroConsultaChecklistPdf(
                "C-" + checklist.getId(),
                checklist.getDataHora(),
                checklist.getTipoOperacao(),
                true,
                "REGULARIZADA",
                checklist.getMotorista().getNome(),
                checklist.getVeiculo().getMarca() + " " + checklist.getVeiculo().getModelo(),
                checklist.getVeiculo().getPlaca(),
                checklist.getQuilometragem() == null
                        ? "Checklist fotografico enviado."
                        : "Checklist fotografico enviado. Quilometragem: " + checklist.getQuilometragem() + " km.",
                fotosOrdenadas.size(),
                fotosOrdenadas
        );
    }

    private List<RegistroConsultaChecklistPdf> mapearEventosExcecao(MissaoExcecao excecao) {
        List<RegistroConsultaChecklistPdf> eventos = new java.util.ArrayList<>();
        if (!excecao.isSomenteEventoEncerramentoSemChecklist()) {
            eventos.add(new RegistroConsultaChecklistPdf(
                    "E-" + excecao.getId() + "-S",
                    excecao.getDataHoraAbertura(),
                    TipoOperacao.SAIDA,
                    false,
                    statusRegularizacaoExcecao(excecao),
                    excecao.getMotorista().getNome(),
                    excecao.getVeiculo().getMarca() + " " + excecao.getVeiculo().getModelo(),
                    excecao.getVeiculo().getPlaca(),
                    "Saida sem checklist. Motivo: " + motivoExcecaoLabel(excecao.getMotivo()) + ".",
                    0,
                    List.of()
            ));
        }

        boolean geraChegadaSemChecklist =
                (excecao.getStatus() == StatusExcecaoMissao.REGULARIZADA_SEM_CHECKLIST
                        || excecao.getStatus() == StatusExcecaoMissao.ENCERRADA_ADMIN)
                        && excecao.getDataHoraRegularizacao() != null;

        if (geraChegadaSemChecklist) {
            String resumo = excecao.getStatus() == StatusExcecaoMissao.ENCERRADA_ADMIN
                    ? "Chegada sem checklist regularizada por encerramento administrativo."
                    : "Chegada sem checklist registrada pelo motorista.";
            eventos.add(new RegistroConsultaChecklistPdf(
                    "E-" + excecao.getId() + "-C",
                    excecao.getDataHoraRegularizacao(),
                    TipoOperacao.ENTRADA,
                    false,
                    statusRegularizacaoExcecao(excecao),
                    excecao.getMotorista().getNome(),
                    excecao.getVeiculo().getMarca() + " " + excecao.getVeiculo().getModelo(),
                    excecao.getVeiculo().getPlaca(),
                    resumo,
                    0,
                    List.of()
            ));
        }

        return eventos;
    }

    private String statusRegularizacaoExcecao(MissaoExcecao excecao) {
        if (excecao.getStatus() == StatusExcecaoMissao.ENCERRADA_ADMIN
                || excecao.getStatus() == StatusExcecaoMissao.REGULARIZADA_POR_CHECKLIST
                || excecao.getStatus() == StatusExcecaoMissao.REGULARIZADA_SEM_CHECKLIST) {
            return "REGULARIZADA";
        }
        if (excecao.getStatus() == StatusExcecaoMissao.ATRASADA) {
            return "ATRASADA";
        }
        if (excecao.getPrazoRegularizacao() != null && LocalDateTime.now().isAfter(excecao.getPrazoRegularizacao())) {
            return "ATRASADA";
        }
        return "PENDENTE";
    }

    private String motivoExcecaoLabel(MotivoExcecaoMissao motivo) {
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

    private String tipoFotoLabel(TipoFoto tipoFoto) {
        return switch (tipoFoto) {
            case PAINEL -> "Painel";
            case ESTEPE -> "Estepe";
            case LATERAL_ESQ -> "Lateral esquerda";
            case LATERAL_DIR -> "Lateral direita";
        };
    }

    private Image carregarFotoChecklist(String caminhoArquivo) {
        try {
            Path path = resolverCaminhoFoto(caminhoArquivo);
            if (path == null || !Files.exists(path)) {
                return null;
            }
            return Image.getInstance(Files.readAllBytes(path));
        } catch (Exception ex) {
            log.warn("Foto do checklist nao carregada no PDF. caminho={} causa={}:{}", caminhoArquivo, ex.getClass().getSimpleName(), ex.getMessage());
            return null;
        }
    }

    private Path resolverCaminhoFoto(String caminhoArquivo) {
        if (caminhoArquivo == null || caminhoArquivo.isBlank()) {
            return null;
        }
        String normalized = caminhoArquivo.replace('\\', '/').trim();
        if (normalized.startsWith("/uploads/")) {
            normalized = normalized.substring("/uploads/".length());
        } else if (normalized.startsWith("uploads/")) {
            normalized = normalized.substring("uploads/".length());
        }
        return Path.of(uploadBaseDir).resolve(normalized);
    }

    private Font font(float size, int style, Color color) {
        try {
            return FontFactory.getFont(FontFactory.HELVETICA, size, style, color);
        } catch (Exception ex) {
            log.warn("Fallback de fonte no relatorio de checklists. causa={}:{}", ex.getClass().getSimpleName(), ex.getMessage());
            return new Font(Font.HELVETICA, size, style, color);
        }
    }

    private static class FooterPageEvent extends PdfPageEventHelper {
        private PdfTemplate totalTemplate;
        private BaseFont baseFont;

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            try {
                totalTemplate = writer.getDirectContent().createTemplate(40, 10);
                baseFont = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            } catch (Exception ex) {
                log.warn("Rodape PDF checklists: fallback sem fonte/template. causa={}:{}", ex.getClass().getSimpleName(), ex.getMessage());
                baseFont = null;
                totalTemplate = null;
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            try {
                if (baseFont == null || totalTemplate == null) {
                    return;
                }

                PdfContentByte cb = writer.getDirectContent();
                String texto = "Pagina " + writer.getPageNumber() + " de ";
                float textoLargura = baseFont.getWidthPoint(texto, 9);

                float x = (document.left() + document.right()) / 2;
                float y = document.bottom() - 20;

                cb.beginText();
                cb.setFontAndSize(baseFont, 9);
                cb.setTextMatrix(x - textoLargura / 2, y);
                cb.showText(texto);
                cb.endText();
                cb.addTemplate(totalTemplate, x - textoLargura / 2 + textoLargura, y);
            } catch (Exception ex) {
                log.warn("Rodape PDF checklists: falha ao escrever pagina. causa={}:{}", ex.getClass().getSimpleName(), ex.getMessage());
            }
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            try {
                if (baseFont == null || totalTemplate == null) {
                    return;
                }

                totalTemplate.beginText();
                totalTemplate.setFontAndSize(baseFont, 9);
                totalTemplate.setTextMatrix(0, 0);
                totalTemplate.showText(String.valueOf(writer.getPageNumber() - 1));
                totalTemplate.endText();
            } catch (Exception ex) {
                log.warn("Rodape PDF checklists: falha ao finalizar total de paginas. causa={}:{}", ex.getClass().getSimpleName(), ex.getMessage());
            }
        }
    }

    private record RegistroConsultaChecklistPdf(
            String idExibicao,
            LocalDateTime dataHora,
            TipoOperacao tipoOperacao,
            boolean comChecklist,
            String statusRegularizacao,
            String motoristaNome,
            String veiculoDescricao,
            String placa,
            String resumo,
            int quantidadeFotos,
            List<Foto> fotos
    ) {}
}
