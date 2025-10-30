// services/relatorioService.js
const Placa = require('../models/Placa'); // Modelo Placa Mongoose
const Regiao = require('../models/Regiao'); // Modelo Regiao Mongoose
const Aluguel = require('../models/Aluguel'); // Importa Aluguel
const Cliente = require('../models/Cliente'); // Importa Cliente
const mongoose = require('mongoose'); 
const logger = require('../config/logger'); 
const AppError = require('../utils/AppError'); 
// [NOVO] Importa a biblioteca de PDF (Assumindo que você instalou pdfkit)
const PDFDocument = require('pdfkit'); 

class RelatorioService {
    constructor() {}

    // ... (placasPorRegiao e getDashboardSummary mantidos) ...

    /**
     * [MÉTODO ANTERIOR] Gera um relatório detalhado de ocupação por período. (Mantido)
     */
    async ocupacaoPorPeriodo(empresaId, dataInicio, dataFim) {
        // ... (Implementação do ocupacaoPorPeriodo - CÓDIGO ANTERIOR MANTIDO) ...
        logger.info(`[RelatorioService] Iniciando agregação 'ocupacaoPorPeriodo' DETALHADO para empresa ${empresaId}. Período: ${dataInicio.toISOString().split('T')[0]} a ${dataFim.toISOString().split('T')[0]}.`);
        const startTime = Date.now();
        const empresaObjectId = new mongoose.Types.ObjectId(empresaId);

        try {
            // 1. Duração total do período em dias
            const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            // 2. Total de Placas na Empresa
            const totalPlacas = await Placa.countDocuments({ empresa: empresaObjectId });
            const totalDiasPlacas = totalPlacas * diffDays;

            if (totalPlacas === 0) {
                 return {
                     totalDiasAlugados: 0, totalDiasPlacas: 0, percentagem: 0,
                     ocupacaoPorRegiao: [], novosAlugueisPorCliente: [], totalAlugueisNoPeriodo: 0,
                 };
            }
            
            const calcularDiasAlugados = [
                {
                    $addFields: {
                        data_inicio_efetiva: { $max: ['$data_inicio', dataInicio] },
                        data_fim_efetiva: { $min: ['$data_fim', dataFim] }
                    }
                },
                {
                    $addFields: {
                        duracao_ms: { $subtract: ['$data_fim_efetiva', '$data_inicio_efetiva'] }
                    }
                },
                {
                    $addFields: {
                        dias_alugados: { 
                             $add: [
                                { $ceil: { $divide: ['$duracao_ms', 1000 * 60 * 60 * 24] } },
                                1
                             ]
                        }
                    }
                },
                { $match: { dias_alugados: { $gt: 0 } } }
            ];

            // 1. AGREGAÇÃO: MÉTRICAS GLOBAIS
            const [globalMetricsResult] = await Aluguel.aggregate([
                { $match: { empresa: empresaObjectId, data_inicio: { $lte: dataFim }, data_fim: { $gte: dataInicio } } },
                ...calcularDiasAlugados,
                { $group: { _id: null, totalDiasAlugados: { $sum: '$dias_alugados' }, totalAlugueisNoPeriodo: { $sum: 1 } } },
                { $project: { _id: 0, totalDiasAlugados: 1, totalAlugueisNoPeriodo: 1 } }
            ]).exec();
            
            const totalDiasAlugados = globalMetricsResult?.totalDiasAlugados || 0;
            const totalAlugueisNoPeriodo = globalMetricsResult?.totalAlugueisNoPeriodo || 0;
            const taxaOcupacaoMediaGeral = totalDiasPlacas > 0 ? (totalDiasAlugados / totalDiasPlacas) * 100 : 0;
            
            // 2. AGREGAÇÃO: OCUPAÇÃO POR REGIÃO
            const ocupacaoPorRegiao = await Placa.aggregate([
                { $match: { empresa: empresaObjectId } },
                {
                    $lookup: {
                        from: Aluguel.collection.name,
                        localField: '_id',
                        foreignField: 'placa',
                        as: 'alugueisRelevantes',
                        pipeline: [
                            { $match: { data_inicio: { $lte: dataFim }, data_fim: { $gte: dataInicio } } },
                            ...calcularDiasAlugados, 
                            { $project: { dias_alugados: 1 } }
                        ]
                    }
                },
                { $unwind: { path: '$alugueisRelevantes', preserveNullAndEmptyArrays: true } },
                 {
                    $lookup: {
                        from: Regiao.collection.name,
                        localField: 'regiao',
                        foreignField: '_id',
                        as: 'regiaoInfo',
                        pipeline: [{ $project: { nome: 1, _id: 0 } }]
                    }
                },
                { $unwind: { path: '$regiaoInfo', preserveNullAndEmptyArrays: true } },
                { 
                    $group: {
                        _id: { regiaoId: { $ifNull: ['$regiao', 'SEM_REGIAO'] }, regiaoNome: { $ifNull: ['$regiaoInfo.nome', 'Sem Região'] } },
                        totalDiasAlugadosRegiao: { $sum: { $ifNull: ['$alugueisRelevantes.dias_alugados', 0] } },
                        totalPlacasRegiao: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        regiao: '$_id.regiaoNome',
                        totalDiasAlugados: '$totalDiasAlugadosRegiao',
                        totalPlacas: '$totalPlacasRegiao',
                        diasPeriodo: diffDays,
                        taxa_ocupacao_regiao: {
                            $multiply: [
                                { $divide: ['$totalDiasAlugadosRegiao', { $multiply: ['$totalPlacasRegiao', diffDays] }] },
                                100
                            ]
                        }
                    }
                },
                { $sort: { regiao: 1 } }
            ]).exec();

            // 3. AGREGAÇÃO: NOVOS ALUGUÉIS POR CLIENTE
            const novosAlugueisPorCliente = await Aluguel.aggregate([
                { $match: { empresa: empresaObjectId, data_inicio: { $gte: dataInicio, $lte: dataFim } } },
                 {
                    $lookup: {
                        from: Cliente.collection.name,
                        localField: 'cliente',
                        foreignField: '_id',
                        as: 'clienteInfo',
                        pipeline: [{ $project: { nome: 1, _id: 0 } }]
                    }
                },
                { $unwind: { path: '$clienteInfo', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: { clienteId: { $ifNull: ['$cliente', 'APAGADO'] }, clienteNome: { $ifNull: ['$clienteInfo.nome', 'Cliente Apagado'] } },
                        total_novos_alugueis: { $sum: 1 }
                    }
                },
                { $project: { _id: 0, cliente_nome: '$_id.clienteNome', total_novos_alugueis: 1 } },
                { $sort: { total_novos_alugueis: -1 } }
            ]).exec();

            const finalResult = {
                // Métricas Globais
                totalDiasAlugados: Math.round(totalDiasAlugados),
                totalDiasPlacas: totalDiasPlacas,
                percentagem: parseFloat(taxaOcupacaoMediaGeral.toFixed(2)),
                totalAlugueisNoPeriodo: totalAlugueisNoPeriodo, 
                
                // Detalhes
                ocupacaoPorRegiao: ocupacaoPorRegiao.map(item => ({
                    ...item,
                    taxa_ocupacao_regiao: parseFloat(item.taxa_ocupacao_regiao.toFixed(2)),
                    diasPeriodo: undefined 
                })),
                novosAlugueisPorCliente: novosAlugueisPorCliente
            };

            const endTime = Date.now();
            logger.info(`[RelatorioService] 'ocupacaoPorPeriodo' concluído em ${endTime - startTime}ms. Ocupação Geral: ${finalResult.percentagem}%.`);

            return finalResult;

        } catch (error) {
            const endTime = Date.now();
            logger.error(`[RelatorioService] Erro na agregação 'ocupacaoPorPeriodo' (tempo: ${endTime - startTime}ms): ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao gerar relatório de ocupação: ${error.message}`, 500);
        }
    }
    
