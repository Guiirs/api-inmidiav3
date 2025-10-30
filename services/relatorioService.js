// services/relatorioService.js
const Placa = require('../models/Placa'); // Modelo Placa Mongoose
const Regiao = require('../models/Regiao'); // Modelo Regiao Mongoose
const Aluguel = require('../models/Aluguel'); // [MELHORIA] Importa Aluguel
const mongoose = require('mongoose'); // Necessário para ObjectId
const logger = require('../config/logger'); // Importa o logger
const AppError = require('../utils/AppError'); 

class RelatorioService {
    constructor() {}

    /**
     * Gera um relatório de contagem de placas por região para uma empresa.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<Array<object>>} - Array com objetos { regiao: string, total_placas: number }.
     * @throws {AppError} - Lança erro 500 em caso de falha na agregação.
     */
    async placasPorRegiao(empresa_id) {
        logger.info(`[RelatorioService] Iniciando agregação 'placasPorRegiao' para empresa ${empresa_id}.`);
        const startTime = Date.now(); 

        try {
            const aggregationPipeline = [
                { $match: { empresa: new mongoose.Types.ObjectId(empresa_id) } },
                {
                    $lookup: {
                        from: Regiao.collection.name, 
                        localField: 'regiao',         
                        foreignField: '_id',          
                        as: 'regiaoInfo'              
                    }
                },
                { $unwind: { path: '$regiaoInfo', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: { regiaoNome: { $ifNull: ['$regiaoInfo.nome', 'Sem Região'] } },
                        total_placas: { $sum: 1 } 
                    }
                },
                {
                    $project: {
                        _id: 0, 
                        regiao: '$_id.regiaoNome', 
                        total_placas: 1 
                    }
                },
                { $sort: { regiao: 1 } }
            ];

            logger.debug(`[RelatorioService] Executando pipeline de agregação 'placasPorRegiao'.`);
            const results = await Placa.aggregate(aggregationPipeline).exec();
            const endTime = Date.now();
            logger.info(`[RelatorioService] Agregação 'placasPorRegiao' concluída em ${endTime - startTime}ms. ${results.length} resultados.`);

            return results; 

        } catch (error) {
            const endTime = Date.now();
            logger.error(`[RelatorioService] Erro na agregação 'placasPorRegiao' (tempo: ${endTime - startTime}ms): ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao gerar relatório de placas por região: ${error.message}`, 500);
        }
    }

