package com.frota.checklist.service;

import com.frota.checklist.entity.Checklist;
import com.frota.checklist.entity.TipoOperacao;
import com.frota.checklist.exception.BusinessException;
import com.frota.checklist.repository.ChecklistRepository;
import com.lowagie.text.BadElementException;
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
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
    private final ResourceLoader resourceLoader;

    @Transactional(readOnly = true)
    public byte[] gerar(LocalDate dataInicial, LocalDate dataFinal) {
        validarPeriodo(dataInicial, dataFinal);

        LocalDateTime inicio = dataInicial.atStartOfDay();
        LocalDateTime fim = dataFinal.atTime(23, 59, 59);
        List<Checklist> checklists = checklistRepository.buscarParaRelatorio(inicio, fim);

        long total = checklists.size();
        long saidas = checklists.stream().filter(c -> c.getTipoOperacao() == TipoOperacao.SAIDA).count();
        long chegadas = checklists.stream().filter(c -> c.getTipoOperacao() == TipoOperacao.ENTRADA).count();

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 30, 30, 48, 42);
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            writer.setPageEvent(new FooterPageEvent());

            document.open();
            adicionarCabecalho(document, dataInicial, dataFinal);
            adicionarResumo(document, total, saidas, chegadas);
            adicionarTabela(document, checklists);
            document.close();

            return outputStream.toByteArray();
        } catch (Exception ex) {
            log.error(
                    "Falha ao gerar PDF de checklists. dataInicial={}, dataFinal={}, total={}, saidas={}, chegadas={}",
                    dataInicial, dataFinal, total, saidas, chegadas, ex
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
        textCell.addElement(new Paragraph("RELATORIO DE CHECKLISTS DE VEICULOS", font(13, Font.BOLD, TEXT)));
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

    private void adicionarResumo(Document document, long total, long saidas, long chegadas) throws DocumentException {
        PdfPTable resumo = new PdfPTable(3);
        resumo.setWidthPercentage(100);
        resumo.setWidths(new float[]{1f, 1f, 1f});
        resumo.setSpacingAfter(12);

        resumo.addCell(buildResumoCell("Total de checklists", String.valueOf(total)));
        resumo.addCell(buildResumoCell("Saidas", String.valueOf(saidas)));
        resumo.addCell(buildResumoCell("Chegadas", String.valueOf(chegadas)));
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

    private void adicionarTabela(Document document, List<Checklist> checklists) throws DocumentException {
        PdfPTable tabela = new PdfPTable(new float[]{1.8f, 2.6f, 2.6f, 1.3f, 1.6f, 1f});
        tabela.setWidthPercentage(100);

        adicionarHeaderTabela(tabela, "Data/Hora");
        adicionarHeaderTabela(tabela, "Motorista");
        adicionarHeaderTabela(tabela, "Veiculo");
        adicionarHeaderTabela(tabela, "Placa");
        adicionarHeaderTabela(tabela, "Operacao");
        adicionarHeaderTabela(tabela, "ID");

        if (checklists.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("Nenhum checklist encontrado no periodo informado.", font(10, Font.NORMAL, TEXT)));
            empty.setColspan(6);
            empty.setPadding(12);
            empty.setHorizontalAlignment(Element.ALIGN_CENTER);
            empty.setBorderColor(BORDER);
            tabela.addCell(empty);
        } else {
            for (Checklist checklist : checklists) {
                adicionarBodyTabela(tabela, checklist.getDataHora().format(DATE_TIME_FORMATTER));
                adicionarBodyTabela(tabela, checklist.getMotorista().getNome());
                adicionarBodyTabela(tabela, checklist.getVeiculo().getMarca() + " " + checklist.getVeiculo().getModelo());
                adicionarBodyTabela(tabela, checklist.getVeiculo().getPlaca());
                adicionarBodyTabela(tabela, tipoOperacaoLabel(checklist.getTipoOperacao()));
                adicionarBodyTabela(tabela, String.valueOf(checklist.getId()));
            }
        }

        document.add(tabela);
    }

    private void adicionarHeaderTabela(PdfPTable tabela, String label) {
        PdfPCell header = new PdfPCell(new Phrase(label, font(10, Font.BOLD, Color.WHITE)));
        header.setHorizontalAlignment(Element.ALIGN_CENTER);
        header.setVerticalAlignment(Element.ALIGN_MIDDLE);
        header.setPadding(8);
        header.setBorderColor(BORDER);
        header.setBackgroundColor(BLUE);
        tabela.addCell(header);
    }

    private void adicionarBodyTabela(PdfPTable tabela, String valor) {
        PdfPCell body = new PdfPCell(new Phrase(valor, font(9, Font.NORMAL, TEXT)));
        body.setPadding(7);
        body.setBorderColor(BORDER);
        body.setVerticalAlignment(Element.ALIGN_MIDDLE);
        tabela.addCell(body);
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
        } catch (IOException | BadElementException ignored) {
            return null;
        }
    }

    private String tipoOperacaoLabel(TipoOperacao tipoOperacao) {
        return tipoOperacao == TipoOperacao.ENTRADA ? "CHEGADA" : "SAIDA";
    }

    private Font font(float size, int style, Color color) {
        return FontFactory.getFont(FontFactory.HELVETICA, size, style, color);
    }

    private static class FooterPageEvent extends PdfPageEventHelper {
        private PdfTemplate totalTemplate;
        private BaseFont baseFont;

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            totalTemplate = writer.getDirectContent().createTemplate(40, 10);
            try {
                baseFont = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            } catch (DocumentException | IOException ignored) {
                baseFont = null;
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
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
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            if (baseFont == null || totalTemplate == null) {
                return;
            }

            totalTemplate.beginText();
            totalTemplate.setFontAndSize(baseFont, 9);
            totalTemplate.setTextMatrix(0, 0);
            totalTemplate.showText(String.valueOf(writer.getPageNumber() - 1));
            totalTemplate.endText();
        }
    }
}
