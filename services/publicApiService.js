// services/publicApiService.js
const Placa = require('../models/Placa'); // Importa o modelo Placa Mongoose
const Regiao = require('../models/Regiao'); // Importa o modelo Regiao para populate
const mongoose = require('mongoose'); // Importa mongoose para ObjectId
const logger = require('../config/logger'); // Importa o logger

class PublicApiService {
    constructor() {}

    /**
     * Obtém todas as placas marcadas como disponíveis para uma empresa específica.
     * @param {string | mongoose.Types.ObjectId} empresa_id - O ID da empresa (já validado pelo apiKeyAuthMiddleware).
     * @returns {Promise<Array<object>>} - Uma promessa que resolve para um array de placas disponíveis (objetos simples formatados).
     * @throws {Error} - Lança erro 400 (ID inválido) ou 500 (Erro interno).
     */
    async getAvailablePlacas(empresa_id) {
        logger.info(`[PublicApiService] Buscando placas disponíveis para empresa ID: ${empresa_id}.`);

        // Validação do ID da empresa (embora o middleware já deva garantir isso)
        if (!empresa_id || !mongoose.Types.ObjectId.isValid(empresa_id)) {
            const error = new Error('ID da empresa inválido fornecido.');
            error.status = 400; // Bad Request
            logger.error(`[PublicApiService] Falha ao buscar placas: ${error.message}`);
            throw error;
        }

        const empresaObjectId = new mongoose.Types.ObjectId(empresa_id); // Garante que é ObjectId

        try {
            logger.debug(`[PublicApiService] Executando query find() para placas disponíveis da empresa ${empresaObjectId}.`);
            // Busca as placas disponíveis
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

            // Mapeia o resultado para formatar o campo 'regiao' e garantir consistência
            const resultadoFormatado = placasDisponiveis.map(placa => ({
                numero_placa: placa.numero_placa || null, // Garante valor ou null
                coordenadas: placa.coordenadas || null,
                nomeDaRua: placa.nomeDaRua || null,
                tamanho: placa.tamanho || null,
                imagem: placa.imagem || null, // A URL já deve ser o nome base do ficheiro R2
                // Acessa o nome da região populada (que é um objeto simples devido ao .lean())
                regiao: placa.regiao ? placa.regiao.nome : null // Retorna nome ou null
            }));

            return resultadoFormatado;

        } catch (error) {
            // Loga e relança erros de DB como 500
            logger.error(`[PublicApiService] Erro Mongoose/DB ao buscar placas disponíveis para empresa ${empresa_id}: ${error.message}`, { stack: error.stack });
            const serviceError = new Error(`Erro interno ao buscar placas disponíveis: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }
}

module.exports = PublicApiService; // Exporta a classe