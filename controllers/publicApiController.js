// controllers/publicApiController.js
const PublicApiService = require('../services/publicApiService'); // Serviço Mongoose
const logger = require('../config/logger'); // Importa o logger
// const mongoose = require('mongoose'); // Não é mais necessário

// Instancia o serviço fora das funções do controller
const publicApiService = new PublicApiService();

/**
 * Controller para obter as placas disponíveis para a empresa autenticada via API Key.
 * GET /api/v1/public/placas/disponiveis
 */
exports.getAvailablePlacas = async (req, res, next) => {
    logger.info(`[PublicApiController] Recebida requisição GET /public/placas/disponiveis.`);

    // [MELHORIA] Confia que apiKeyAuthMiddleware (aplicado na rota) já validou a chave
    // e anexou req.empresa com _id e nome válidos. Removemos a checagem redundante.
    const empresa_id = req.empresa._id; // Obtém o ObjectId da empresa
    const empresaNome = req.empresa.nome; // Para logging

    logger.info(`[PublicApiController] Chave API validada para empresa: ${empresaNome} (ID: ${empresa_id}). Buscando placas disponíveis.`);

    try {
        // Chama o serviço
        const placas = await publicApiService.getAvailablePlacas(empresa_id);

        logger.info(`[PublicApiController] getAvailablePlacas retornou ${placas.length} placas disponíveis para empresa ${empresa_id}.`);
        res.status(200).json(placas); // Serviço retorna a lista formatada (objetos simples)
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[PublicApiController] Erro ao chamar publicApiService.getAvailablePlacas para empresa ${empresa_id}: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

// Removido createPublicApiController pois exportamos diretamente
// module.exports = createPublicApiController();