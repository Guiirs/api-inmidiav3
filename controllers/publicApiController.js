// controllers/publicApiController.js
const PublicApiService = require('../services/publicApiService'); // Serviço Mongoose
// const db = require('../config/database'); // <-- Remova esta linha


    const createPublicApiController = () => {
    const controller = {};
    // Instancia o serviço sem passar 'db'
    const publicApiService = new PublicApiService(); // <-- Alteração aqui

    controller.getAvailablePlacas = async (req, res, next) => {
        try {
            // Assume que apiKeyAuthMiddleware coloca a empresa encontrada em req.empresa
            // E que req.empresa.id contém o ObjectId (como string ou ObjectId)
            // Se o middleware não foi atualizado, req.empresa.id virá do Knex (número?) - ISSO PRECISARÁ SER CORRIGIDO NA PARTE 5
            if (!req.empresa || !req.empresa.id) { // Ajuste para _id se o middleware for atualizado
                 const error = new Error('Informação da empresa não encontrada após validação da API Key.');
                 error.status = 500; // Erro interno, pois o middleware deveria ter adicionado
                 throw error;
            }
            const empresa_id = req.empresa.id; // <-- Ponto de atenção para Parte 5
            // Chama o serviço refatorado
            const placas = await publicApiService.getAvailablePlacas(empresa_id);
            res.status(200).json(placas); // Serviço retorna a lista formatada
        } catch (err) {
            next(err);
        }
    };

    return controller;
};

module.exports = createPublicApiController();