// controllers/placaController.js

const mongoose = require('mongoose'); // Para validar ObjectId
const { validationResult } = require('express-validator'); // Para validação (se usar nas rotas)
const {
    createPlaca,
    updatePlaca,
    getAllPlacas,
    getPlacaById,
    deletePlaca,
    toggleDisponibilidade,
    getAllPlacaLocations
} = require('../services/placaService'); // Importa as funções específicas do serviço
const logger = require('../config/logger'); // Importa o logger

/**
 * Controller para criar uma nova placa.
 */
exports.createPlacaController = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[PlacaController] createPlaca: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresaId = req.user.empresaId;
    const userId = req.user.id;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou createPlaca para empresa ${empresaId}.`);
    logger.debug(`[PlacaController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
    logger.debug(`[PlacaController] Ficheiro recebido: ${req.file ? req.file.key : 'Nenhum'}`);

    // Validação de entrada (se usar express-validator nas rotas de placas)
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     const firstError = errors.array({ onlyFirstError: true })[0].msg;
    //     logger.warn(`[PlacaController] createPlaca: Erro de validação: ${firstError}`);
    //     return res.status(400).json({ message: firstError });
    // }

    try {
        // Chama a função do serviço diretamente
        const novaPlaca = await createPlaca(req.body, req.file, empresaId);

        logger.info(`[PlacaController] Placa ${novaPlaca.numero_placa} (ID: ${novaPlaca.id}) criada com sucesso por ${userId}.`);
        res.status(201).json(novaPlaca); // Retorna o documento criado (populado)
    } catch (error) {
        // Loga o erro recebido do serviço antes de passar para o errorHandler
        logger.error(`[PlacaController] Erro ao chamar placaService.createPlaca: ${error.message}`, { status: error.status, stack: error.stack });
        // O errorHandler tratará o status (400, 404, 409, 500) vindo do serviço
        next(error);
    }
};

/**
 * Controller para atualizar uma placa existente.
 */
