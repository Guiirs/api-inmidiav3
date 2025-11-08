# NOVO LAYOUT PDF - IMPLEMENTAÇÃO COMPLETA

## Arquivo: services/pdfService.js

Este documento contém o código completo para substituir o arquivo `pdfService.js`.

**INSTRUÇÕES DE IMPLEMENTAÇÃO:**
1. Faça backup do arquivo atual `e:\backstage\BECKEND\services\pdfService.js`
2. Substitua o conteúdo completo pelo código abaixo
3. Salve o arquivo

---

## CÓDIGO COMPLETO DO ARQUIVO pdfService.js:

```javascript
// services/pdfService.js
const PDFDocument = require('pdfkit');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

// === CONSTANTES DE LAYOUT ===
const LOGO_PATH = path.join(__dirname, '..', 'public', 'logo_contrato.png'); 
const FONT_REGULAR = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';
const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

// === HELPERS ===

function drawField(doc, label, value, x, y, labelWidth) {
    labelWidth = labelWidth || 80;
    doc.font(FONT_BOLD).fontSize(9).text(label, x, y, { continued: false });
    doc.font(FONT_REGULAR).fontSize(9).text(value || 'N/A', x + labelWidth, y);
}

function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatMoney(value) {
    if (value === null || value === undefined) return 'R$ 0,00';
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

// === SEÇÕES DO PDF ===

function drawHeader(doc, tipoDoc, docId) {
    try {
        if (fs.existsSync(LOGO_PATH)) {
            doc.image(LOGO_PATH, MARGIN, 40, { width: 120 });
        } else {
            doc.fontSize(10).font(FONT_REGULAR).text('[LOGO]', MARGIN, 50);
            logger.warn(`[PdfService] Logo não encontrado em ${LOGO_PATH}`);
        }
    } catch (err) {
        logger.error(`[PdfService] Erro ao carregar logo: ${err.message}`);
        doc.fontSize(10).font(FONT_REGULAR).text('[LOGO]', MARGIN, 50);
    }
    
    const docTitle = tipoDoc === 'PI' ? 'PROPOSTA INTERNA (PI)' : 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS';
    doc.fontSize(16).font(FONT_BOLD).text(docTitle, 200, 45, { align: 'right' });
    doc.fontSize(10).font(FONT_REGULAR).text(`Nº: ${docId}`, 200, 65, { align: 'right' });
    
    doc.moveTo(MARGIN, 95).lineTo(PAGE_WIDTH - MARGIN, 95).stroke();
    
    return 110;
}

function drawPartiesSection(doc, empresa, cliente, currentY) {
    const col1X = MARGIN;
    const col2X = 305;
    const labelWidth = 75;

    doc.fontSize(11).font(FONT_BOLD);
    doc.text('AGÊNCIA (Contratada):', col1X, currentY);
    doc.text('ANUNCIANTE (Contratante):', col2X, currentY);
    currentY += 18;

    doc.fontSize(9).font(FONT_REGULAR);
    
    let yEmpresa = currentY;
    drawField(doc, 'Razão Social:', empresa.nome, col1X, yEmpresa, labelWidth); yEmpresa += 14;
    drawField(doc, 'Endereço:', empresa.endereco, col1X, yEmpresa, labelWidth); yEmpresa += 14;
    drawField(doc, 'Bairro:', empresa.bairro, col1X, yEmpresa, labelWidth); yEmpresa += 14;
    drawField(doc, 'Cidade:', empresa.cidade, col1X, yEmpresa, labelWidth); yEmpresa += 14;
    drawField(doc, 'CNPJ/CPF:', empresa.cnpj, col1X, yEmpresa, labelWidth); yEmpresa += 14;
    drawField(doc, 'Telefone:', empresa.telefone, col1X, yEmpresa, labelWidth);

    let yCliente = currentY;
    drawField(doc, 'Razão Social:', cliente.nome, col2X, yCliente, labelWidth); yCliente += 14;
    drawField(doc, 'Endereço:', cliente.endereco, col2X, yCliente, labelWidth); yCliente += 14;
    drawField(doc, 'Bairro:', cliente.bairro, col2X, yCliente, labelWidth); yCliente += 14;
    drawField(doc, 'Cidade:', cliente.cidade, col2X, yCliente, labelWidth); yCliente += 14;
    drawField(doc, 'CNPJ:', cliente.cnpj, col2X, yCliente, labelWidth); yCliente += 14;
    drawField(doc, 'Responsável:', cliente.responsavel, col2X, yCliente, labelWidth);

    currentY = Math.max(yEmpresa, yCliente) + 18;
    doc.moveTo(MARGIN, currentY).lineTo(PAGE_WIDTH - MARGIN, currentY).stroke();
    
    return currentY + 10;
}

function drawDetailsSection(doc, pi, cliente, user, docId, currentY) {
    const col1X = MARGIN;
    const col2X = 305;
    const labelWidth = 100;

    doc.fontSize(9);
    
    let y = currentY;
    drawField(doc, 'Título:', pi.descricao, col1X, y, labelWidth);
    drawField(doc, 'Autorização Nº:', docId, col2X, y, labelWidth);
    y += 14;

    drawField(doc, 'Produto:', pi.produto || 'OUTDOOR', col1X, y, labelWidth);
    drawField(doc, 'Data emissão:', formatDate(new Date()), col2X, y, labelWidth);
    y += 14;

    const periodo = pi.descricaoPeriodo || `${formatDate(pi.dataInicio)} a ${formatDate(pi.dataFim)}`;
    drawField(doc, 'Período:', periodo, col1X, y, labelWidth);
    drawField(doc, 'Contato/Atendimento:', `${user.nome} ${user.sobrenome}`, col2X, y, labelWidth);
    y += 14;

    drawField(doc, 'Condições de PGTO:', pi.formaPagamento || 'A combinar', col1X, y, labelWidth);
    drawField(doc, 'Segmento:', cliente.segmento || 'N/A', col2X, y, labelWidth);
    y += 18;

    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).stroke();
    
    return y + 10;
}

function drawProgramacaoSection(doc, pi, currentY) {
    doc.fontSize(11).font(FONT_BOLD);
    doc.text('PROGRAMAÇÃO:', MARGIN, currentY);
    currentY += 18;

    doc.fontSize(8).font(FONT_REGULAR);
    doc.text('Período de veiculação conforme programação abaixo:', MARGIN, currentY);
    currentY += 15;

    if (!pi.placas || pi.placas.length === 0) {
        doc.fontSize(9).text('Nenhuma placa selecionada.', MARGIN + 10, currentY);
        return currentY + 20;
    }

    const tableX = MARGIN;
    const tableWidth = PAGE_WIDTH - (MARGIN * 2);
    const colWidths = {
        placa: 60,
        descricao: tableWidth - 230,
        periodo: 120,
        valor: 50
    };

    doc.fontSize(8).font(FONT_BOLD);
    let xPos = tableX;
    
    doc.rect(tableX, currentY, tableWidth, 20).stroke();
    doc.text('PLACA', xPos + 2, currentY + 6, { width: colWidths.placa });
    xPos += colWidths.placa;
    
    doc.text('DESCRIÇÃO / LOCALIZAÇÃO', xPos + 2, currentY + 6, { width: colWidths.descricao });
    xPos += colWidths.descricao;
    
    doc.text('PERÍODO', xPos + 2, currentY + 6, { width: colWidths.periodo });
    xPos += colWidths.periodo;
    
    doc.text('VALOR', xPos + 2, currentY + 6, { width: colWidths.valor, align: 'right' });
    
    currentY += 20;

    doc.font(FONT_REGULAR);
    pi.placas.forEach((placa) => {
        const rowHeight = 30;
        
        if (currentY + rowHeight > PAGE_HEIGHT - 200) {
            doc.addPage();
            currentY = MARGIN;
        }

        xPos = tableX;
        
        doc.rect(tableX, currentY, tableWidth, rowHeight).stroke();
        
        const codigoPlaca = placa.numero_placa || placa.codigo || 'N/A';
        doc.text(codigoPlaca, xPos + 2, currentY + 10, { width: colWidths.placa - 4 });
        xPos += colWidths.placa;
        
        const regiao = placa.regiao?.nome || 'N/A';
        const localizacao = placa.nomeDaRua ? `Rua ${placa.nomeDaRua}` : 'Localização não informada';
        const tamanho = placa.tamanho ? ` - Tamanho: ${placa.tamanho}` : '';
        const descricao = `${localizacao}${tamanho}\nRegião: ${regiao}`;
        doc.fontSize(7).text(descricao, xPos + 2, currentY + 6, { width: colWidths.descricao - 4 });
        doc.fontSize(8);
        xPos += colWidths.descricao;
        
        const periodoTexto = pi.descricaoPeriodo || `${formatDate(pi.dataInicio)} a ${formatDate(pi.dataFim)}`;
        doc.fontSize(7).text(periodoTexto, xPos + 2, currentY + 10, { width: colWidths.periodo - 4 });
        doc.fontSize(8);
        xPos += colWidths.periodo;
        
        doc.text('-', xPos + 2, currentY + 10, { width: colWidths.valor - 4, align: 'right' });
        
        currentY += rowHeight;
    });

    return currentY + 10;
}

function drawTotalizacaoSection(doc, pi, currentY) {
    doc.fontSize(9).font(FONT_BOLD);
    doc.text('OBSERVAÇÕES:', MARGIN, currentY);
    currentY += 15;

    doc.fontSize(8).font(FONT_REGULAR);
    const obsText = 'Produção a ser paga pelo cliente conforme orçamento fornecido pela empresa responsável pela produção.';
    doc.text(obsText, MARGIN + 10, currentY, { width: PAGE_WIDTH - MARGIN * 2 - 20, align: 'justify' });
    currentY += 25;

    const totalsX = PAGE_WIDTH - MARGIN - 200;
    doc.fontSize(9).font(FONT_BOLD);
    
    drawField(doc, 'VALOR PRODUÇÃO:', formatMoney(pi.valorProducao || 0), totalsX, currentY, 120);
    currentY += 14;
    
    const valorVeiculacao = pi.valorTotal - (pi.valorProducao || 0);
    drawField(doc, 'VALOR VEICULAÇÃO:', formatMoney(valorVeiculacao), totalsX, currentY, 120);
    currentY += 14;
    
    doc.fontSize(10);
    drawField(doc, 'VALOR TOTAL:', formatMoney(pi.valorTotal), totalsX, currentY, 120);
    currentY += 18;

    doc.fontSize(9);
    drawField(doc, 'VENCIMENTO:', formatDate(pi.dataFim), totalsX, currentY, 120);
    currentY += 25;

    return currentY;
}

function drawFooterSection(doc, empresa, cliente, currentY) {
    if (currentY > PAGE_HEIGHT - 220) {
        doc.addPage();
        currentY = MARGIN;
    }

    doc.fontSize(7).font(FONT_REGULAR);
    const legalText = 'CONTRATO: Declaro que, neste ato, recebi e tomei ciência e concordei com o teor deste contrato, bem como as condições de pagamento e forma de negociação acima. Em caso de cancelamento pelo cliente, o mesmo pagará, a título de multa, a quantia de 30% do valor total acima ou proporcionalmente ao tempo restante até o término do contrato. Em caso de cancelamento, será necessário envio de documento por escrito em papel timbrado com no mínimo 30 dias de antecedência antes do cancelamento. O não cumprimento das obrigações de pagamento pelo contratante implicará em multa de 2% ao mês sobre o valor em atraso, além de juros de mora de 1% ao mês. A inadimplência superior a 30 dias acarretará a suspensão imediata da veiculação.';
    
    doc.text(legalText, MARGIN, currentY, { 
        width: PAGE_WIDTH - (MARGIN * 2), 
        align: 'justify' 
    });
    currentY += 50;

    const signWidth = (PAGE_WIDTH - (MARGIN * 2) - 30) / 2;
    const signX1 = MARGIN;
    const signX2 = MARGIN + signWidth + 30;

    doc.fontSize(8).font(FONT_REGULAR);
    
    let signY = currentY;
    doc.text('_____________________________________', signX1, signY, { width: signWidth, align: 'center' });
    doc.text('_____________________________________', signX2, signY, { width: signWidth, align: 'center' });
    signY += 12;
    
    doc.font(FONT_BOLD).text(empresa.nome, signX1, signY, { width: signWidth, align: 'center' });
    doc.text(cliente.nome, signX2, signY, { width: signWidth, align: 'center' });
    signY += 10;
    
    doc.font(FONT_REGULAR).text('AGÊNCIA / CONTRATADA', signX1, signY, { width: signWidth, align: 'center' });
    doc.text('ANUNCIANTE / CONTRATANTE', signX2, signY, { width: signWidth, align: 'center' });
    
    signY += 30;
    
    doc.text('_____________________________________', signX1, signY, { width: signWidth, align: 'center' });
    doc.text('_____________________________________', signX2, signY, { width: signWidth, align: 'center' });
    signY += 12;
    
    doc.text('VEÍCULO / GERÊNCIA', signX1, signY, { width: signWidth, align: 'center' });
    doc.text('CONTATO / APROVAÇÃO', signX2, signY, { width: signWidth, align: 'center' });
}

// === FUNÇÃO PRINCIPAL ===

function generateDynamicPDF(res, pi, cliente, empresa, user, tipoDoc, contrato) {
    contrato = contrato || null;
    const docId = (tipoDoc === 'PI' ? pi._id : contrato._id).toString();
    const filename = `${tipoDoc}_${docId}_${cliente.nome.replace(/\s+/g, '_')}.pdf`;
    
    logger.info(`[PdfService] Gerando ${filename} com layout XLSX completo`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
    doc.pipe(res);

    try {
        let currentY = drawHeader(doc, tipoDoc, docId);
        currentY = drawPartiesSection(doc, empresa, cliente, currentY);
        currentY = drawDetailsSection(doc, pi, cliente, user, docId, currentY);
        currentY = drawProgramacaoSection(doc, pi, currentY);
        currentY = drawTotalizacaoSection(doc, pi, currentY);
        drawFooterSection(doc, empresa, cliente, currentY);

        doc.end();
        logger.info(`[PdfService] PDF ${filename} gerado com sucesso`);
        
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
```

