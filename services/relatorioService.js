// services/relatorioService.js
const Aluguel = require('../models/Aluguel');
const Placa = require('../models/Placa');
const Regiao = require('../models/Regiao');
const mongoose = require('mongoose'); // 1. IMPORTAÇÃO ADICIONADA
const logger = require('../config/logger');

/**
 * Obtém o faturamento total da empresa.
 */
exports.getFaturamentoTotal = async (empresaId) => {
    try {
        const empId = new mongoose.Types.ObjectId(empresaId);
        const resultado = await Aluguel.aggregate([
            { $match: { empresa_id: empId } },
            { $group: { _id: null, total: { $sum: '$valorTotal' } } }
        ]);
        return resultado.length > 0 ? resultado[0].total : 0;
    } catch (error) {
        logger.error(`[RelatorioService] Erro ao calcular faturamento total para empresa ${empresaId}: ${error.message}`);
        throw new Error('Erro ao calcular faturamento total.');
    }
};

/**
 * Obtém o número total de placas da empresa.
 */
exports.getTotalPlacas = async (empresaId) => {
    try {
        return await Placa.countDocuments({ empresa_id: empresaId });
    } catch (error) {
        logger.error(`[RelatorioService] Erro ao contar placas para empresa ${empresaId}: ${error.message}`);
        throw new Error('Erro ao contar placas.');
    }
};

/**
 * Obtém o número de placas disponíveis (status 'disponivel').
 */
exports.getPlacasDisponiveis = async (empresaId) => {
    try {
        return await Placa.countDocuments({ empresa_id: empresaId, status: 'disponivel' });
    } catch (error) {
        logger.error(`[RelatorioService] Erro ao contar placas disponíveis para empresa ${empresaId}: ${error.message}`);
        throw new Error('Erro ao contar placas disponíveis.');
    }
};

/**
 * Obtém a contagem de placas por região (agregação).
 */
exports.getPlacasPorRegiao = async (empresaId) => {
    try {
        const empId = new mongoose.Types.ObjectId(empresaId);
        const resultado = await Placa.aggregate([
            { $match: { empresa_id: empId } },
            {
                $lookup: {
                    from: Regiao.collection.name,
                    localField: 'regiao_id',
                    foreignField: '_id',
                    as: 'regiao'
                }
            },
            { $unwind: { path: '$regiao', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$regiao.nome',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    regiao: { $ifNull: ['$_id', 'Sem Região'] },
                    count: '$count'
                }
            },
            { $sort: { count: -1 } }
        ]);
        return resultado;
    } catch (error) {
        logger.error(`[RelatorioService] Erro ao agregar placas por região para empresa ${empresaId}: ${error.message}`);
        throw new Error('Erro ao agregar placas por região.');
    }
};

/**
 * Obtém o faturamento dos últimos 6 meses (agregação).
 */
exports.getFaturamentoUltimosMeses = async (empresaId) => {
    try {
        const empId = new mongoose.Types.ObjectId(empresaId);
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
        seisMesesAtras.setDate(1); // Garante que começa no dia 1
        seisMesesAtras.setHours(0, 0, 0, 0); // Zera a hora

        const resultado = await Aluguel.aggregate([
            {
                $match: {
                    empresa_id: empId,
                    createdAt: { $gte: seisMesesAtras } // Usando createdAt
                }
            },
            {
                $group: {
                    _id: {
                        ano: { $year: '$createdAt' },
                        mes: { $month: '$createdAt' }
                    },
                    total: { $sum: '$valorTotal' }
                }
            },
            { $sort: { '_id.ano': 1, '_id.mes': 1 } },
            {
                $project: {
                    _id: 0,
                    label: {
                        $concat: [
                            { $toString: '$_id.mes' },
                            '/',
                            { $toString: '$_id.ano' }
                        ]
                    },
                    faturamento: '$total'
                }
            }
        ]);
        return resultado;
    } catch (error) {
        logger.error(`[RelatorioService] Erro ao calcular faturamento dos últimos meses para empresa ${empresaId}: ${error.message}`);
        throw new Error('Erro ao calcular faturamento dos últimos meses.');
    }
};


// --- 2. NOVA FUNÇÃO ADICIONADA ---

/**
 * Obtém o faturamento total dentro de um período específico (dataInicio, dataFim).
 * As datas já chegam validadas do controller.
 */
exports.getFaturamentoPorPeriodo = async (empresaId, dataInicio, dataFim) => {
    logger.info(`[RelatorioService] Buscando faturamento para empresa ${empresaId} de ${dataInicio} até ${dataFim}`);
    
    try {
        const empId = new mongoose.Types.ObjectId(empresaId);

        // 3. LÓGICA DE TIMEZONE (FUSO HORÁRIO)
        // Garante que a busca cubra o dia inteiro, independente do fuso.
        
        // Converte a string "YYYY-MM-DD" para um objeto Date
        const inicioQuery = new Date(dataInicio); 
        // Define para meia-noite UTC do dia de início
        inicioQuery.setUTCHours(0, 0, 0, 0); 

        const fimQuery = new Date(dataFim);
        // Define para o último segundo UTC do dia de fim
        fimQuery.setUTCHours(23, 59, 59, 999); 

        logger.debug(`[RelatorioService] Intervalo de query (UTC): ${inicioQuery.toISOString()} até ${fimQuery.toISOString()}`);

        // 4. AGREGAÇÃO
        const resultado = await Aluguel.aggregate([
            {
                $match: {
                    empresa_id: empId,
                    createdAt: { // Filtra pela data de criação do aluguel
                        $gte: inicioQuery,
                        $lte: fimQuery
                    }
                }
            },
            {
                $group: {
                    _id: null, // Agrupa tudo num só resultado
                    total: { $sum: '$valorTotal' }, // Soma o valorTotal
                    count: { $sum: 1 } // Conta quantos alugueis
                }
            },
            {
                $project: {
                    _id: 0,
                    faturamentoTotal: '$total',
                    numeroAlugueis: '$count'
                }
            }
        ]);

        // Se não houver resultados, retorna 0
        if (resultado.length === 0) {
            return { faturamentoTotal: 0, numeroAlugueis: 0 };
        }

        return resultado[0];

    } catch (error) {
        logger.error(`[RelatorioService] Erro ao calcular faturamento por período para empresa ${empresaId}: ${error.message}`);
        // Re-lança o erro para ser tratado pelo errorHandler
        throw new Error('Erro ao calcular faturamento por período.');
    }
};