    /**
     * [NOVO MÉTODO] Gera o PDF do relatório de Ocupação.
     * @param {object} reportData - O resultado da ocupacaoPorPeriodo.
     * @param {Date} dataInicio - Início do período.
     * @param {Date} dataFim - Fim do período.
     * @param {object} res - Objeto de resposta do Express.
     * @returns {void}
     */
    async generateOcupacaoPdf(reportData, dataInicio, dataFim, res) {
        logger.info('[RelatorioService] Iniciando geração do PDF de Ocupação.');
        
        // CUIDADO: Este doc.pipe(res) deve ser a ÚLTIMA coisa a fazer.
        const doc = new PDFDocument({ margin: 50 });

        // Definição dos Headers da Resposta
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_ocupacao_${dataInicio.toISOString().split('T')[0]}_${dataFim.toISOString().split('T')[0]}.pdf`);

        // Pipe o PDF para a resposta HTTP (Começa a enviar chunks)
        doc.pipe(res);

        // --- CONTEÚDO DO PDF ---
        
        // Formata datas para o cabeçalho
        const formatPdfDate = (date) => `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
        const inicioFormatado = formatPdfDate(dataInicio);
        const fimFormatado = formatPdfDate(dataFim);
        
        doc.fontSize(18).text('Relatório de Ocupação de Placas', { align: 'center' }).moveDown(0.5);
        doc.fontSize(12).text(`Período: ${inicioFormatado} a ${fimFormatado}`, { align: 'center' }).moveDown(1.5);
        
        // 1. Resumo Global
        doc.fontSize(14).text('1. Métricas Globais', { underline: true }).moveDown(0.5);
        doc.fontSize(10)
           .text(`Taxa de Ocupação Média: ${reportData.percentagem.toFixed(2)}%`)
           .text(`Total de Dias Alugados: ${reportData.totalDiasAlugados}`)
           .text(`Total de Aluguéis Iniciados: ${reportData.totalAlugueisNoPeriodo}`)
           .text(`Total de Placas x Dias (Máx.): ${reportData.totalDiasPlacas}`)
           .moveDown(1);
           
        // 2. Ocupação por Região
        doc.fontSize(14).text('2. Ocupação Detalhada por Região', { underline: true }).moveDown(0.5);
        if (reportData.ocupacaoPorRegiao.length === 0) {
             doc.fontSize(10).text('Nenhum dado de ocupação por região no período.').moveDown(1);
        } else {
            // Tabela simples (larguras em pontos)
            const tableHeaders = ['Região', 'Placas', 'Dias Alugados', 'Taxa Ocupação (%)'];
            const tableRows = reportData.ocupacaoPorRegiao.map(r => [
                r.regiao, 
                r.totalPlacas.toString(), 
                r.totalDiasAlugados.toString(), 
                `${r.taxa_ocupacao_regiao.toFixed(2)}%`
            ]);
            
            this._drawTable(doc, tableHeaders, tableRows, doc.y);
        }
        
        // 3. Novos Aluguéis por Cliente
        doc.moveDown(1);
        doc.fontSize(14).text('3. Novos Aluguéis por Cliente', { underline: true }).moveDown(0.5);
        if (reportData.novosAlugueisPorCliente.length === 0) {
             doc.fontSize(10).text('Nenhum novo aluguel encontrado no período.').moveDown(1);
        } else {
             const tableHeaders = ['Cliente', 'Total de Aluguéis'];
             const tableRows = reportData.novosAlugueisPorCliente.map(c => [
                 c.cliente_nome, 
                 c.total_novos_alugueis.toString()
             ]);
             this._drawTable(doc, tableHeaders, tableRows, doc.y);
        }
        
        // --- FIM DO CONTEÚDO ---
        
        doc.end();
        logger.info('[RelatorioService] PDF de Ocupação gerado com sucesso.');
    }
    
