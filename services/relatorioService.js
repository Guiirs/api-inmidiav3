// services/relatorioService.js

// Modelos e dependências
const Placa = require('../models/Placa');
const Regiao = require('../models/Regiao');
const Aluguel = require('../models/Aluguel');
const Cliente = require('../models/Cliente'); // Incluído para agregação de clientes
const mongoose = require('mongoose');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const axios = require('axios'); // [NOVO] Adiciona axios para chamadas HTTP externas

// Variáveis de ambiente para a API Externa (Requer configuração no .env)
const PDF_REST_API_KEY = process.env.PDF_REST_API_KEY || '';
const PDF_REST_ENDPOINT = process.env.PDF_REST_ENDPOINT || 'https://api.pdfrest.com'; 
// NOTE: O endpoint da PDFRest para converter HTML para PDF geralmente é /pdf/from-html. Ajustei o endpoint base.


class RelatorioService {
    constructor() {}

    /**
     * Calcula métricas de ocupação de placas em um determinado período.
     * @param {string} dataInicio - Data de início (formato YYYY-MM-DD).
     * @param {string} dataFim - Data de fim (formato YYYY-MM-DD).
     * @returns {Promise<object>} - Relatório consolidado.
     */
    async ocupacaoPorPeriodo(dataInicio, dataFim) {
        logger.info(`[RelatorioService] Calculando ocupação para o período: ${dataInicio} a ${dataFim}`);
        
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        
        // Ajusta a data final para incluir o dia inteiro
        fim.setDate(fim.getDate() + 1);

        if (isNaN(inicio) || isNaN(fim) || fim <= inicio) {
            throw new AppError('Datas de relatório inválidas.', 400);
        }
        
        const numDiasPeriodo = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);

