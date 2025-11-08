// services/pdfService_horizontal.js
const PDFDocument = require('pdfkit');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

// === CONSTANTES DE LAYOUT HORIZONTAL (LANDSCAPE) ===
const LOGO_PATH = path.join(__dirname, '..', 'public', 'logo_contrato.png'); 
const FONT_REGULAR = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';
const MARGIN = 30;
const PAGE_WIDTH = 841.89;   // A4 landscape
const PAGE_HEIGHT = 595.28;  // A4 landscape

// === HELPERS ===

function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatShortDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatMoney(value) {
    if (value === null || value === undefined) return 'R$ 0,00';
    return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

// Gerar array de datas entre início e fim
function generateDateRange(dataInicio, dataFim) {
    const dates = [];
    const start = new Date(dataInicio + 'T00:00:00-03:00');
    const end = new Date(dataFim + 'T00:00:00-03:00');
    
    let current = new Date(start);
    while (current <= end && dates.length < 31) { // Máximo 31 dias
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

// === LAYOUT HORIZONTAL - ESTRUTURA DE TABELA ===

function drawHorizontalHeader(doc, tipoDoc, docId, empresa, cliente, pi, user) {
    let y = MARGIN;
    
    // Logo e Título
    try {
        if (fs.existsSync(LOGO_PATH)) {
            doc.image(LOGO_PATH, MARGIN, y, { width: 80, height: 40 });
        }
    } catch (err) {
        logger.error(`[PdfService] Erro ao carregar logo: ${err.message}`);
    }
    
    const docTitle = tipoDoc === 'PI' ? 'PROPOSTA INTERNA' : 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS';
    doc.fontSize(14).font(FONT_BOLD)
       .text(docTitle, MARGIN + 100, y + 5, { width: 400, align: 'center' });
    
    doc.fontSize(9).font(FONT_REGULAR)
       .text(`Nº: ${docId}`, PAGE_WIDTH - MARGIN - 120, y + 10, { width: 120, align: 'right' });
    
    y += 50;
    
    // === TABELA DE INFORMAÇÕES (HORIZONTAL) ===
    const tableX = MARGIN;
    const tableWidth = PAGE_WIDTH - (MARGIN * 2);
    const colWidth = tableWidth / 4; // 4 colunas
    
    doc.fontSize(7).font(FONT_BOLD);
    
    // Linha 1: Headers
    doc.rect(tableX, y, tableWidth, 15).stroke();
    doc.text('AGÊNCIA', tableX + 2, y + 4, { width: colWidth - 4 });
    doc.text('ANUNCIANTE', tableX + colWidth + 2, y + 4, { width: colWidth - 4 });
    doc.text('PRODUTO', tableX + (colWidth * 2) + 2, y + 4, { width: colWidth - 4 });
    doc.text('AUTORIZAÇÃO Nº', tableX + (colWidth * 3) + 2, y + 4, { width: colWidth - 4 });
    
    y += 15;
    
    // Linha 2: Dados
    doc.font(FONT_REGULAR).fontSize(7);
    doc.rect(tableX, y, tableWidth, 12).stroke();
    doc.text(empresa.nome || 'N/A', tableX + 2, y + 3, { width: colWidth - 4 });
    doc.text(cliente.nome || 'N/A', tableX + colWidth + 2, y + 3, { width: colWidth - 4 });
    doc.text(pi.produto || 'OUTDOOR', tableX + (colWidth * 2) + 2, y + 3, { width: colWidth - 4 });
    doc.text(docId, tableX + (colWidth * 3) + 2, y + 3, { width: colWidth - 4 });
    
    y += 12;
    
    // Linha 3: Headers
    doc.font(FONT_BOLD);
    doc.rect(tableX, y, tableWidth, 15).stroke();
    doc.text('ENDEREÇO', tableX + 2, y + 4, { width: colWidth - 4 });
    doc.text('ENDEREÇO', tableX + colWidth + 2, y + 4, { width: colWidth - 4 });
    doc.text('DATA EMISSÃO', tableX + (colWidth * 2) + 2, y + 4, { width: colWidth - 4 });
    doc.text('PERÍODO', tableX + (colWidth * 3) + 2, y + 4, { width: colWidth - 4 });
    
    y += 15;
    
    // Linha 4: Dados - ENDEREÇO COMPLETO
    doc.font(FONT_REGULAR);
    doc.rect(tableX, y, tableWidth, 12).stroke();
    const enderecoEmpresa = [empresa.endereco, empresa.bairro, empresa.cidade].filter(Boolean).join(', ') || 'N/A';
    const enderecoCliente = [cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean).join(', ') || 'N/A';
    doc.text(enderecoEmpresa, tableX + 2, y + 3, { width: colWidth - 4 });
    doc.text(enderecoCliente, tableX + colWidth + 2, y + 3, { width: colWidth - 4 });
    doc.text(formatDate(new Date()), tableX + (colWidth * 2) + 2, y + 3, { width: colWidth - 4 });
    doc.text(pi.descricaoPeriodo || pi.tipoPeriodo || 'MENSAL', tableX + (colWidth * 3) + 2, y + 3, { width: colWidth - 4 });
    
    y += 12;
    
    // Linha 5: Headers - ADICIONA TELEFONES
    doc.font(FONT_BOLD);
    doc.rect(tableX, y, tableWidth, 15).stroke();
    doc.text('CNPJ / TELEFONE', tableX + 2, y + 4, { width: colWidth - 4 });
    doc.text('CNPJ / TELEFONE', tableX + colWidth + 2, y + 4, { width: colWidth - 4 });
    doc.text('RESPONSÁVEL', tableX + (colWidth * 2) + 2, y + 4, { width: colWidth - 4 });
    doc.text('SEGMENTO', tableX + (colWidth * 3) + 2, y + 4, { width: colWidth - 4 });
    
    y += 15;
    
    // Linha 6: Dados - CNPJ e TELEFONES
    doc.font(FONT_REGULAR);
    doc.rect(tableX, y, tableWidth, 15).stroke();
    const empresaInfo = `${empresa.cnpj || 'N/A'}\n${empresa.telefone || ''}`;
    const clienteInfo = `${cliente.cnpj || 'N/A'}\n${cliente.telefone || ''}`;
    doc.fontSize(6).text(empresaInfo, tableX + 2, y + 2, { width: colWidth - 4 });
    doc.text(clienteInfo, tableX + colWidth + 2, y + 2, { width: colWidth - 4 });
    doc.fontSize(7).text(cliente.responsavel || 'N/A', tableX + (colWidth * 2) + 2, y + 5, { width: colWidth - 4 });
    doc.text(cliente.segmento || 'N/A', tableX + (colWidth * 3) + 2, y + 5, { width: colWidth - 4 });
    
    y += 15;
    
    // Linha 7: Headers - ATENDIMENTO E PAGAMENTO
    doc.font(FONT_BOLD);
    doc.rect(tableX, y, tableWidth, 15).stroke();
    doc.text('CONTATO/ATENDIMENTO', tableX + 2, y + 4, { width: colWidth - 4 });
    doc.text('CONDIÇÕES DE PGTO', tableX + colWidth + 2, y + 4, { width: colWidth - 4 });
    doc.text('DATA INÍCIO', tableX + (colWidth * 2) + 2, y + 4, { width: colWidth - 4 });
    doc.text('DATA FIM', tableX + (colWidth * 3) + 2, y + 4, { width: colWidth - 4 });
    
    y += 15;
    
    // Linha 8: Dados - ATENDIMENTO E DATAS
    doc.font(FONT_REGULAR);
    doc.rect(tableX, y, tableWidth, 12).stroke();
    const contatoAtendimento = user ? `${user.nome} ${user.sobrenome || ''}`.trim() : 'Atendimento';
    doc.text(contatoAtendimento, tableX + 2, y + 3, { width: colWidth - 4 });
    doc.text(pi.formaPagamento || 'A combinar', tableX + colWidth + 2, y + 3, { width: colWidth - 4 });
    doc.text(formatDate(pi.dataInicio), tableX + (colWidth * 2) + 2, y + 3, { width: colWidth - 4 });
    doc.text(formatDate(pi.dataFim), tableX + (colWidth * 3) + 2, y + 3, { width: colWidth - 4 });
    
    y += 15;
    
    return y;
}

function drawProgramacaoTable(doc, pi, currentY) {
    const tableX = MARGIN;
    const tableWidth = PAGE_WIDTH - (MARGIN * 2);
    
    // Título da seção
    doc.fontSize(9).font(FONT_BOLD);
    doc.text('PROGRAMAÇÃO:', tableX, currentY);
    currentY += 15;
    
    // DESCRIÇÃO DA CAMPANHA
    if (pi.descricao) {
        doc.fontSize(7).font(FONT_REGULAR);
        doc.text(`Descrição: ${pi.descricao}`, tableX, currentY, { width: tableWidth });
        currentY += 12;
    }
    
    doc.fontSize(7).font(FONT_REGULAR);
    doc.text('Período de veiculação conforme programação abaixo:', tableX, currentY);
    currentY += 12;
    
    // === GRID DE DIAS (HORIZONTAL) ===
    const dates = generateDateRange(pi.dataInicio, pi.dataFim);
    const numDays = dates.length;
    
    // Colunas: PLACA + DIAS (máx 31)
    const placaColWidth = 80;
    const dayColWidth = (tableWidth - placaColWidth) / Math.min(numDays, 30);
    
    // Header: PLACA + Dias
    doc.font(FONT_BOLD).fontSize(6);
    doc.rect(tableX, currentY, placaColWidth, 20).stroke();
    doc.text('PLACA', tableX + 2, currentY + 6, { width: placaColWidth - 4, align: 'center' });
    
    // Header dos dias
    let xPos = tableX + placaColWidth;
    dates.forEach((date, idx) => {
        if (idx >= 30) return; // Limita a 30 dias
        doc.rect(xPos, currentY, dayColWidth, 20).stroke();
        doc.text(formatShortDate(date), xPos + 1, currentY + 6, { 
            width: dayColWidth - 2, 
            align: 'center' 
        });
        xPos += dayColWidth;
    });
    
    currentY += 20;
    
    // === LINHAS DAS PLACAS ===
    if (!pi.placas || pi.placas.length === 0) {
        doc.fontSize(8).font(FONT_REGULAR);
        doc.text('Nenhuma placa selecionada.', tableX + 10, currentY);
        return currentY + 20;
    }
    
    doc.font(FONT_REGULAR).fontSize(7);
    
    pi.placas.forEach((placa) => {
        const rowHeight = 25;
        
        // Verifica quebra de página
        if (currentY + rowHeight > PAGE_HEIGHT - MARGIN - 100) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: MARGIN });
            currentY = MARGIN;
        }
        
        // Coluna PLACA
        doc.rect(tableX, currentY, placaColWidth, rowHeight).stroke();
        const codigoPlaca = placa.numero_placa || placa.codigo || 'N/A';
        const regiao = placa.regiao?.nome || '';
        doc.fontSize(7).text(`${codigoPlaca}`, tableX + 2, currentY + 3, { width: placaColWidth - 4 });
        doc.fontSize(6).text(regiao, tableX + 2, currentY + 12, { width: placaColWidth - 4 });
        
        // Grid de dias (marcados)
        xPos = tableX + placaColWidth;
        dates.forEach((date, idx) => {
            if (idx >= 30) return;
            doc.rect(xPos, currentY, dayColWidth, rowHeight).stroke();
            // Marca com "X" para indicar que a placa está ativa nesse dia
            doc.fontSize(8).text('X', xPos + 1, currentY + 8, { 
                width: dayColWidth - 2, 
                align: 'center' 
            });
            xPos += dayColWidth;
        });
        
        currentY += rowHeight;
    });
    
    // RESUMO DE PLACAS
    currentY += 10;
    doc.fontSize(8).font(FONT_BOLD);
    doc.text(`TOTAL DE PLACAS: ${pi.placas.length}`, tableX, currentY);
    
    currentY += 15;
    
    return currentY;
}

