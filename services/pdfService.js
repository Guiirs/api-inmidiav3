// services/pdfService.js
const PDFDocument = require('pdfkit');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

// --- CONSTANTES DE LAYOUT ---
// Caminho para o logo (VOCÊ PRECISA ADICIONAR ESTE FICHEIRO NO BACKEND)
const LOGO_PATH = path.join(__dirname, '..', 'public', 'logo_contrato.png'); 
const FONT_REGULAR = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';
const MARGIN = 50; // Margem da página

/**
 * Helper para desenhar um campo (label + valor)
 * @param {object} doc - O documento PDFKit
 * @param {string} label - O texto da etiqueta (ex: "Razão Social:")
 * @param {string} value - O valor do campo
 * @param {number} x - Posição X inicial
 * @param {number} y - Posição Y
 * @param {number} labelWidth - Largura da etiqueta (para alinhar o valor)
 */
function drawField(doc, label, value, x, y, labelWidth = 80) {
    doc.font(FONT_BOLD).text(label, x, y, { continued: false, width: labelWidth });
    doc.font(FONT_REGULAR).text(value || 'N/A', x + labelWidth, y, { width: 200 }); // 200 é a largura do valor
    // Retorna a posição Y atual (pode não ser útil se o texto quebrar linha)
}

/**
 * Helper para desenhar a secção de detalhes (com colunas)
 * @param {object} doc - O documento PDFKit
 * @param {number} y - Posição Y inicial
 * @param {object} pi - Objeto da PI
 * @param {object} cliente - Objeto do Cliente
 * @param {object} user - Objeto do Usuário
 * @param {string} docId - ID do Documento (PI ou Contrato)
 * @returns {number} - A nova posição Y após desenhar
 */
