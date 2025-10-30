// controllers/placaController.js

// [REMOVIDO] Não é mais necessário para validação
// const mongoose = require('mongoose'); 
// const { validationResult } = require('express-validator'); 
const {
    createPlaca,
    updatePlaca,
    getAllPlacas,
    getPlacaById,
    deletePlaca,
    toggleDisponibilidade,
    getAllPlacaLocations
} = require('../services/placaService');
const logger = require('../config/logger');

/**
 * Controller para criar uma nova placa.
 * POST /api/v1/placas
 */
exports.createPlacaController = async (req, res, next) => {
    // [MELHORIA] Confia no authMiddleware
    const empresaId = req.user.empresaId;
    const userId = req.user.id;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou createPlaca para empresa ${empresaId}.`);
    logger.debug(`[PlacaController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
    logger.debug(`[PlacaController] Ficheiro recebido: ${req.file ? req.file.key : 'Nenhum'}`);

    // [MELHORIA] Remove validação de entrada (agora na rota)

    try {
        const novaPlaca = await createPlaca(req.body, req.file, empresaId);

        logger.info(`[PlacaController] Placa ${novaPlaca.numero_placa} (ID: ${novaPlaca.id}) criada com sucesso por ${userId}.`);
        res.status(201).json(novaPlaca); // Retorna o documento criado (populado)
    } catch (error) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[PlacaController] Erro ao chamar placaService.createPlaca: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para atualizar uma placa existente.
 * PUT /api/v1/placas/:id
 */
exports.updatePlacaController = async (req, res, next) => {
    // [MELHORIA] Confia no authMiddleware
    const empresaId = req.user.empresaId;
    const userId = req.user.id;
    const { id: placaIdToUpdate } = req.params;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou updatePlaca para ID: ${placaIdToUpdate} na empresa ${empresaId}.`);
    logger.debug(`[PlacaController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
    logger.debug(`[PlacaController] Ficheiro recebido: ${req.file ? req.file.key : 'Nenhum/Manter/Remover'}`);

    // [MELHORIA] Remove validação de ID (agora na rota)
    // [MELHORIA] Remove validação de entrada (agora na rota)

    try {
        const placaAtualizada = await updatePlaca(placaIdToUpdate, req.body, req.file, empresaId);

        logger.info(`[PlacaController] Placa ID ${placaIdToUpdate} atualizada com sucesso por ${userId}.`);
        res.status(200).json(placaAtualizada); // Retorna o documento atualizado (populado)
    } catch (error) {
         // O erro (que deve ser um AppError do service) é passado para o errorHandler global
         logger.error(`[PlacaController] Erro ao chamar placaService.updatePlaca (ID: ${placaIdToUpdate}): ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para buscar todas as placas (com filtros, paginação).
 * GET /api/v1/placas
 */
exports.getAllPlacasController = async (req, res, next) => {
    // [MELHORIA] Confia no authMiddleware
    const empresaId = req.user.empresaId;
    const userId = req.user.id;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou getAllPlacas para empresa ${empresaId}.`);
    logger.debug(`[PlacaController] Query Params: ${JSON.stringify(req.query)}`);

    try {
        const result = await getAllPlacas(empresaId, req.query);
        logger.info(`[PlacaController] getAllPlacas retornou ${result.data.length} placas na página ${result.pagination.currentPage} (Total: ${result.pagination.totalDocs}).`);
        res.status(200).json(result); // Retorna { data: [...], pagination: {...} }
    } catch (error) {
         // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[PlacaController] Erro ao chamar placaService.getAllPlacas: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para buscar uma placa específica pelo ID.
 * GET /api/v1/placas/:id
 */
exports.getPlacaByIdController = async (req, res, next) => {
     // [MELHORIA] Confia no authMiddleware
     const empresaId = req.user.empresaId;
     const userId = req.user.id;
     const { id: placaIdToGet } = req.params;

     logger.info(`[PlacaController] Utilizador ${userId} requisitou getPlacaById para ID: ${placaIdToGet} na empresa ${empresaId}.`);

     // [MELHORIA] Remove validação de ID (agora na rota)

     try {
         const placa = await getPlacaById(placaIdToGet, empresaId);

         logger.info(`[PlacaController] Placa ID ${placaIdToGet} encontrada com sucesso.`);
         res.status(200).json(placa); // Retorna o objeto simples da placa (populado)
     } catch (error) {
         // O erro (que deve ser um AppError do service) é passado para o errorHandler global
         logger.error(`[PlacaController] Erro ao chamar placaService.getPlacaById (ID: ${placaIdToGet}): ${error.message}`, { status: error.status, stack: error.stack });
         next(error);
     }
 };

/**
 * Controller para apagar uma placa.
 * DELETE /api/v1/placas/:id
 */
 exports.deletePlacaController = async (req, res, next) => {
     // [MELHORIA] Confia no authMiddleware
     const empresaId = req.user.empresaId;
     const userId = req.user.id;
     const { id: placaIdToDelete } = req.params;

     logger.info(`[PlacaController] Utilizador ${userId} requisitou deletePlaca para ID: ${placaIdToDelete} na empresa ${empresaId}.`);

      // [MELHORIA] Remove validação de ID (agora na rota)

     try {
         await deletePlaca(placaIdToDelete, empresaId);

         logger.info(`[PlacaController] Placa ID ${placaIdToDelete} apagada com sucesso por ${userId}.`);
         res.status(204).send(); // No content
     } catch (error) {
          // O erro (que deve ser um AppError do service) é passado para o errorHandler global
          logger.error(`[PlacaController] Erro ao chamar placaService.deletePlaca (ID: ${placaIdToDelete}): ${error.message}`, { status: error.status, stack: error.stack });
         next(error);
     }
 };

/**
 * Controller para alternar a disponibilidade (manutenção).
 * PATCH /api/v1/placas/:id/disponibilidade
 */
 exports.toggleDisponibilidadeController = async (req, res, next) => {
      // [MELHORIA] Confia no authMiddleware
      const empresaId = req.user.empresaId;
      const userId = req.user.id;
      const { id: placaIdToToggle } = req.params;

      logger.info(`[PlacaController] Utilizador ${userId} requisitou toggleDisponibilidade para placa ID: ${placaIdToToggle} na empresa ${empresaId}.`);

      // [MELHORIA] Remove validação de ID (agora na rota)

     try {
         const placaAtualizada = await toggleDisponibilidade(placaIdToToggle, empresaId);
         logger.info(`[PlacaController] Disponibilidade da placa ID ${placaIdToToggle} alternada com sucesso para ${placaAtualizada.disponivel} por ${userId}.`);
         res.status(200).json(placaAtualizada); // Retorna a placa atualizada (populada, objeto simples)
     } catch (error) {
         // O erro (que deve ser um AppError do service) é passado para o errorHandler global
         logger.error(`[PlacaController] Erro ao chamar placaService.toggleDisponibilidade (ID: ${placaIdToToggle}): ${error.message}`, { status: error.status, stack: error.stack });
         next(error);
     }
 };

/**
 * Controller para buscar todas as localizações de placas.
 * GET /api/v1/placas/locations
 */
 exports.getPlacaLocationsController = async (req, res, next) => {
      // [MELHORIA] Confia no authMiddleware
      const empresaId = req.user.empresaId;
      const userId = req.user.id;

      logger.info(`[PlacaController] Utilizador ${userId} requisitou getPlacaLocations para empresa ${empresaId}.`);

     try {
         const locations = await getAllPlacaLocations(empresaId);
         logger.info(`[PlacaController] getPlacaLocations retornou ${locations.length} localizações.`);
         res.status(200).json(locations); // Retorna array de objetos simples
     } catch (error) {
          // O erro (que deve ser um AppError do service) é passado para o errorHandler global
         logger.error(`[PlacaController] Erro ao chamar placaService.getAllPlacaLocations: ${error.message}`, { status: error.status, stack: error.stack });
         next(error);
     }
 };