        // --- PIPELINE 1: Ocupação e Placas por Região ---
        const ocupacaoPorRegiao = await Placa.aggregate([
            // 1. Filtra placas ativas (disponível=true ou em aluguel)
            { $match: { is_active: true } }, 
            // 2. Lookup para trazer os dados de Aluguéis
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
                                        // Filtra aluguéis que se sobrepõem ao período
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
            // 3. Projeta e calcula os dias alugados para cada placa
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
                                            aluguelInicio: '$$aluguel.data_inicio',
                                            aluguelFim: '$$aluguel.data_fim',
                                            
                                            // Calcula o dia de início efetivo (max(data_inicio do aluguel, data_inicio do relatório))
                                            effectiveStart: { $max: ['$$aluguelInicio', inicio] },
                                            // Calcula o dia de fim efetivo (min(data_fim do aluguel, data_fim do relatório))
                                            effectiveEnd: { $min: ['$$aluguelFim', fim] }
                                        },
                                        // Calcula a diferença em milissegundos, divide para obter dias
                                        in: {
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
            // 4. Agrupa por Região
            {
                $group: {
                    _id: '$regiao',
                    totalPlacas: { $sum: 1 },
                    totalDiasAlugados: { $sum: '$diasAlugados' }
                }
            },
            // 5. Lookup para trazer o nome da Região
            {
                $lookup: {
                    from: 'regiaos', // Nome da coleção de Região (Regiao.js)
                    localField: '_id',
                    foreignField: '_id',
                    as: 'regiaoDetalhes'
                }
            },
            { $unwind: '$regiaoDetalhes' }, // Desempacota os detalhes da região
            // 6. Projeta os resultados finais da região
            {
                $project: {
                    _id: 0,
                    regiaoId: '$_id',
                    regiao: '$regiaoDetalhes.nome',
                    totalPlacas: 1,
                    totalDiasAlugados: { $round: ['$totalDiasAlugados', 0] },
                    totalDiasPlacas: { $multiply: ['$totalPlacas', numDiasPeriodo] }
                }
            },
            // 7. Calcula a taxa de ocupação por região
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

        // Soma total
        const totalDiasAlugados = ocupacaoPorRegiao.reduce((sum, item) => sum + item.totalDiasAlugados, 0);
        const totalPlacas = ocupacaoPorRegiao.reduce((sum, item) => sum + item.totalPlacas, 0);
        const totalDiasPlacas = totalPlacas * numDiasPeriodo;

        const percentagem = totalDiasPlacas === 0
            ? 0
            : (totalDiasAlugados / totalDiasPlacas) * 100;
            
        
        // --- PIPELINE 2: Novos Aluguéis por Cliente (Para Gráfico) ---
        const novosAlugueisPorCliente = await Aluguel.aggregate([
             {
                $match: {
                    // Aluguéis que iniciaram no período
                    data_inicio: { $gte: inicio, $lt: fim } 
                }
             },
             // Agrupa por cliente e conta
             {
                 $group: {
                     _id: '$cliente',
                     total_novos_alugueis: { $sum: 1 }
                 }
             },
             // Ordena pelos clientes com mais aluguéis
             { $sort: { total_novos_alugueis: -1 } },
             // Limita aos 10 principais
             { $limit: 10 },
             // Lookup para obter o nome do cliente
             {
                 $lookup: {
                     from: 'clientes', // Nome da coleção de Cliente (Cliente.js)
                     localField: '_id',
                     foreignField: '_id',
                     as: 'clienteDetalhes'
                 }
             },
             {
                 $project: {
                     _id: 0,
                     cliente_nome: { $ifNull: [{ $arrayElemAt: ['$clienteDetalhes.nome', 0] }, 'Cliente Desconhecido'] },
                     total_novos_alugueis: 1
                 }
             }
        ]);
        
        const totalAlugueisNoPeriodo = novosAlugueisPorCliente.reduce((sum, item) => sum + item.total_novos_alugueis, 0);


        return {
            totalDiasPlacas: Math.round(totalDiasPlacas),
            totalDiasAlugados: Math.round(totalDiasAlugados),
            percentagem: parseFloat(percentagem.toFixed(2)),
            totalAlugueisNoPeriodo: totalAlugueisNoPeriodo, // Novo: Total de aluguéis iniciados
            ocupacaoPorRegiao: ocupacaoPorRegiao.map(r => ({
                 ...r,
                 // Garante que o % esteja com no máximo 2 casas decimais
                 taxa_ocupacao_regiao: parseFloat(r.taxa_ocupacao_regiao.toFixed(2)) 
            })),
            novosAlugueisPorCliente: novosAlugueisPorCliente,
        };
    }

    /**
     * [NOVO MÉTODO] Gera o PDF do relatório de Ocupação via API externa (PDFRest).
     * Renderiza um HTML e envia para a API.
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

        // Helper para formatar a data no PDF
        const formatPdfDate = (date) => `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
        
        const dataInicioStr = formatPdfDate(dataInicio);
        // dataFim é ajustada para incluir o dia completo no cálculo, então voltamos 1 dia para a exibição no PDF
        const dataFimExibicao = new Date(dataFim);
        dataFimExibicao.setDate(dataFimExibicao.getDate() - 1);
        const dataFimStr = formatPdfDate(dataFimExibicao);
        
        // Formata os dados da tabela de Região
        const tabelaRegiaoHtml = reportData.ocupacaoPorRegiao.map(r => `
            <tr>
                <td>${r.regiao}</td>
                <td style="text-align: right;">${r.totalPlacas}</td>
                <td style="text-align: right;">${r.totalDiasAlugados}</td>
                <td style="text-align: right;">${r.totalDiasPlacas}</td>
                <td style="text-align: right; font-weight: bold;">${r.taxa_ocupacao_regiao.toFixed(2)}%</td>
            </tr>
        `).join('');
        
        // Formata os dados da tabela de Clientes
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
            // PDFRest geralmente usa um endpoint específico para conversão de HTML
            const pdfApiEndpoint = `${PDF_REST_ENDPOINT}/html-to-pdf`; 
            
            const pdfResponse = await axios.post(pdfApiEndpoint, {
                // PDFRest usa o parâmetro 'html' para o conteúdo
                html: htmlContent, 
                // Parâmetros comuns para PDFRest (ajustáveis conforme sua conta/plano)
                pdf_options: {
                    margins: { top: 10, right: 10, bottom: 10, left: 10 }, // Margens em mm
                    format: 'A4'
                },
                filename: filename
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': PDF_REST_API_KEY // Autenticação
                },
                responseType: 'arraybuffer' // Receber a resposta como binário (Blob/Buffer)
            });

            // --- 3. Enviar o PDF de Volta para o Cliente (Front-end) ---
            
            // Define o Content-Type como PDF
            res.setHeader('Content-Type', 'application/pdf');
            // Define o cabeçalho para download
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            // Envia o buffer binário (o PDF) para o cliente
            res.send(Buffer.from(pdfResponse.data));

            logger.info('[RelatorioService] PDF de Ocupação enviado com sucesso via API Externa.');

        } catch (apiError) {
             logger.error(`[RelatorioService] ERRO NA API EXTERNA (${PDF_REST_ENDPOINT}): ${apiError.message}`, { 
                 status: apiError.response?.status, 
                 data: apiError.response?.data?.error || apiError.response?.data?.message || 'Detalhes indisponíveis' 
             });
             // Converte erro de API externa em AppError 500
             throw new AppError('Falha na comunicação com o serviço de geração de PDF.', 500);
        }
    }
}

module.exports = RelatorioService;