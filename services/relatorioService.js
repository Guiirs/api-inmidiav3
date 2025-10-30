// services/relatorioService.js

// Modelos e dependências
const Placa = require('../models/Placa');
const Regiao = require('../models/Regiao');
const Aluguel = require('../models/Aluguel');
const Cliente = require('../models/Cliente');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const axios = require('axios');

// Variáveis de ambiente para a API Externa (Requer configuração no .env)
const PDF_REST_API_KEY = process.env.PDF_REST_API_KEY || '';
const PDF_REST_ENDPOINT = process.env.PDF_REST_ENDPOINT || 'https://api.pdfrest.com/pdf';


class RelatorioService {
    constructor() {}

    /**
     * [MÉTODO CORRIGIDO - DASHBOARD]
     * Busca o resumo de dados para o dashboard.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<object>} - Objeto com { totalPlacas, placasDisponiveis, regiaoPrincipal }.
     */
    async getDashboardSummary(empresa_id) {
        logger.info(`[RelatorioService] Buscando Dashboard Summary para empresa ${empresa_id}.`);
        try {
            const empresaObjectId = new mongoose.Types.ObjectId(empresa_id);

            // 1. Contagem total de placas
            const totalPlacasPromise = Placa.countDocuments({ empresa: empresaObjectId });

            // 2. Contagem de placas disponíveis
            const placasDisponiveisPromise = Placa.countDocuments({
                empresa: empresaObjectId,
                disponivel: true
            });

            // 3. Região principal (com mais placas)
            const regiaoPrincipalPromise = Placa.aggregate([
                { $match: { empresa: empresaObjectId } },
                { $group: { _id: '$regiao', total: { $sum: 1 } } },
                { $sort: { total: -1 } },
                { $limit: 1 },
                {
                    $lookup: {
                        from: 'regiaos', // Nome da coleção de Regiões
                        localField: '_id',
                        foreignField: '_id',
                        as: 'regiaoDetalhes'
                    }
                },
                { $unwind: { path: '$regiaoDetalhes', preserveNullAndEmptyArrays: true } },
                { $project: { _id: 0, nome: { $ifNull: ['$regiaoDetalhes.nome', 'N/A'] } } }
            ]);

            const [totalPlacas, placasDisponiveis, regiaoResult] = await Promise.all([
                totalPlacasPromise,
                placasDisponiveisPromise,
                regiaoPrincipalPromise
            ]);

            const regiaoPrincipal = regiaoResult.length > 0 ? regiaoResult[0].nome : 'N/A';

            return { totalPlacas, placasDisponiveis, regiaoPrincipal };

        } catch (error) {
            logger.error(`[RelatorioService] Erro ao gerar Dashboard Summary: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao buscar resumo do dashboard: ${error.message}`, 500);
        }
    }

    /**
     * [MÉTODO CORRIGIDO - DASHBOARD]
     * Agrupa a contagem de placas por região.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<Array<object>>} - Array com { regiao, total_placas }.
     */
    async placasPorRegiao(empresa_id) {
        logger.info(`[RelatorioService] Buscando placasPorRegiao para empresa ${empresa_id}.`);
        try {
            const empresaObjectId = new mongoose.Types.ObjectId(empresa_id);

            const data = await Placa.aggregate([
                { $match: { empresa: empresaObjectId } },
                { $group: { _id: '$regiao', total_placas: { $sum: 1 } } },
                { $sort: { total_placas: -1 } },
                {
                    $lookup: {
                        from: 'regiaos', // Nome da coleção de Regiões
                        localField: '_id',
                        foreignField: '_id',
                        as: 'regiaoDetalhes'
                    }
                },
                { $unwind: { path: '$regiaoDetalhes', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        regiao: { $ifNull: ['$regiaoDetalhes.nome', 'Sem Região'] },
                        total_placas: 1
                    }
                }
            ]);
            return data;
        } catch (error) {
            logger.error(`[RelatorioService] Erro ao buscar placasPorRegiao: ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao buscar placas por região: ${error.message}`, 500);
        }
    }