function drawTotalizacao(doc, pi, currentY) {
    const tableX = MARGIN;
    const tableWidth = PAGE_WIDTH - (MARGIN * 2);
    
    // Observações
    doc.fontSize(8).font(FONT_BOLD);
    doc.text('OBSERVAÇÕES:', tableX, currentY);
    currentY += 12;
    
    doc.fontSize(7).font(FONT_REGULAR);
    const obsText = 'Produção a ser paga pelo cliente conforme orçamento fornecido pela empresa responsável pela produção.';
    doc.text(obsText, tableX, currentY, { width: tableWidth * 0.6, align: 'justify' });
    
    // Valores (tabela à direita)
    const valoresX = tableX + (tableWidth * 0.65);
    const valoresWidth = tableWidth * 0.35;
    
    let yValores = currentY;
    
    doc.fontSize(8).font(FONT_BOLD);
    
    // Linha: Valor Produção
    doc.rect(valoresX, yValores, valoresWidth, 15).stroke();
    doc.text('VALOR PRODUÇÃO:', valoresX + 5, yValores + 4, { width: valoresWidth * 0.6 });
    doc.text(formatMoney(pi.valorProducao || 0), valoresX + (valoresWidth * 0.6), yValores + 4, { 
        width: valoresWidth * 0.4 - 5, 
        align: 'right' 
    });
    yValores += 15;
    
    // Linha: Valor Veiculação
    const valorVeiculacao = (pi.valorTotal || 0) - (pi.valorProducao || 0);
    doc.rect(valoresX, yValores, valoresWidth, 15).stroke();
    doc.text('VALOR VEICULAÇÃO:', valoresX + 5, yValores + 4, { width: valoresWidth * 0.6 });
    doc.text(formatMoney(valorVeiculacao), valoresX + (valoresWidth * 0.6), yValores + 4, { 
        width: valoresWidth * 0.4 - 5, 
        align: 'right' 
    });
    yValores += 15;
    
    // Linha: Valor Total (destaque)
    doc.fontSize(9);
    doc.rect(valoresX, yValores, valoresWidth, 18).stroke();
    doc.text('VALOR TOTAL:', valoresX + 5, yValores + 5, { width: valoresWidth * 0.6 });
    doc.text(formatMoney(pi.valorTotal || 0), valoresX + (valoresWidth * 0.6), yValores + 5, { 
        width: valoresWidth * 0.4 - 5, 
        align: 'right' 
    });
    yValores += 18;
    
    // Linha: Vencimento
    doc.fontSize(8);
    doc.rect(valoresX, yValores, valoresWidth, 15).stroke();
    doc.text('VENCIMENTO:', valoresX + 5, yValores + 4, { width: valoresWidth * 0.6 });
    doc.text(formatDate(pi.dataFim), valoresX + (valoresWidth * 0.6), yValores + 4, { 
        width: valoresWidth * 0.4 - 5, 
        align: 'right' 
    });
    
    currentY = Math.max(currentY + 60, yValores + 20);
    
    return currentY;
}