    // Método auxiliar para desenhar tabelas (simplificado para PDFKit)
    _drawTable(doc, headers, rows, startY) {
         let currentY = startY + 10;
         const startX = 50;
         const rowHeight = 20;
         const availableWidth = doc.page.width - 2 * startX;
         const columnWidth = availableWidth / headers.length;
         
         // Headers
         doc.font('Helvetica-Bold').fontSize(10).fillColor('#252836'); // Cor mais escura
         headers.forEach((header, i) => {
             doc.text(header, startX + i * columnWidth, currentY, { width: columnWidth, align: 'center' });
         });
         currentY += rowHeight;
         
         // Rows
         doc.font('Helvetica').fontSize(10);
         rows.forEach((row, rowIndex) => {
             // Fundo cinza claro
             doc.fillColor(rowIndex % 2 === 0 ? '#f9f9f9' : '#ffffff').rect(startX, currentY - 5, availableWidth, rowHeight).fill();
             doc.fillColor('black'); // Cor do texto
             
             row.forEach((cell, i) => {
                 doc.text(cell, startX + i * columnWidth, currentY + 3, { width: columnWidth, align: 'center' });
             });
             currentY += rowHeight;
             
             // Verificar se precisa de nova página
             if (currentY + rowHeight > doc.page.height - 50) {
                 doc.addPage();
                 currentY = 50; // Começa a 50 na nova página
                 doc.font('Helvetica-Bold').fontSize(10).fillColor('#252836');
                 headers.forEach((header, i) => {
                     doc.text(header, startX + i * columnWidth, currentY, { width: columnWidth, align: 'center' });
                 });
                 doc.moveDown(1);
                 currentY += rowHeight;
                 doc.font('Helvetica').fontSize(10);
             }
         });
    }
}

module.exports = RelatorioService;