---

## RESUMO DAS ALTERAÇÕES REALIZADAS

### 1. Modelo PropostaInterna.js ✅
- Adicionado campo `produto` (String, default: 'OUTDOOR')
- Adicionado campo `descricaoPeriodo` (String)
- Adicionado campo `valorProducao` (Number, default: 0)

### 2. Service piService.js ✅
- Atualizado método `getById` para incluir `nomeDaRua` e `tamanho` no populate de placas

### 3. Service pdfService.js (PENDENTE - código acima)
- Layout completamente refatorado baseado no CONTRATO.xlsx
- Cabeçalho com logo e título profissional
- Seção de Agência e Anunciante em 2 colunas
- Seção de detalhes com novos campos (produto, descricaoPeriodo)
- Tabela de programação com grid de placas
- Totalização com VALOR PRODUÇÃO, VALOR VEICULAÇÃO e VALOR TOTAL
- Texto legal atualizado conforme XLSX
- 4 assinaturas: Agência, Anunciante, Veículo/Gerência, Contato/Aprovação

## PRÓXIMOS PASSOS

1. Substituir o arquivo `services/pdfService.js` pelo código acima
2. Reiniciar o servidor Node.js
3. Testar geração de PDF através do endpoint `GET /api/v1/pis/:id/download`
4. Verificar se o layout corresponde ao CONTRATO.xlsx

## NOTAS IMPORTANTES

- O arquivo original foi salvo como backup antes das alterações
- Os novos campos no modelo PropostaInterna são opcionais (possuem defaults)
- PIs antigas continuarão funcionando com valores padrão
- O logo deve estar em `public/logo_contrato.png` para aparecer no PDF
