package com.frota.checklist.service;

import com.frota.checklist.entity.Missao;
import com.frota.checklist.entity.StatusMissao;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.repository.MissaoRepository;
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
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RelatorioMissaoPdfService {

    private static final Logger log = LoggerFactory.getLogger(RelatorioMissaoPdfService.class);

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Color BLUE = new Color(27, 76, 148);
    private static final Color LIGHT_BLUE = new Color(232, 240, 255);
    private static final Color BORDER = new Color(209, 219, 237);
    private static final Color TEXT = new Color(30, 41, 59);

    private final MissaoRepository missaoRepository;
    private final ResourceLoader resourceLoader;

    @Transactional(readOnly = true)
    public byte[] gerar(LocalDate dataRelatorio) {
        if (dataRelatorio == null) {
            throw new BusinessException("Informe a data do relatorio.");
        }

        LocalDateTime inicio = dataRelatorio.atStartOfDay();
        LocalDateTime fim = dataRelatorio.atTime(23, 59, 59);
        List<Missao> missoes = missaoRepository.buscarParaRelatorio(inicio, fim);

        long total = missoes.size();
        long finalizadas = missoes.stream().filter(m -> m.getStatus() == StatusMissao.FINALIZADA).count();
        long emAndamento = total - finalizadas;

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 26, 26, 48, 42);
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            writer.setPageEvent(new FooterPageEvent());

            document.open();
            adicionarCabecalho(document, dataRelatorio, total, finalizadas, emAndamento);
            adicionarTabela(document, missoes);
            document.close();
            return outputStream.toByteArray();
        } catch (Exception ex) {
            log.error(
                    "Falha ao gerar PDF de missoes. dataRelatorio={}, total={}, finalizadas={}, emAndamento={}",
                    dataRelatorio, total, finalizadas, emAndamento, ex
            );
            throw new BusinessException("Nao foi possivel gerar o relatorio em PDF das missoes.");
        }
    }

    private void adicionarCabecalho(
            Document document,
            LocalDate dataRelatorio,
            long total,
            long finalizadas,
            long emAndamento
    ) throws DocumentException {
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
        textCell.addElement(new Paragraph("RELATORIO DIARIO DE MISSOES", font(13, Font.BOLD, TEXT)));
        top.addCell(textCell);
        document.add(top);

        Paragraph data = new Paragraph("Data do relatorio: " + dataRelatorio.format(DATE_FORMATTER), font(10, Font.BOLD, TEXT));
        data.setSpacingAfter(2);
        document.add(data);

        Paragraph geradoEm = new Paragraph("Gerado em: " + LocalDateTime.now().format(DATE_TIME_FORMATTER), font(9, Font.NORMAL, new Color(71, 85, 105)));
        geradoEm.setSpacingAfter(8);
        document.add(geradoEm);

        PdfPTable resumo = new PdfPTable(3);
        resumo.setWidthPercentage(100);
        resumo.setWidths(new float[]{1f, 1f, 1f});
        resumo.setSpacingAfter(12);
        resumo.addCell(buildResumoCell("Total de missoes", String.valueOf(total)));
        resumo.addCell(buildResumoCell("Finalizadas", String.valueOf(finalizadas)));
        resumo.addCell(buildResumoCell("Em andamento", String.valueOf(emAndamento)));
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

    private void adicionarTabela(Document document, List<Missao> missoes) throws DocumentException {
        PdfPTable tabela = new PdfPTable(new float[]{2.2f, 1.6f, 4.95f, 1.2f, 1.2f});
        tabela.setWidthPercentage(100);

        adicionarHeaderTabela(tabela, "Veiculo");
        adicionarHeaderTabela(tabela, "Motorista");
        adicionarHeaderTabela(tabela, "Destino | Setor | Solicitante");
        adicionarHeaderTabela(tabela, "Inicio");
        adicionarHeaderTabela(tabela, "Fim");

        if (missoes.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("Nenhuma missao encontrada para o dia informado.", font(10, Font.NORMAL, TEXT)));
            empty.setColspan(5);
            empty.setPadding(12);
            empty.setHorizontalAlignment(Element.ALIGN_CENTER);
            empty.setBorderColor(BORDER);
            tabela.addCell(empty);
        } else {
            for (Missao missao : missoes) {
                adicionarBodyTabela(
                        tabela,
                        missao.getVeiculo().getPlaca()
                                + " - "
                                + missao.getVeiculo().getMarca()
                                + " "
                                + missao.getVeiculo().getModelo()
                );
                adicionarBodyTabela(tabela, missao.getMotorista().getNome());
                adicionarBodyTabela(tabela, dadosMissaoResumidos(missao));
                adicionarBodyTabela(tabela, missao.getDataHoraInicio().format(DATE_TIME_FORMATTER));
                adicionarBodyTabela(tabela, formatarChegada(missao.getDataHoraFim()));
            }
        }

        document.add(tabela);
    }

    private void adicionarHeaderTabela(PdfPTable tabela, String label) {
        PdfPCell header = new PdfPCell(new Phrase(label, font(8.5f, Font.BOLD, Color.WHITE)));
        header.setHorizontalAlignment(Element.ALIGN_CENTER);
        header.setVerticalAlignment(Element.ALIGN_MIDDLE);
        header.setPadding(7);
        header.setBorderColor(BORDER);
        header.setBackgroundColor(BLUE);
        tabela.addCell(header);
    }

    private void adicionarBodyTabela(PdfPTable tabela, String valor) {
        PdfPCell body = new PdfPCell(new Phrase(valor, font(8f, Font.NORMAL, TEXT)));
        body.setPadding(6);
        body.setBorderColor(BORDER);
        body.setVerticalAlignment(Element.ALIGN_MIDDLE);
        tabela.addCell(body);
    }

    private String formatarChegada(LocalDateTime dataHoraFim) {
        if (dataHoraFim == null) {
            return "EM ANDAMENTO";
        }
        return dataHoraFim.format(DATE_TIME_FORMATTER);
    }

    private String dadosMissaoResumidos(Missao missao) {
        String destino = valorOuTraco(missao.getLocalDestino());
        String setor = valorOuTraco(missao.getSetorSolicitante());
        String solicitante = valorOuTraco(missao.getSolicitanteNome());
        return "Destino: " + destino
                + " | Setor: " + setor
                + " | Solicitante: " + solicitante;
    }

    private String valorOuTraco(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value;
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
            log.warn("Logo do relatorio de missoes nao carregada. causa={}:{}", ex.getClass().getSimpleName(), ex.getMessage());
            return null;
        }
    }

    private Font font(float size, int style, Color color) {
        try {
            return FontFactory.getFont(FontFactory.HELVETICA, size, style, color);
        } catch (Exception ex) {
            log.warn("Fallback de fonte no relatorio de missoes. causa={}:{}", ex.getClass().getSimpleName(), ex.getMessage());
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
                log.warn("Rodape PDF missoes: fallback sem fonte/template. causa={}:{}", ex.getClass().getSimpleName(), ex.getMessage());
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
                log.warn("Rodape PDF missoes: falha ao escrever pagina. causa={}:{}", ex.getClass().getSimpleName(), ex.getMessage());
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
                log.warn("Rodape PDF missoes: falha ao finalizar total de paginas. causa={}:{}", ex.getClass().getSimpleName(), ex.getMessage());
            }
        }
    }
}
