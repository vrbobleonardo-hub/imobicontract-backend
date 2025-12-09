import { Router } from 'express';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { findInspectionById } from '../../infra/repositories/inspectionRepository';
import { getCurrentUserIdDev } from '../../middleware/authDev';

// Constantes de layout para manter espaçamento e margens consistentes (estilo clean).
const PAGE_MARGIN = 50;
const LINE_GAP = 6;
const SECTION_GAP = 18;
const PHOTO_MAX_HEIGHT = 260;
const PHOTO_MAX_WIDTH = 500;

const router = Router();

router.get('/api/inspections/:id/report-pdf', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID inválido.' } });
    }

    const inspection = await findInspectionById(userId, id);
    if (!inspection) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vistoria não encontrada.' } });
    }

    // Normaliza aiJson em laudo rico ou fallback básico
    let report: any = {};
    if (inspection.aiJson && typeof inspection.aiJson === 'object') {
      report = inspection.aiJson;
    }

    const header = report.header || {
      tipoVistoria: report.tipoVistoria || 'VISTORIA_AVULSA',
      data: inspection.data || new Date().toISOString(),
      cidadeUf: 'não informada',
      enderecoImovel: inspection.endereco,
      locadores: ['não informado'],
      locatarios: ['não informado'],
      objetoVistoria: inspection.endereco,
    };

    const resumoGeral = report.resumoGeral || inspection.aiSummary || 'Resumo não disponível.';
    const ambientes = report.ambientes || [];
    const fotos = report.fotos || report.foto || report.photos || [];

    const marginLeft = PAGE_MARGIN;
    const marginTop = PAGE_MARGIN;

    const imageBufferFromDataUrl = async (dataUrl?: string): Promise<Buffer | null> => {
      if (!dataUrl || typeof dataUrl !== 'string') return null;
      if (!dataUrl.startsWith('data:image/')) return null;
      const [meta, base64Part] = dataUrl.split(',');
      if (!meta || !base64Part) return null;
      const mimeMatch = meta.match(/data:(image\/[a-zA-Z0-9.+-]+);base64/);
      const mime = mimeMatch?.[1];
      if (!mime) return null;

      const buffer = Buffer.from(base64Part, 'base64');

      // pdfkit não suporta webp; convertemos para png com sharp.
      const isSupported = mime === 'image/jpeg' || mime === 'image/png';
      if (isSupported) return buffer;

      if (mime === 'image/webp') {
        try {
          const converted = await sharp(buffer).toFormat('png').toBuffer();
          return converted;
        } catch (err) {
          console.warn('[inspectionReportPdf] erro ao converter WEBP para PNG:', err);
          return null;
        }
      }

      console.warn(`[inspectionReportPdf] imagem ignorada: formato não suportado: ${mime}`);
      return null;
    };

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
    });
    const contentWidth = doc.page.width - PAGE_MARGIN * 2;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Laudo-Vistoria-${inspection.endereco.replace(/\s+/g, '-')}.pdf"`
    );
    doc.pipe(res);

    // Cabeçalho principal
    doc.font('Helvetica-Bold').fontSize(20).text('Laudo de Vistoria', { align: 'left', width: contentWidth });
    doc.moveDown(0.5);

    doc
      .font('Helvetica')
      .fontSize(12)
      .text(`Endereço: ${header.enderecoImovel || inspection.endereco}`, { width: contentWidth })
      .text(`Tipo de vistoria: ${header.tipoVistoria}`, { width: contentWidth })
      .text(`Data: ${header.data}`, { width: contentWidth })
      .text(`Cidade/UF: ${header.cidadeUf}`, { width: contentWidth })
      .text(`Locador(es): ${(header.locadores || []).join(', ')}`, { width: contentWidth })
      .text(`Locatário(s): ${(header.locatarios || []).join(', ')}`, { width: contentWidth })
      .text(`Objeto da vistoria: ${header.objetoVistoria}`, { width: contentWidth });
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(15).text('Resumo geral', { width: contentWidth });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(12).text(resumoGeral || 'Não informado', { align: 'left', width: contentWidth });
    doc.moveDown();

    if (ambientes.length) {
      doc.font('Helvetica-Bold').fontSize(15).text('Ambientes analisados', { width: contentWidth });
      doc.moveDown(0.5);
      ambientes.forEach((amb: any) => {
        doc.font('Helvetica-Bold').fontSize(13).text(amb.ambiente || 'Ambiente', { width: contentWidth });
        doc.font('Helvetica').fontSize(11).text(amb.resumoAmbiente || '', { align: 'left', width: contentWidth });
        doc.moveDown(0.2);
        (amb.itens || []).forEach((item: any) => {
          doc.font('Helvetica').fontSize(11).text(`- ${item.item || 'Item'}: ${item.estadoGeral || ''}`, { width: contentWidth });
          if (item.descricaoDanos) doc.text(`  Problema: ${item.descricaoDanos}`, { width: contentWidth });
          if (item.possiveisCausas) doc.text(`  Possíveis causas: ${item.possiveisCausas}`, { width: contentWidth });
          if (item.riscosSeNaoTratar) doc.text(`  Riscos: ${item.riscosSeNaoTratar}`, { width: contentWidth });
          if (item.acaoRecomendada) doc.text(`  Ação recomendada: ${item.acaoRecomendada}`, { width: contentWidth });
          doc.moveDown(0.2);
        });
        doc.moveDown(0.6);
      });
    }

    if (fotos.length) {
      // Começa a seção de fotos em uma nova página para evitar sobreposição.
      doc.addPage();
      doc.font('Helvetica-Bold').fontSize(16).text('Fotos da vistoria', { width: contentWidth });
      doc.moveDown(1);

    for (let idx = 0; idx < fotos.length; idx++) {
      const f = fotos[idx];

      // Estima a altura do bloco (título + textos + foto). Se não couber, nova página.
      const descriptionText = f.resumoCurto || f.descricaoDanos || '';
      const severityText = f.severidade ? `Severidade: ${f.severidade}` : '';
      const riskText = f.riscosSeNaoTratar ? `Risco: ${f.riscosSeNaoTratar}` : '';
      const actionText = f.acaoRecomendada ? `Ação recomendada: ${f.acaoRecomendada}` : '';
      const textForHeight = [descriptionText, severityText, riskText, actionText].filter(Boolean).join('\n');
      const textHeight = doc.heightOfString(textForHeight || ' ', { width: contentWidth, align: 'left' });
      const estimatedBlock = SECTION_GAP + textHeight + PHOTO_MAX_HEIGHT + LINE_GAP * 3;
      const bottomLimit = doc.page.height - doc.page.margins.bottom;
      if (doc.y + estimatedBlock > bottomLimit) {
        doc.addPage();
        doc.y = marginTop;
      }

      try {
        const imgBuffer =
          (await imageBufferFromDataUrl(f.fileUrl)) ||
          (await imageBufferFromDataUrl(f.previewDataUrl)) ||
          (await imageBufferFromDataUrl(f.file_url));

        // Título da foto
        doc
          .font('Helvetica-Bold')
          .fontSize(16)
          .text(`Foto ${idx + 1} – Ambiente: ${f.ambiente || 'Não informado'}`, {
            width: contentWidth,
            align: 'left',
          });
        doc.moveDown(0.6);

        // Legendas/textos
        const label = (title: string, content?: string) => {
          doc.font('Helvetica-Bold').fontSize(11).text(`${title}: `, marginLeft, doc.y, {
            continued: true,
            width: contentWidth,
          });
          doc.font('Helvetica').fontSize(11).text(content || '—', { width: contentWidth });
        };

        label('Descrição', descriptionText || undefined);
        if (severityText) label('Severidade', f.severidade);
        if (riskText) label('Risco', f.riscosSeNaoTratar);
        if (actionText) label('Ação recomendada', f.acaoRecomendada);

        doc.moveDown(0.8);

        // Posiciona a imagem logo abaixo dos textos, sem coordenadas fixas.
        const imageY = doc.y;
        if (imgBuffer) {
          const imageX = PAGE_MARGIN; // alinhado ao início da área útil
          doc.image(imgBuffer, imageX, imageY, {
            fit: [PHOTO_MAX_WIDTH, PHOTO_MAX_HEIGHT],
            align: 'center',
            valign: 'top',
          });
        } else {
          doc.font('Helvetica-Oblique').fontSize(11).text('(Prévia da foto indisponível)', marginLeft, doc.y);
        }

        // Avança o cursor para depois da imagem, preservando o fluxo vertical.
        doc.y = imageY + PHOTO_MAX_HEIGHT + LINE_GAP;

        // Linha separadora discreta entre blocos
        doc
          .moveTo(PAGE_MARGIN, doc.y)
          .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
          .strokeColor('#dddddd')
          .stroke();

        doc.moveDown(1.2);
      } catch (err) {
        console.warn(`[inspectionReportPdf] erro ao renderizar foto ${idx + 1}:`, err);
        doc.moveDown(0.6);
      }
    }
    }

    doc.end();
    return;
  } catch (err) {
    // Se falhar antes de pipar o PDF, delega pro middleware padrão.
    next(err);
  }
});

export default router;
