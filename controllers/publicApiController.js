// controllers/publicApiController.js
const PublicApiService = require('../services/publicApiService'); // Serviço Mongoose
const logger = require('../config/logger'); // Importa o logger
const mongoose = require('mongoose'); // Para validar ObjectId (se necessário, embora o middleware já deva tratar)

// Instancia o serviço fora das funções do controller
const publicApiService = new PublicApiService();

/**
 * Controller para obter as placas disponíveis para a empresa autenticada via API Key.
 */
exports.getAvailablePlacas = async (req, res, next) => {
    logger.info(`[PublicApiController] Recebida requisição GET /public/placas/disponiveis.`);

    // Verifica se req.empresa existe e tem _id (adicionado pelo apiKeyAuthMiddleware)
    // O middleware apiKeyAuthMiddleware já deve ter validado a chave e encontrado a empresa
    if (!req.empresa || !req.empresa._id) { // Verifica a propriedade _id do documento Mongoose
        // Este erro não deveria acontecer se o middleware funcionou, indicando um problema interno
        logger.error('[PublicApiController] getAvailablePlacas: Informações da empresa (req.empresa._id) em falta após apiKeyAuthMiddleware.');
        // Retorna 500 Internal Server Error, pois é uma falha inesperada na pipeline
        return res.status(500).json({ message: 'Erro interno: Falha ao identificar a empresa associada à chave API.' });
    }
    const empresa_id = req.empresa._id; // Obtém o ObjectId da empresa
    const empresaNome = req.empresa.nome; // Para logging

    logger.info(`[PublicApiController] Chave API validada para empresa: ${empresaNome} (ID: ${empresa_id}). Buscando placas disponíveis.`);

    try {
        // Chama o serviço refatorado (que já tem validação de ID e tratamento de erros DB)
        const placas = await publicApiService.getAvailablePlacas(empresa_id);

        logger.info(`[PublicApiController] getAvailablePlacas retornou ${placas.length} placas disponíveis para empresa ${empresa_id}.`);
        res.status(200).json(placas); // Serviço retorna a lista formatada (objetos simples)
    } catch (err) {
        // Loga o erro recebido do serviço antes de passar para o errorHandler
        logger.error(`[PublicApiController] Erro ao chamar publicApiService.getAvailablePlacas para empresa ${empresa_id}: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (400 - ID inválido no serviço, 500) vindo do serviço
        next(err);
    }
};

// Removido createPublicApiController pois exportamos diretamente
// module.exports = createPublicApiController();