function drawDetailsSection(doc, y, pi, cliente, user, docId) {
    let currentY = y + 10;
    const col1X = MARGIN;
    const col2X = 310;
    const labelWidth = 120; // Mais espaço para "Condições de PGTO"

    doc.fontSize(10);
    
    // Linha 1
    drawField(doc, 'Título:', pi.descricao, col1X, currentY, labelWidth);
    drawField(doc, 'Autorização Nº:', docId, col2X, currentY, labelWidth);
    currentY += 20; // Ajuste o espaçamento conforme necessário

    // Linha 2
    drawField(doc, 'Produto:', 'N/A (Campo não existe)', col1X, currentY, labelWidth);
    drawField(doc, 'Data emissão:', new Date().toLocaleDateString('pt-BR'), col2X, currentY, labelWidth);
    currentY += 20;

    // Linha 3
    const periodo = `${new Date(pi.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${new Date(pi.dataFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
    drawField(doc, 'Período:', periodo, col1X, currentY, labelWidth);
    drawField(doc, 'Contato/Atendimento:', `${user.nome} ${user.sobrenome}`, col2X, currentY, labelWidth);
    currentY += 20;

    // Linha 4
    drawField(doc, 'Condições de PGTO:', pi.formaPagamento, col1X, currentY, labelWidth);
    drawField(doc, 'Segmento:', cliente.segmento, col2X, currentY, labelWidth);
    currentY += 20;

    return currentY;
}

/**
 * Função principal que desenha o layout do PDF
 * @param {object} res - O objeto de resposta do Express
 * @param {object} pi - Objeto da PI (populado)
 * @param {object} cliente - Objeto Cliente (populado)
 * @param {object} empresa - Objeto Empresa (populado)
 * @param {object} user - Objeto User
 * @param {string} tipoDoc - 'PI' ou 'Contrato'
 * @param {object} contrato - (Opcional) Objeto do Contrato
 */
function generateDynamicPDF(res, pi, cliente, empresa, user, tipoDoc, contrato = null) {
    const docId = (tipoDoc === 'PI' ? pi._id : contrato._id).toString();
    const docTitle = tipoDoc === 'PI' ? 'PROPOSTA INTERNA (PI)' : 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS';
    const filename = `${tipoDoc}_${docId}_${cliente.nome.replace(/\s+/g, '_')}.pdf`;
    
    logger.info(`[PdfService] Gerando ${filename}`);

    // Configura a resposta HTTP
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
    doc.pipe(res);

    // --- 1. CABEÇALHO ---
    try {
        if (fs.existsSync(LOGO_PATH)) {
            doc.image(LOGO_PATH, MARGIN, 40, { width: 150 });
        } else {
            doc.fontSize(10).font(FONT_REGULAR).text('LOGO NÃO ENCONTRADO', MARGIN, 50);
            logger.warn(`[PdfService] Logo não encontrado em ${LOGO_PATH}`);
        }
    } catch (err) {
        logger.error(`[PdfService] Erro ao carregar logo: ${err.message}`);
        doc.fontSize(10).font(FONT_REGULAR).text('Erro ao carregar logo', MARGIN, 50);
    }
    
    doc.fontSize(14).font(FONT_BOLD).text(docTitle, 200, 50, { align: 'right' });
    doc.fontSize(10).font(FONT_REGULAR).text(`${tipoDoc} N°: ${docId}`, 200, 70, { align: 'right' });
    
    doc.moveTo(MARGIN, 100).lineTo(doc.page.width - MARGIN, 100).stroke();
    let currentY = 115;

    // --- 2. COLUNAS (AGÊNCIA E ANUNCIANTE) ---
    const col1X = MARGIN;
    const col2X = 310;
    const labelWidth = 80;

    doc.fontSize(12).font(FONT_BOLD);
    doc.text('AGÊNCIA (Contratada):', col1X, currentY);
    doc.text('ANUNCIANTE (Contratante):', col2X, currentY);
    currentY += 20;

    doc.fontSize(9).font(FONT_REGULAR);
    
    // --- Coluna Agência (Empresa) ---
    let yAgencia = currentY;
    drawField(doc, 'Razão Social:', empresa.nome, col1X, yAgencia, labelWidth); yAgencia += 15;
    drawField(doc, 'Endereço:', empresa.endereco, col1X, yAgencia, labelWidth); yAgencia += 15;
    drawField(doc, 'Bairro:', empresa.bairro, col1X, yAgencia, labelWidth); yAgencia += 15;
    drawField(doc, 'Cidade:', empresa.cidade, col1X, yAgencia, labelWidth); yAgencia += 15;
    drawField(doc, 'CNPJ/CPF:', empresa.cnpj, col1X, yAgencia, labelWidth); yAgencia += 15;
    drawField(doc, 'Telefone:', empresa.telefone, col1X, yAgencia, labelWidth);

    // --- Coluna Anunciante (Cliente) ---
    let yAnunciante = currentY;
    drawField(doc, 'Razão Social:', cliente.nome, col2X, yAnunciante, labelWidth); yAnunciante += 15;
    drawField(doc, 'Endereço:', cliente.endereco, col2X, yAnunciante, labelWidth); yAnunciante += 15;
    drawField(doc, 'Bairro:', cliente.bairro, col2X, yAnunciante, labelWidth); yAnunciante += 15;
    drawField(doc, 'Cidade:', cliente.cidade, col2X, yAnunciante, labelWidth); yAnunciante += 15;
    drawField(doc, 'CNPJ:', cliente.cnpj, col2X, yAnunciante, labelWidth); yAnunciante += 15;
    drawField(doc, 'Responsável:', cliente.responsavel, col2X, yAnunciante, labelWidth);

    currentY = Math.max(yAgencia, yAnunciante) + 20;
    doc.moveTo(MARGIN, currentY).lineTo(doc.page.width - MARGIN, currentY).stroke();

    // --- 3. DETALHES (TÍTULO, PERÍODO, PGTO...) ---
    currentY = drawDetailsSection(doc, currentY, pi, cliente, user, docId);
    doc.moveTo(MARGIN, currentY).lineTo(doc.page.width - MARGIN, currentY).stroke();
    
    // --- 4. PROGRAMAÇÃO (PLACAS) ---
    currentY += 10;
    doc.fontSize(12).font(FONT_BOLD).text('PROGRAMAÇÃO / PLACAS SELECIONADAS:', MARGIN, currentY);
    currentY += 20;
    doc.fontSize(10).font(FONT_REGULAR);

    if (pi.placas && pi.placas.length > 0) {
        pi.placas.forEach(placa => {
            const regiao = placa.regiao?.nome || 'N/A';
            const textoPlaca = `- Placa Cód: ${placa.codigo} (Região: ${regiao})`;
            doc.text(textoPlaca, MARGIN + 15, currentY);
            currentY += 15;
        });
    } else {
        doc.text('Nenhuma placa selecionada.', MARGIN + 15, currentY);
        currentY += 15;
    }
    currentY += 10;

    // --- 5. VALOR TOTAL ---
    doc.fontSize(12).font(FONT_BOLD).text('VALOR TOTAL:', MARGIN, currentY);
    doc.font(FONT_REGULAR).text(`R$ ${pi.valorTotal.toFixed(2).replace('.', ',')}`, MARGIN + 100, currentY);
    currentY += 30;

    // --- 6. TEXTO LEGAL E ASSINATURAS ---
    // Posiciona o texto legal e as assinaturas perto do fim da página
    let bottomY = doc.page.height - 150;

    const legalText = "CONTRATO: Declaro que, neste ato, recebi e tomei ciência e concordei com o teor deste contrato, bem como as condições de pagamento e forma de negociação acima. Em caso de cancelamento o cliente, pagará, a titulo de multa, a quantia de 30% do valor acima ou proporcionalmente ao tempo restante do término do contrato. Em caso de cancelamento, será necessário envio de um documento por escrito e em papel timbrado com no mínimo 30 dias antes do cancelamento.";
    
    // Verifica se o texto legal cabe
    if (currentY > bottomY - 60) {
        // Se o conteúdo (placas) for muito grande, move o 'bottom' para baixo
        bottomY = currentY + 100;
        if (bottomY > doc.page.height - 50) {
            doc.addPage(); // Adiciona nova página se não houver espaço
            bottomY = 150;
        }
    }
    
    doc.fontSize(8).text(legalText, MARGIN, bottomY, { 
        align: 'justify', 
        width: doc.page.width - (MARGIN * 2) 
    });
    
    bottomY += 60; // Espaço após o texto legal

    // Assinaturas
    doc.fontSize(10).font(FONT_REGULAR);
    const signWidth = (doc.page.width - (MARGIN * 2) - 40) / 2; // Largura de cada assinatura
    const signX1 = MARGIN;
    const signX2 = MARGIN + signWidth + 40;

    doc.text('_____________________________________', signX1, bottomY, { width: signWidth, align: 'center' });
    doc.text(empresa.nome, signX1, bottomY + 15, { width: signWidth, align: 'center' });
    doc.text('CONTRATADA', signX1, bottomY + 30, { width: signWidth, align: 'center' });

    doc.text('_____________________________________', signX2, bottomY, { width: signWidth, align: 'center' });
    doc.text(cliente.nome, signX2, bottomY + 15, { width: signWidth, align: 'center' });
    doc.text('CONTRATANTE', signX2, bottomY + 30, { width: signWidth, align: 'center' });

    // --- FIM DO DOCUMENTO ---
    doc.end();
    logger.info(`[PdfService] PDF ${filename} enviado para stream.`);
}


/**
 * Exporta a função que gera o PDF da PI
 */
exports.generatePI_PDF = (res, pi, cliente, empresa, user) => {
    // A PI e o Contrato agora usam o mesmo layout
    generateDynamicPDF(res, pi, cliente, empresa, user, 'PI');
};


/**
 * Exporta a função que gera o PDF do Contrato
 */
exports.generateContrato_PDF = (res, contrato, pi, cliente, empresa) => {
    // Buscamos o 'user' do contrato (se precisarmos, mas não é passado)
    // Vamos usar um placeholder ou buscar o user da PI (se ele existir lá)
    // Por agora, vamos passar um user "dummy" já que não o temos no contratoService
    const dummyUser = { nome: 'Sistema', sobrenome: '' }; // TODO: Passar o user real se necessário
    
    // A PI e o Contrato agora usam o mesmo layout
    generateDynamicPDF(res, pi, cliente, empresa, dummyUser, 'Contrato', contrato);
};