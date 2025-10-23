// controllers/publicApiController.js
const PublicApiService = require('../services/publicApiService'); // Garante que o nome do ficheiro aqui está em camelCase
const db = require('../config/database');


    const createPublicApiController = () => {
    const controller = {};
    const publicApiService = new PublicApiService(db);

    controller.getAvailablePlacas = async (req, res, next) => {
        try {
            const empresa_id = req.empresa.id;
            const placas = await publicApiService.getAvailablePlacas(empresa_id);
            res.status(200).json(placas);
        } catch (err) {
            next(err);
        }
    };

    return controller;
};

module.exports = createPublicApiController();
// Exporta o resultado da função, ou seja, o próprio objeto controller