    /**
     * Calcula métricas de ocupação de placas em um determinado período.
     * @param {string} empresa_id - ObjectId da empresa.
     * @param {Date} dataInicio - Data de início (Objeto Date).
     * @param {Date} dataFim - Data de fim (Objeto Date).
     * @returns {Promise<object>} - Relatório consolidado.
     */
    async ocupacaoPorPeriodo(empresa_id, dataInicio, dataFim) {
        logger.info(`[RelatorioService] Calculando ocupação para Empresa ${empresa_id} no período: ${dataInicio.toISOString()} a ${dataFim.toISOString()}`);
        
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        
        fim.setDate(fim.getDate() + 1);

        if (isNaN(inicio) || isNaN(fim) || fim <= inicio) {
            logger.warn(`[RelatorioService] Datas inválidas recebidas: Inicio=${dataInicio}, Fim=${dataFim}`);
            throw new AppError('Datas de relatório inválidas.', 400);
        }
        
        const numDiasPeriodo = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
        const empresaObjectId = new mongoose.Types.ObjectId(empresa_id);

        // --- PIPELINE 1: Ocupação e Placas por Região ---
        const ocupacaoPorRegiao = await Placa.aggregate([
            { 
                $match: { 
                    is_active: true,
                    empresa: empresaObjectId 
                } 
            }, 
            {
                $lookup: {
                    from: 'alugueis', 
                    let: { placaId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$$placaId', '$placa'] },
                                        { $lt: ['$data_inicio', fim] },
                                        { $gt: ['$data_fim', inicio] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'alugueisNoPeriodo'
                }
            },
            {
                $project: {
                    regiao: '$regiao',
                    totalAlugueis: { $size: '$alugueisNoPeriodo' },
                    diasAlugados: {
                        $sum: {
                            $map: {
                                input: '$alugueisNoPeriodo',
                                as: 'aluguel',
                                in: {
                                    $let: {
                                        vars: {
                                            // [CORREÇÃO FINAL]
                                            // As variáveis 'effectiveStart' e 'effectiveEnd'
                                            // devem ser calculadas diretamente de '$$aluguel.*'
                                            // e não de outras variáveis 'vars' no mesmo bloco.
                                            effectiveStart: { $max: ['$$aluguel.data_inicio', inicio] },
                                            effectiveEnd: { $min: ['$$aluguel.data_fim', fim] }
                                        },
                                        in: {
                                            // Agora 'effectiveStart' e 'effectiveEnd' estão disponíveis aqui
                                            $divide: [
                                                { $subtract: ['$$effectiveEnd', '$$effectiveStart'] },
                                                1000 * 60 * 60 * 24
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$regiao',
                    totalPlacas: { $sum: 1 },
                    totalDiasAlugados: { $sum: '$diasAlugados' }
                }
            },
            {
                $lookup: {
                    from: 'regiaos', 
                    localField: '_id',
                    foreignField: '_id',
                    as: 'regiaoDetalhes'
                }
            },
            { $unwind: { path: '$regiaoDetalhes', preserveNullAndEmptyArrays: true } }, 
            {
                $project: {
                    _id: 0,
                    regiaoId: '$_id',
                    regiao: { $ifNull: ['$regiaoDetalhes.nome', 'Sem Região'] },
                    totalPlacas: 1,
                    totalDiasAlugados: { $round: ['$totalDiasAlugados', 0] },
                    totalDiasPlacas: { $multiply: ['$totalPlacas', numDiasPeriodo] }
                }
            },
            {
                $project: {
                    regiao: 1,
                    totalPlacas: 1,
                    totalDiasAlugados: 1,
                    totalDiasPlacas: 1,
                    taxa_ocupacao_regiao: {
                        $cond: {
                            if: { $eq: ['$totalDiasPlacas', 0] },
                            then: 0,
                            else: { $multiply: [{ $divide: ['$totalDiasAlugados', '$totalDiasPlacas'] }, 100] }
                        }
                    }
                }
            }
        ]);

        // --- CÁLCULOS GLOBAIS ---
        const totalDiasAlugados = ocupacaoPorRegiao.reduce((sum, item) => sum + item.totalDiasAlugados, 0);
        const totalPlacas = ocupacaoPorRegiao.reduce((sum, item) => sum + item.totalPlacas, 0);
        const totalDiasPlacas = totalPlacas * numDiasPeriodo;
        const percentagem = totalDiasPlacas === 0 ? 0 : (totalDiasAlugados / totalDiasPlacas) * 100;
            
        
        // --- PIPELINE 2: Novos Aluguéis por Cliente (Para Gráfico) ---
        const novosAlugueisPorCliente = await Aluguel.aggregate([
             {
                $match: {
                    empresa: empresaObjectId, 
                    data_inicio: { $gte: inicio, $lt: fim } 
                }
             },
             {
                 $group: {
                     _id: '$cliente',
                     total_novos_alugueis: { $sum: 1 }
                 }
             },
             { $sort: { total_novos_alugueis: -1 } },
             { $limit: 10 },
             {
                 $lookup: {
                     from: 'clientes', 
                     localField: '_id',
                     foreignField: '_id',
                     as: 'clienteDetalhes'
                 }
             },
             { $unwind: { path: '$clienteDetalhes', preserveNullAndEmptyArrays: true } },
             {
                 $project: {
                     _id: 0,
                     cliente_nome: { $ifNull: ['$clienteDetalhes.nome', 'Cliente Desconhecido'] },
                     total_novos_alugueis: 1
                 }
             }
        ]);
        
        const totalAlugueisNoPeriodo = novosAlugueisPorCliente.reduce((sum, item) => sum + item.total_novos_alugueis, 0);

        return {
            totalDiasPlacas: Math.round(totalDiasPlacas),
            totalDiasAlugados: Math.round(totalDiasAlugados),
            percentagem: parseFloat(percentagem.toFixed(2)),
            totalAlugueisNoPeriodo: totalAlugueisNoPeriodo, 
            ocupacaoPorRegiao: ocupacaoPorRegiao.map(r => ({
                 ...r,
                 taxa_ocupacao_regiao: parseFloat(r.taxa_ocupacao_regiao.toFixed(2)) 
            })),
            novosAlugueisPorCliente: novosAlugueisPorCliente,
        };
    }

    /**
     * [MÉTODO EXISTENTE] Gera o PDF do relatório de Ocupação via API externa (PDFRest).
     * @param {object} reportData - O resultado da ocupacaoPorPeriodo (JSON).
     * @param {Date} dataInicio - Início do período (objeto Date).
     * @param {Date} dataFim - Fim do período (objeto Date).
     * @param {object} res - Objeto de resposta do Express.
     * @returns {void}
     */
    async generateOcupacaoPdf(reportData, dataInicio, dataFim, res) {
        logger.info('[RelatorioService] Iniciando geração do PDF de Ocupação via API Externa (PDFRest).');

        if (!PDF_REST_API_KEY || !PDF_REST_ENDPOINT) {
             throw new AppError('As variáveis PDF_REST_API_KEY ou PDF_REST_ENDPOINT estão em falta no .env.', 500);
        }

        const formatPdfDate = (date) => `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
        
        const dataInicioStr = formatPdfDate(dataInicio);
        const dataFimExibicao = new Date(dataFim);
        dataFimExibicao.setDate(dataFimExibicao.getDate() - 1);
        const dataFimStr = formatPdfDate(dataFimExibicao);
        
        const tabelaRegiaoHtml = reportData.ocupacaoPorRegiao.map(r => `
            <tr>
                <td>${r.regiao}</td>
                <td style="text-align: right;">${r.totalPlacas}</td>
                <td style="text-align: right;">${r.totalDiasAlugados}</td>
                <td style="text-align: right;">${r.totalDiasPlacas}</td>
                <td style="text-align: right; font-weight: bold;">${r.taxa_ocupacao_regiao.toFixed(2)}%</td>
            </tr>
        `).join('');
        
        const tabelaClientesHtml = reportData.novosAlugueisPorCliente.map(c => `
            <tr>
                <td>${c.cliente_nome}</td>
                <td style="text-align: right;">${c.total_novos_alugueis}</td>
            </tr>
        `).join('');

        // --- 1. Formatar o Conteúdo (HTML) ---
        const htmlContent = `
            <html>
                <head>
                    <style>
                        body { font-family: sans-serif; margin: 40px; color: #333; font-size: 10px; }
                        h1 { color: #D32F2F; border-bottom: 2px solid #D32F2F; padding-bottom: 5px; margin-bottom: 10px; font-size: 20px; }
                        h2 { color: #555; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 25px; font-size: 14px; }
                        p { margin: 5px 0; }
                        .summary-grid { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px; }
                        .metric { width: 45%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9; box-sizing: border-box; }
                        .metric-label { font-size: 9px; color: #666; text-transform: uppercase; margin-bottom: 3px; }
                        .metric-value { font-size: 16px; font-weight: bold; color: #333; }
                        
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: left; font-size: 9px; }
                        th { background-color: #eee; font-weight: bold; text-transform: uppercase; color: #333; }
                    </style>
                </head>
                <body>
                    <h1>Relatório de Ocupação de Placas</h1>
                    <p style="font-size: 12px; margin-bottom: 20px;"><strong>Período:</strong> ${dataInicioStr} a ${dataFimStr}</p>
                    
                    <h2>Métricas Globais</h2>
                    <div class="summary-grid">
                        <div class="metric">
                            <p class="metric-label">Taxa de Ocupação Média</p>
                            <p class="metric-value">${reportData.percentagem.toFixed(2)}%</p>
                        </div>
                        <div class="metric">
                            <p class="metric-label">Aluguéis Iniciados no Período</p>
                            <p class="metric-value">${reportData.totalAlugueisNoPeriodo}</p>
                        </div>
                        <div class="metric">
                            <p class="metric-label">Dias Alugados (Total)</p>
                            <p class="metric-value">${reportData.totalDiasAlugados}</p>
                        </div>
                        <div class="metric">
                            <p class="metric-label">Capacidade Máxima (Dias/Placa)</p>
                            <p class="metric-value">${reportData.totalDiasPlacas}</p>
                        </div>
                    </div>
                    
                    <h2>Ocupação Detalhada por Região</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Região</th>
                                <th style="text-align: right;">Placas Ativas</th>
                                <th style="text-align: right;">Dias Alugados</th>
                                <th style="text-align: right;">Capacidade (Dias)</th>
                                <th style="text-align: right;">Taxa Ocupação (%)</th>
                            </tr>
                        </thead>
                        <tbody>${tabelaRegiaoHtml}</tbody>
                    </table>

                    <h2>Top 10 Clientes por Novos Aluguéis</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th style="text-align: right;">Total de Novos Aluguéis</th>
                            </tr>
                        </thead>
                        <tbody>${tabelaClientesHtml}</tbody>
                    </table>
                </body>
            </html>
        `;

        // --- 2. Chamada à API Externa (PDFRest) ---
        const filename = `relatorio_ocupacao_${dataInicio.toISOString().split('T')[0]}_${dataFimExibicao.toISOString().split('T')[0]}.pdf`;

        try {
            const pdfApiEndpoint = `${PDF_REST_ENDPOINT}/html-to-pdf`; 
            
            const pdfResponse = await axios.post(pdfApiEndpoint, {
                html: htmlContent, 
                pdf_options: {
                    margins: { top: 10, right: 10, bottom: 10, left: 10 },
                    format: 'A4'
                },
                filename: filename
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': PDF_REST_API_KEY 
                },
                responseType: 'arraybuffer' 
            });

            // --- 3. Enviar o PDF de Volta para o Cliente (Front-end) ---
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(Buffer.from(pdfResponse.data));

            logger.info('[RelatorioService] PDF de Ocupação enviado com sucesso via API Externa.');

        } catch (apiError) {
             logger.error(`[RelatorioService] ERRO NA API EXTERNA (${PDF_REST_ENDPOINT}): ${apiError.message}`, { 
                 status: apiError.response?.status, 
                 data: apiError.response?.data?.error || apiError.response?.data?.message || 'Detalhes indisponíveis' 
             });
             throw new AppError('Falha na comunicação com o serviço de geração de PDF.', 500);
        }
    }
}

module.exports = RelatorioService;