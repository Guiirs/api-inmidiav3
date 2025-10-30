// InMidia/backend/services/relatorioService.js
const Placa = require('../models/Placa'); // Modelo Placa Mongoose
const Regiao = require('../models/Regiao'); // Modelo Regiao Mongoose
const mongoose = require('mongoose'); // Necessário para ObjectId
const logger = require('../config/logger'); // Importa o logger

class RelatorioService {
    constructor() {}

    /**
     * Gera um relatório de contagem de placas por região para uma empresa.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<Array<object>>} - Array com objetos { regiao: string, total_placas: number }.
     * @throws {Error} - Lança erro 500 em caso de falha na agregação.
     */
    async placasPorRegiao(empresa_id) { // (Esta função já estava correta)
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
            const serviceError = new Error(`Erro interno ao gerar relatório de placas por região: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }

    /**
     * Gera um resumo para o dashboard (total de placas, disponíveis, região principal).
     * @param {string} empresa_id - ObjectId da empresa. // 🐞 CORREÇÃO: Alterado de empresaId para empresa_id
     * @returns {Promise<object>} - Objeto com { totalPlacas, placasDisponiv
eis, regiaoPrincipal }.
     * @throws {Error} - Lança erro 500 em caso de falha nas queries.
     */
    async getDashboardSummary(empresa_id) { // 🐞 CORREÇÃO: Alterado de empresaId para empresa_id
        logger.info(`[RelatorioService] Iniciando 'getDashboardSummary' para empresa ${empresa_id}.`);
        const startTime = Date.now(); 

        // Adiciona verificação para o caso de o ID ainda vir nulo
        if (!empresa_id) {
             logger.warn("[RelatorioService] getDashboardSummary chamado sem empresa_id.");
             return { totalPlacas: 0, placasDisponiveis: 0, regiaoPrincipal: 'N/A' };
        }

        try {
            // Converte para ObjectId uma vez
            const empresaObjectId = new mongoose.Types.ObjectId(empresa_id); // 🐞 CORREÇÃO: Usa empresa_id

            // Define as promessas
            logger.debug(`[RelatorioService] Iniciando query countDocuments para totalPlacas.`);
            const totalPlacasPromise = Placa.countDocuments({ empresa: empresaObjectId });

            logger.debug(`[RelatorioService] Iniciando query countDocuments para placasDisponiveis.`);
            const placasDisponiveisPromise = Placa.countDocuments({ empresa: empresaObjectId, disponivel: true });

            logger.debug(`[RelatorioService] Iniciando pipeline de agregação para regiaoPrincipal.`);
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

            // Executa todas as promessas em paralelo
            const [totalPlacasResult, placasDisponiveisResult, regiaoPrincipalResultArray] = await Promise.all([
                totalPlacasPromise,
                placasDisponiveisPromise,
                regiaoPrincipalPromise
            ]);
            const endTimeQueries = Date.now();
            logger.debug(`[RelatorioService] Queries 'getDashboardSummary' concluídas em ${endTimeQueries - startTime}ms.`);
            logger.debug(`[RelatorioService] Resultados - Total: ${totalPlacasResult}, Disponíveis: ${placasDisponiveisResult}, Região Agg: ${JSON.stringify(regiaoPrincipalResultArray)}`);

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
            const serviceError = new Error(`Erro interno ao gerar resumo do dashboard: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }
}

module.exports = RelatorioService; // Exporta a classe