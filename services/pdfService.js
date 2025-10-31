// services/pdfService.js
const PDFDocument = require('pdfkit');
const logger = require('../config/logger');

/**
 * Gera o PDF de uma Proposta Interna (PI) e o envia (streams) para a resposta HTTP.
 * @param {object} res - O objeto de resposta do Express.
 * @param {object} pi - O documento Mongoose da PropostaInterna.
 * @param {object} cliente - O documento Mongoose do Cliente.
 * @param {object} empresa - O documento Mongoose da Empresa (inquilino).
 * @param {object} user - O documento Mongoose do Usuário que gerou.
 */
exports.generatePI_PDF = (res, pi, cliente, empresa, user) => {
    logger.info(`[PdfService] Gerando PDF para PI ID: ${pi.id}`);
    
    const filename = `PI_${pi.id}_${cliente.nome.replace(/\s+/g, '_')}.pdf`;
    
    // Configura a resposta HTTP para streaming de PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // --- Início do Template da PI ---
    // (Este é um layout básico. Você deve ajustá-lo conforme o seu modelo)

    // Cabeçalho
    doc.fontSize(18).font('Helvetica-Bold').text(`PROPOSTA INTERNA (PI)`, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Gerado por: ${user.nome} ${user.sobrenome}`, { align: 'center' });
    doc.moveDown(2);

    // Dados da Empresa (Contratada)
    doc.fontSize(12).font('Helvetica-Bold').text('CONTRATADA (Empresa):');
    doc.font('Helvetica').text(empresa.nome);
    doc.text(`CNPJ: ${empresa.cnpj || 'Não informado'}`);
    doc.moveDown();

    // Dados do Cliente (Contratante)
    doc.fontSize(12).font('Helvetica-Bold').text('CONTRATANTE (Cliente):');
    doc.font('Helvetica').text(cliente.nome);
    doc.text(`Email: ${cliente.email || 'Não informado'}`);
    doc.text(`Telefone: ${cliente.telefone || 'Não informado'}`);
    doc.text(`CNPJ: ${cliente.cnpj || 'Não informado'}`);
    doc.moveDown(2);

    // Detalhes da Proposta
    doc.fontSize(12).font('Helvetica-Bold').text('DETALHES DA PROPOSTA:');
    doc.font('Helvetica').text(`Período: ${pi.tipoPeriodo === 'quinzenal' ? 'Quinzenal' : 'Mensal'}`);
    doc.text(`Data de Início: ${new Date(pi.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`);
    doc.text(`Data de Fim: ${new Date(pi.dataFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`);
    doc.moveDown();
    
    doc.fontSize(12).font('Helvetica-Bold').text('Descrição dos Serviços:');
    doc.font('Helvetica').text(pi.descricao || 'Nenhuma descrição fornecida.');
    doc.moveDown();

    // Valor
    doc.fontSize(14).font('Helvetica-Bold').text('VALOR TOTAL:', { continued: true });
    doc.text(` R$ ${pi.valorTotal.toFixed(2).replace('.', ',')}`);

    // --- Fim do Template ---

    doc.end();
    logger.info(`[PdfService] PDF ${filename} enviado para stream.`);
};


/**
 * Gera o PDF de um Contrato e o envia (streams) para a resposta HTTP.
 * @param {object} res - O objeto de resposta do Express.
 * @param {object} contrato - O documento Mongoose do Contrato.
 * @param {object} pi - O documento Mongoose da PI associada.
 * @param {object} cliente - O documento Mongoose do Cliente.
 * @param {object} empresa - O documento Mongoose da Empresa (inquilino).
 */
exports.generateContrato_PDF = (res, contrato, pi, cliente, empresa) => {
    logger.info(`[PdfService] Gerando PDF para Contrato ID: ${contrato.id}`);
    
    const filename = `CONTRATO_${contrato.id}_${cliente.nome.replace(/\s+/g, '_')}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 70, size: 'A4' }); // Contratos geralmente têm mais margem
    doc.pipe(res);

    // --- Início do Template do Contrato ---
    // (Este é um placeholder. Você DEVE substituir pelo seu modelo de contrato)

    doc.fontSize(16).font('Helvetica-Bold').text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(11).font('Helvetica-Bold').text('PARTE CONTRATADA:');
    doc.font('Helvetica').text(`${empresa.nome}, CNPJ ${empresa.cnpj || 'Não informado'}, doravante denominada CONTRATADA.`);
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('PARTE CONTRATANTE:');
    doc.font('Helvetica').text(`${cliente.nome}, CNPJ ${cliente.cnpj || 'Não informado'}, doravante denominada CONTRATANTE.`);
    doc.moveDown(2);

    doc.fontSize(11).font('Helvetica-Bold').text('CLÁUSULA 1ª - DO OBJETO');
    doc.font('Helvetica').text('O objeto deste contrato é a prestação de serviços de publicidade conforme descrito na Proposta Interna (PI) anexa, incluindo:');
    doc.list([`${pi.descricao || 'Serviços conforme PI.'}`]);
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('CLÁUSULA 2ª - DO PERÍODO');
    doc.font('Helvetica').text(`O presente contrato terá vigência de ${new Date(pi.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} até ${new Date(pi.dataFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`);
    doc.moveDown();
    
    doc.fontSize(11).font('Helvetica-Bold').text('CLÁUSULA 3ª - DO VALOR');
    doc.font('Helvetica').text(`O valor total pelos serviços prestados será de R$ ${pi.valorTotal.toFixed(2).replace('.', ',')}.`);
    doc.moveDown(5);

    doc.text('E por estarem justos e contratados, assinam o presente instrumento.');
    doc.moveDown(2);
    
    doc.text('_____________________________________');
    doc.text(empresa.nome);
    doc.moveDown();
    
    doc.text('_____________________________________');
    doc.text(cliente.nome);

    // --- Fim do Template ---

    doc.end();
    logger.info(`[PdfService] PDF ${filename} enviado para stream.`);
};