function drawFooter(doc, empresa, cliente, currentY) {
    const tableX = MARGIN;
    const tableWidth = PAGE_WIDTH - (MARGIN * 2);
    
    // Verifica espaço
    if (currentY > PAGE_HEIGHT - 150) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: MARGIN });
        currentY = MARGIN;
    }
    
    // Texto legal
    doc.fontSize(6).font(FONT_REGULAR);
    const legalText = 'CONTRATO: Declaro que, neste ato, recebi e tomei ciência e concordei com o teor deste contrato, bem como as condições de pagamento e forma de negociação acima. Em caso de cancelamento pelo cliente, o mesmo pagará, a título de multa, a quantia de 30% do valor total acima ou proporcionalmente ao tempo restante até o término do contrato.';
    
    doc.text(legalText, tableX, currentY, { 
        width: tableWidth, 
        align: 'justify' 
    });
    currentY += 30;
    
    // Assinaturas (4 campos horizontais)
    const signWidth = (tableWidth - 30) / 4;
    
    doc.fontSize(7).font(FONT_REGULAR);
    
    // Linhas de assinatura
    let signY = currentY;
    for (let i = 0; i < 4; i++) {
        const xSign = tableX + (i * (signWidth + 10));
        doc.moveTo(xSign, signY).lineTo(xSign + signWidth, signY).stroke();
    }
    
    signY += 10;
    
    // Nomes
    doc.font(FONT_BOLD);
    doc.text(empresa.nome, tableX, signY, { width: signWidth, align: 'center' });
    doc.text(cliente.nome, tableX + signWidth + 10, signY, { width: signWidth, align: 'center' });
    doc.text('VEÍCULO', tableX + (signWidth + 10) * 2, signY, { width: signWidth, align: 'center' });
    doc.text('CONTATO', tableX + (signWidth + 10) * 3, signY, { width: signWidth, align: 'center' });
    
    signY += 10;
    
    // Labels
    doc.font(FONT_REGULAR).fontSize(6);
    doc.text('AGÊNCIA / CONTRATADA', tableX, signY, { width: signWidth, align: 'center' });
    doc.text('ANUNCIANTE / CONTRATANTE', tableX + signWidth + 10, signY, { width: signWidth, align: 'center' });
    doc.text('VEÍCULO / GERÊNCIA', tableX + (signWidth + 10) * 2, signY, { width: signWidth, align: 'center' });
    doc.text('CONTATO / APROVAÇÃO', tableX + (signWidth + 10) * 3, signY, { width: signWidth, align: 'center' });
}

