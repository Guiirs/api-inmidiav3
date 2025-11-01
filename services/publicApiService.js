// services/publicApiService.js
const Placa = require('../models/Placa'); 
const Regiao = require('../models/Regiao'); 
const mongoose = require('mongoose'); 
const logger = require('../config/logger');
const AppError = require('../utils/AppError'); // [MELHORIA] Importa AppError

class PublicApiService {
    constructor() {}

    /**
     * Obtém todas as placas marcadas como disponíveis para uma empresa específica.
     * @param {string | mongoose.Types.ObjectId} empresa_id - O ID da empresa (já validado pelo apiKeyAuthMiddleware).
     * @returns {Promise<Array<object>>} - Uma promessa que resolve para um array de placas disponíveis (objetos simples formatados).
     * @throws {AppError} - Lança erro 400 (ID inválido) ou 500 (Erro interno).
     */
    async getAvailablePlacas(empresa_id) {
        logger.info(`[PublicApiService] Buscando placas disponíveis para empresa ID: ${empresa_id}.`);

        // Validação do ID da empresa (embora o middleware já deva garantir o formato)
        if (!empresa_id || !mongoose.Types.ObjectId.isValid(empresa_id)) {
            // [MELHORIA] Usa AppError
            throw new AppError('ID da empresa inválido fornecido.', 400); 
        }

        const empresaObjectId = new mongoose.Types.ObjectId(empresa_id); 

        try {
            logger.debug(`[PublicApiService] Executando query find() para placas disponíveis da empresa ${empresaObjectId}.`);
            
            const placasDisponiveis = await Placa.find({
                    empresa: empresaObjectId, // Filtra pela empresa
                    disponivel: true         // Filtra apenas as disponíveis
                })
                .populate('regiao', 'nome') // Popula nome da região
                // Seleciona campos e exclui _id e __v explicitamente
                .select('numero_placa coordenadas nomeDaRua tamanho imagem regiao -_id -__v')
                .lean() // Retorna objetos simples
                .exec();
            logger.info(`[PublicApiService] Encontradas ${placasDisponiveis.length} placas disponíveis para empresa ${empresa_id}.`);

            // Mapeia o resultado para formatar o campo 'regiao' e garantir consistência (mantido)
            const resultadoFormatado = placasDisponiveis.map(placa => ({
                numero_placa: placa.numero_placa || null, 
                coordenadas: placa.coordenadas || null,
                nomeDaRua: placa.nomeDaRua || null,
                tamanho: placa.tamanho || null,
                imagem: placa.imagem || null, 
                // Acessa o nome da região populada
                regiao: placa.regiao ? placa.regiao.nome : null 
            }));

            return resultadoFormatado;

        } catch (error) {
            // Loga e relança erros de DB como 500
            logger.error(`[PublicApiService] Erro Mongoose/DB ao buscar placas disponíveis para empresa ${empresa_id}: ${error.message}`, { stack: error.stack });
            // [MELHORIA] Usa AppError
            throw new AppError(`Erro interno ao buscar placas disponíveis: ${error.message}`, 500);
        }
    }
}

module.exports = PublicApiService;