exports.updatePlacaController = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
     if (!req.user || !req.user.empresaId) {
        logger.error('[PlacaController] updatePlaca: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresaId = req.user.empresaId;
    const userId = req.user.id;
    const { id: placaIdToUpdate } = req.params; // ID da placa a atualizar

    logger.info(`[PlacaController] Utilizador ${userId} requisitou updatePlaca para ID: ${placaIdToUpdate} na empresa ${empresaId}.`);
    logger.debug(`[PlacaController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
    logger.debug(`[PlacaController] Ficheiro recebido: ${req.file ? req.file.key : 'Nenhum/Manter/Remover'}`);

    // Validação do ID da placa (formato ObjectId)
    if (!mongoose.Types.ObjectId.isValid(placaIdToUpdate)) {
        logger.warn(`[PlacaController] updatePlaca: ID da placa inválido (${placaIdToUpdate}).`);
        return res.status(400).json({ message: 'ID da placa inválido.' });
    }

    // Validação de entrada (se usar express-validator nas rotas)
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) { ... }

    try {
        // Chama a função do serviço diretamente
        const placaAtualizada = await updatePlaca(placaIdToUpdate, req.body, req.file, empresaId);

        // O serviço lança 404 se não encontrar
        logger.info(`[PlacaController] Placa ID ${placaIdToUpdate} atualizada com sucesso por ${userId}.`);
        res.status(200).json(placaAtualizada); // Retorna o documento atualizado (populado)
    } catch (error) {
        // Loga o erro recebido do serviço
         logger.error(`[PlacaController] Erro ao chamar placaService.updatePlaca (ID: ${placaIdToUpdate}): ${error.message}`, { status: error.status, stack: error.stack });
         // O errorHandler tratará o status (400, 404, 409, 500) vindo do serviço
        next(error);
    }
};

/**
 * Controller para buscar todas as placas (com filtros, paginação).
 */
exports.getAllPlacasController = async (req, res, next) => {
     // Verifica se req.user e req.user.empresaId existem
      if (!req.user || !req.user.empresaId) {
         logger.error('[PlacaController] getAllPlacas: Informações do utilizador (empresaId) em falta no token.');
         return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
     }
    const empresaId = req.user.empresaId;
    const userId = req.user.id;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou getAllPlacas para empresa ${empresaId}.`);
    logger.debug(`[PlacaController] Query Params: ${JSON.stringify(req.query)}`);

    try {
        // Chama a função do serviço diretamente, passando req.query para filtros/paginação
        const result = await getAllPlacas(empresaId, req.query);
        logger.info(`[PlacaController] getAllPlacas retornou ${result.data.length} placas na página ${result.pagination.currentPage} (Total: ${result.pagination.totalDocs}).`);
        res.status(200).json(result); // Retorna { data: [...], pagination: {...} }
    } catch (error) {
         // Loga o erro recebido do serviço
        logger.error(`[PlacaController] Erro ao chamar placaService.getAllPlacas: ${error.message}`, { status: error.status, stack: error.stack });
        // O errorHandler tratará o status (400 - paginação inválida, 500) vindo do serviço
        next(error);
    }
};

/**
 * Controller para buscar uma placa específica pelo ID.
 */
exports.getPlacaByIdController = async (req, res, next) => {
      // Verifica se req.user e req.user.empresaId existem
      if (!req.user || !req.user.empresaId) {
         logger.error('[PlacaController] getPlacaById: Informações do utilizador (empresaId) em falta no token.');
         return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
     }
     const empresaId = req.user.empresaId;
     const userId = req.user.id;
     const { id: placaIdToGet } = req.params; // ID da placa a buscar

     logger.info(`[PlacaController] Utilizador ${userId} requisitou getPlacaById para ID: ${placaIdToGet} na empresa ${empresaId}.`);

     // Validação do ID da placa
     if (!mongoose.Types.ObjectId.isValid(placaIdToGet)) {
        logger.warn(`[PlacaController] getPlacaById: ID da placa inválido (${placaIdToGet}).`);
        return res.status(400).json({ message: 'ID da placa inválido.' });
     }

     try {
         // Chama a função do serviço diretamente
         const placa = await getPlacaById(placaIdToGet, empresaId);

         // O serviço lança 404 se não encontrar
         logger.info(`[PlacaController] Placa ID ${placaIdToGet} encontrada com sucesso.`);
         res.status(200).json(placa); // Retorna o objeto simples da placa (populado)
     } catch (error) {
         // Loga o erro recebido do serviço
         logger.error(`[PlacaController] Erro ao chamar placaService.getPlacaById (ID: ${placaIdToGet}): ${error.message}`, { status: error.status, stack: error.stack });
         // O errorHandler tratará o status (404, 500) vindo do serviço
         next(error);
     }
 };

/**
 * Controller para apagar uma placa.
 */
 exports.deletePlacaController = async (req, res, next) => {
     // Verifica se req.user e req.user.empresaId existem
      if (!req.user || !req.user.empresaId) {
         logger.error('[PlacaController] deletePlaca: Informações do utilizador (empresaId) em falta no token.');
         return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
     }
     const empresaId = req.user.empresaId;
     const userId = req.user.id;
     const { id: placaIdToDelete } = req.params; // ID da placa a apagar

     logger.info(`[PlacaController] Utilizador ${userId} requisitou deletePlaca para ID: ${placaIdToDelete} na empresa ${empresaId}.`);

      // Validação do ID da placa
     if (!mongoose.Types.ObjectId.isValid(placaIdToDelete)) {
        logger.warn(`[PlacaController] deletePlaca: ID da placa inválido (${placaIdToDelete}).`);
        return res.status(400).json({ message: 'ID da placa inválido.' });
     }

     try {
         // Chama a função do serviço diretamente
         await deletePlaca(placaIdToDelete, empresaId);

         logger.info(`[PlacaController] Placa ID ${placaIdToDelete} apagada com sucesso por ${userId}.`);
         res.status(204).send(); // No content
     } catch (error) {
          // Loga o erro recebido do serviço
         logger.error(`[PlacaController] Erro ao chamar placaService.deletePlaca (ID: ${placaIdToDelete}): ${error.message}`, { status: error.status, stack: error.stack });
         // O errorHandler tratará o status (404, 409 - alugada, 500) vindo do serviço
         next(error);
     }
 };

/**
 * Controller para alternar a disponibilidade (manutenção).
 */
 exports.toggleDisponibilidadeController = async (req, res, next) => {
      // Verifica se req.user e req.user.empresaId existem
      if (!req.user || !req.user.empresaId) {
         logger.error('[PlacaController] toggleDisponibilidade: Informações do utilizador (empresaId) em falta no token.');
         return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
     }
     const empresaId = req.user.empresaId;
     const userId = req.user.id;
     const { id: placaIdToToggle } = req.params; // ID da placa

     logger.info(`[PlacaController] Utilizador ${userId} requisitou toggleDisponibilidade para placa ID: ${placaIdToToggle} na empresa ${empresaId}.`);

      // Validação do ID da placa
     if (!mongoose.Types.ObjectId.isValid(placaIdToToggle)) {
        logger.warn(`[PlacaController] toggleDisponibilidade: ID da placa inválido (${placaIdToToggle}).`);
        return res.status(400).json({ message: 'ID da placa inválido.' });
     }

     try {
         // Chama a função do serviço diretamente
         const placaAtualizada = await toggleDisponibilidade(placaIdToToggle, empresaId);
         logger.info(`[PlacaController] Disponibilidade da placa ID ${placaIdToToggle} alternada com sucesso para ${placaAtualizada.disponivel} por ${userId}.`);
         res.status(200).json(placaAtualizada); // Retorna a placa atualizada (populada, objeto simples)
     } catch (error) {
         // Loga o erro recebido do serviço
         logger.error(`[PlacaController] Erro ao chamar placaService.toggleDisponibilidade (ID: ${placaIdToToggle}): ${error.message}`, { status: error.status, stack: error.stack });
          // O errorHandler tratará o status (404, 409 - alugada, 500) vindo do serviço
         next(error);
     }
 };

/**
 * Controller para buscar todas as localizações de placas.
 */
 exports.getPlacaLocationsController = async (req, res, next) => {
      // Verifica se req.user e req.user.empresaId existem
      if (!req.user || !req.user.empresaId) {
         logger.error('[PlacaController] getPlacaLocations: Informações do utilizador (empresaId) em falta no token.');
         return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
     }
     const empresaId = req.user.empresaId;
     const userId = req.user.id;

     logger.info(`[PlacaController] Utilizador ${userId} requisitou getPlacaLocations para empresa ${empresaId}.`);

     try {
         // Chama a função do serviço diretamente
         const locations = await getAllPlacaLocations(empresaId);
         logger.info(`[PlacaController] getPlacaLocations retornou ${locations.length} localizações.`);
         res.status(200).json(locations); // Retorna array de objetos simples
     } catch (error) {
          // Loga o erro recebido do serviço
         logger.error(`[PlacaController] Erro ao chamar placaService.getAllPlacaLocations: ${error.message}`, { status: error.status, stack: error.stack });
         // O errorHandler tratará o status (provavelmente 500) vindo do serviço
         next(error);
     }
 };