// === FUNÇÃO PRINCIPAL ===

function generateDynamicPDF(res, pi, cliente, empresa, user, tipoDoc, contrato) {
    contrato = contrato || null;
    const docId = (tipoDoc === 'PI' ? pi._id : contrato._id).toString();
    const filename = `${tipoDoc}_${docId}_${cliente.nome.replace(/\s+/g, '_')}.pdf`;
    
    logger.info(`[PdfService] Gerando ${filename} em LANDSCAPE (horizontal)`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // LANDSCAPE MODE
    const doc = new PDFDocument({ 
        size: 'A4', 
        layout: 'landscape',  // <-- HORIZONTAL
        margin: MARGIN 
    });
    
    doc.pipe(res);

    try {
        let currentY = drawHorizontalHeader(doc, tipoDoc, docId, empresa, cliente, pi, user);
        currentY = drawProgramacaoTable(doc, pi, currentY);
        currentY = drawTotalizacao(doc, pi, currentY);
        drawFooter(doc, empresa, cliente, currentY);

        doc.end();
        logger.info(`[PdfService] PDF ${filename} gerado com sucesso em LANDSCAPE`);
        
    } catch (error) {
        logger.error(`[PdfService] Erro ao gerar PDF: ${error.message}`, { stack: error.stack });
        doc.end();
        throw error;
    }
}

// === EXPORTS ===

exports.generatePI_PDF = function(res, pi, cliente, empresa, user) {
    generateDynamicPDF(res, pi, cliente, empresa, user, 'PI');
};

exports.generateContrato_PDF = function(res, contrato, pi, cliente, empresa) {
    const dummyUser = { nome: 'Sistema', sobrenome: '' };
    generateDynamicPDF(res, pi, cliente, empresa, dummyUser, 'Contrato', contrato);
};
