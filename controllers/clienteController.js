// controllers/clienteController.js

// const { validationResult } = require('express-validator'); // Não é mais necessário
// const mongoose = require('mongoose'); // Não é mais necessário para validação
const {
    createCliente,
    updateCliente,
    getAllClientes,
    getClienteById,
    deleteCliente
} = require('../services/clienteService');
const logger = require('../config/logger');

/**
 * Controller para criar um novo cliente.
 * POST /api/v1/clientes
 */
exports.createClienteController = async (req, res, next) => {
    // [MELHORIA] Remove verificação de autenticação redundante.
    const empresaId = req.user.empresaId;
    const adminUserId = req.user.id;

    logger.info(`[ClienteController] Utilizador ${adminUserId} requisitou createCliente para empresa ${empresaId}.`);
    logger.debug(`[ClienteController] Ficheiro recebido (logo): ${req.file ? req.file.key : 'Nenhum'}`);

    // [MELHORIA] Remove a verificação de validationResult (agora na rota)

    try {
        // Chama a função do serviço diretamente (os dados já vêm validados/sanitizados)
        const novoCliente = await createCliente(req.body, req.file, empresaId);

        logger.info(`[ClienteController] Cliente ${novoCliente.nome} (ID: ${novoCliente.id}) criado com sucesso por ${adminUserId}.`);
        res.status(201).json(novoCliente); // Retorna o documento criado (objeto formatado)
    } catch (error) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[ClienteController] Erro ao chamar clienteService.createCliente: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para atualizar um cliente existente.
 * PUT /api/v1/clientes/:id
 */
exports.updateClienteController = async (req, res, next) => {
    // [MELHORIA] Remove verificação de autenticação redundante.
    const empresaId = req.user.empresaId;
    const adminUserId = req.user.id;
    const { id: clienteIdToUpdate } = req.params;

    logger.info(`[ClienteController] Utilizador ${adminUserId} requisitou updateCliente para ID: ${clienteIdToUpdate} na empresa ${empresaId}.`);
    logger.debug(`[ClienteController] Ficheiro recebido (logo): ${req.file ? req.file.key : 'Nenhum/Manter/Remover'}`);

    // [MELHORIA] Remove validação manual de ID (agora na rota)
    // [MELHORIA] Remove verificação de validationResult (agora na rota)

    try {
        // Chama a função do serviço diretamente
        const clienteAtualizado = await updateCliente(clienteIdToUpdate, req.body, req.file, empresaId);

        logger.info(`[ClienteController] Cliente ID ${clienteIdToUpdate} atualizado com sucesso por ${adminUserId}.`);
        res.status(200).json(clienteAtualizado); // Retorna o documento atualizado (objeto formatado)
    } catch (error) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[ClienteController] Erro ao chamar clienteService.updateCliente (ID: ${clienteIdToUpdate}): ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para buscar todos os clientes da empresa.
 * GET /api/v1/clientes
 */
exports.getAllClientesController = async (req, res, next) => {
    // [MELHORIA] Remove verificação de autenticação redundante.
    const empresaId = req.user.empresaId;
    const userId = req.user.id;

    logger.info(`[ClienteController] Utilizador ${userId} requisitou getAllClientes para empresa ${empresaId}.`);

    try {
        const clientes = await getAllClientes(empresaId);

        logger.info(`[ClienteController] getAllClientes retornou ${clientes.length} clientes para empresa ${empresaId}.`);
        res.status(200).json(clientes); // Retorna a lista de objetos formatados
    } catch (error) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[ClienteController] Erro ao chamar clienteService.getAllClientes: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para buscar um cliente específico pelo ID.
 * GET /api/v1/clientes/:id
 */
exports.getClienteByIdController = async (req, res, next) => {
     // [MELHORIA] Remove verificação de autenticação redundante.
     const empresaId = req.user.empresaId;
     const userId = req.user.id;
     const { id: clienteIdToGet } = req.params;

     logger.info(`[ClienteController] Utilizador ${userId} requisitou getClienteById para ID: ${clienteIdToGet} na empresa ${empresaId}.`);

     // [MELHORIA] Remove validação manual de ID (agora na rota)

     try {
         const cliente = await getClienteById(clienteIdToGet, empresaId);

         logger.info(`[ClienteController] Cliente ID ${clienteIdToGet} encontrado com sucesso.`);
         res.status(200).json(cliente); // Retorna o objeto formatado
     } catch (error) {
         // O erro (que deve ser um AppError do service) é passado para o errorHandler global
         logger.error(`[ClienteController] Erro ao chamar clienteService.getClienteById (ID: ${clienteIdToGet}): ${error.message}`, { status: error.status, stack: error.stack });
         next(error);
     }
 };

/**
 * Controller para apagar um cliente.
 * DELETE /api/v1/clientes/:id
 */
 exports.deleteClienteController = async (req, res, next) => {
     // [MELHORIA] Remove verificação de autenticação redundante.
     const empresaId = req.user.empresaId;
     const adminUserId = req.user.id;
     const { id: clienteIdToDelete } = req.params;

     logger.info(`[ClienteController] Utilizador ${adminUserId} requisitou deleteCliente para ID: ${clienteIdToDelete} na empresa ${empresaId}.`);

      // [MELHORIA] Remove validação manual de ID (agora na rota)

     try {
         await deleteCliente(clienteIdToDelete, empresaId);

         logger.info(`[ClienteController] Cliente ID ${clienteIdToDelete} apagado com sucesso por ${adminUserId}.`);
         res.status(204).send(); // No content
     } catch (error) {
         // O erro (que deve ser um AppError do service) é passado para o errorHandler global
         logger.error(`[ClienteController] Erro ao chamar clienteService.deleteCliente (ID: ${clienteIdToDelete}): ${error.message}`, { status: error.status, stack: error.stack });
         next(error);
     }
 };