    /**
     * Gera um resumo para o dashboard. (Mantido)
     */
    async getDashboardSummary(empresa_id) {
        logger.info(`[RelatorioService] Iniciando 'getDashboardSummary' para empresa ${empresa_id}.`);
        const startTime = Date.now(); 

        try {
            const empresaObjectId = new mongoose.Types.ObjectId(empresa_id);
            const totalPlacasPromise = Placa.countDocuments({ empresa: empresaObjectId });
            const placasDisponiveisPromise = Placa.countDocuments({ empresa: empresaObjectId, disponivel: true });
            
            const regiaoPrincipalPipeline = [
                { $match: { empresa: empresaObjectId } },
                { $match: { regiao: { $ne: null } } }, 
                {
                    $lookup: {
                        from: Regiao.collection.name, localField: 'regiao',
                        foreignField: '_id', as: 'regiaoInfo'
                    }
                },
                { $unwind: '$regiaoInfo' },
                { $group: { _id: { regiaoNome: '$regiaoInfo.nome' }, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 1 },
                { $project: { _id: 0, nome: '$_id.regiaoNome' } }
            ];
            const regiaoPrincipalPromise = Placa.aggregate(regiaoPrincipalPipeline).exec();

            const [totalPlacasResult, placasDisponiveisResult, regiaoPrincipalResultArray] = await Promise.all([
                totalPlacasPromise, placasDisponiveisPromise, regiaoPrincipalPromise
            ]);
            const endTimeQueries = Date.now();
            logger.debug(`[RelatorioService] Queries 'getDashboardSummary' concluídas em ${endTimeQueries - startTime}ms.`);

            const regiaoPrincipal = regiaoPrincipalResultArray.length > 0 ? regiaoPrincipalResultArray[0].nome : 'N/A';
            const finalResult = {
                totalPlacas: totalPlacasResult || 0,
                placasDisponiveis: placasDisponiveisResult || 0,
                regiaoPrincipal: regiaoPrincipal,
            };
            const endTime = Date.now();
            logger.info(`[RelatorioService] 'getDashboardSummary' concluído em ${endTime - startTime}ms.`);

            return finalResult;

        } catch (error) {
            const endTime = Date.now();
            logger.error(`[RelatorioService] Erro nas queries 'getDashboardSummary' (tempo: ${endTime - startTime}ms): ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao gerar resumo do dashboard: ${error.message}`, 500);
        }
    }

    /**
     * [NOVO MÉTODO] Gera um relatório de ocupação das placas por dia dentro de um período.
     * Calcula quantos dias cada placa esteve alugada dentro do período e soma.
     * @param {string} empresaId - ObjectId da empresa.
     * @param {Date} dataInicio - Início do período a ser analisado.
     * @param {Date} dataFim - Fim do período a ser analisado.
     * @returns {Promise<object>} - { totalDiasAlugados: number, totalDiasPlacas: number, percentagem: number }.
     * @throws {AppError} - Lança erro 500.
     */
    async ocupacaoPorPeriodo(empresaId, dataInicio, dataFim) {
        logger.info(`[RelatorioService] Iniciando agregação 'ocupacaoPorPeriodo' para empresa ${empresaId}. Período: ${dataInicio.toISOString().split('T')[0]} a ${dataFim.toISOString().split('T')[0]}.`);
        const startTime = Date.now();
        const empresaObjectId = new mongoose.Types.ObjectId(empresaId);

        try {
            // 1. Calcular o número total de dias de disponibilidade no período
            const totalPlacas = await Placa.countDocuments({ empresa: empresaObjectId });
            
            // Se não há placas, retorna zero para evitar divisão por zero.
            if (totalPlacas === 0) {
                 logger.info('[RelatorioService] Nenhuma placa encontrada. Ocupação: 0%.');
                 return {
                     totalDiasAlugados: 0,
                     totalDiasPlacas: 0,
                     percentagem: 0,
                 };
            }
            
            // Calcula a diferença em dias (o +1 é para incluir o dia de início/fim)
            const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
            const totalDiasPlacas = totalPlacas * diffDays;
            
            // 2. Agregação: Calcular dias alugados no período
            const aggregationPipeline = [
                // 1. Filtra aluguéis pela empresa
                { $match: { empresa: empresaObjectId } },
                // 2. Filtra aluguéis que se sobrepõem ao período [dataInicio, dataFim]
                // Aluguel.data_inicio < dataFim E Aluguel.data_fim > dataInicio
                {
                    $match: {
                        data_inicio: { $lte: dataFim },
                        data_fim: { $gte: dataInicio }
                    }
                },
                // 3. Calcula o número de dias de aluguel que CAEM DENTRO do período de análise
                {
                    $addFields: {
                        // Data de Início Efetiva (o maior entre data_inicio do aluguel e dataInicio do período)
                        data_inicio_efetiva: { $max: ['$data_inicio', dataInicio] },
                        // Data de Fim Efetiva (o menor entre data_fim do aluguel e dataFim do período)
                        data_fim_efetiva: { $min: ['$data_fim', dataFim] }
                    }
                },
                // 4. Calcula a duração em milissegundos e converte para dias (+1 para inclusão do dia)
                {
                    $addFields: {
                        duracao_ms: { 
                            $subtract: ['$data_fim_efetiva', '$data_inicio_efetiva'] 
                        }
                    }
                },
                {
                    $addFields: {
                        dias_alugados: { 
                            $add: [
                                { $ceil: { $divide: ['$duracao_ms', 1000 * 60 * 60 * 24] } },
                                1 // Adiciona 1 dia para inclusão (since both start and end days are included)
                            ]
                        }
                    }
                },
                // 5. Agrupa para somar os dias alugados (não precisamos agrupar por placa, apenas somar o total)
                {
                    $group: {
                        _id: null,
                        totalDiasAlugados: { $sum: '$dias_alugados' }
                    }
                },
                { $project: { _id: 0, totalDiasAlugados: 1 } }
            ];

            logger.debug('[RelatorioService] Executando pipeline de agregação para calcular dias alugados.');
            const aggregationResult = await Aluguel.aggregate(aggregationPipeline).exec();
            
            const totalDiasAlugados = aggregationResult[0]?.totalDiasAlugados || 0;
            
            const percentagem = totalDiasPlacas > 0 
                ? (totalDiasAlugados / totalDiasPlacas) * 100 
                : 0;

            const finalResult = {
                totalDiasAlugados: Math.round(totalDiasAlugados),
                totalDiasPlacas: totalDiasPlacas,
                percentagem: parseFloat(percentagem.toFixed(2)),
            };

            const endTime = Date.now();
            logger.info(`[RelatorioService] 'ocupacaoPorPeriodo' concluído em ${endTime - startTime}ms. Ocupação: ${finalResult.percentagem}%.`);

            return finalResult;

        } catch (error) {
            const endTime = Date.now();
            logger.error(`[RelatorioService] Erro na agregação 'ocupacaoPorPeriodo' (tempo: ${endTime - startTime}ms): ${error.message}`, { stack: error.stack });
            throw new AppError(`Erro interno ao gerar relatório de ocupação: ${error.message}`, 500);
        }
    }
}

module.exports = RelatorioService;