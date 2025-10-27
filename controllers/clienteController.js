// controllers/clienteController.js

const { validationResult } = require('express-validator'); // Para validação (se usar nas rotas)
const mongoose = require('mongoose'); // Para validar ObjectId
const {
    createCliente,
    updateCliente,
    getAllClientes,
    getClienteById,
    deleteCliente
} = require('../services/clienteService'); // Importa as funções específicas do serviço
const logger = require('../config/logger'); // Importa o logger

/**
 * Controller para criar um novo cliente.
 */
exports.createClienteController = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[ClienteController] createCliente: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresaId = req.user.empresaId;
    const adminUserId = req.user.id; // ID do utilizador que está a criar (para log)

    logger.info(`[ClienteController] Utilizador ${adminUserId} requisitou createCliente para empresa ${empresaId}.`);
    // Log do body pode ser útil, mas cuidado com dados sensíveis se houver
    logger.debug(`[ClienteController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
    // Log do ficheiro (se existir)
    logger.debug(`[ClienteController] Ficheiro recebido (logo): ${req.file ? req.file.key : 'Nenhum'}`);

    // Validação de entrada (se usar express-validator nas rotas, verificar aqui)
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     const firstError = errors.array({ onlyFirstError: true })[0].msg;
    //     logger.warn(`[ClienteController] createCliente: Erro de validação: ${firstError}`);
    //     return res.status(400).json({ message: firstError });
    // }

    try {
        // Chama a função do serviço diretamente
        const novoCliente = await createCliente(req.body, req.file, empresaId);

        logger.info(`[ClienteController] Cliente ${novoCliente.nome} (ID: ${novoCliente.id}) criado com sucesso por ${adminUserId}.`);
        res.status(201).json(novoCliente); // Retorna o documento criado
    } catch (error) {
        // Loga o erro recebido do serviço antes de passar para o errorHandler
        logger.error(`[ClienteController] Erro ao chamar clienteService.createCliente: ${error.message}`, { status: error.status, stack: error.stack });
        // O errorHandler tratará o status (400, 409, 500) vindo do serviço
        next(error);
    }
};

/**
 * Controller para atualizar um cliente existente.
 */
exports.updateClienteController = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[ClienteController] updateCliente: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresaId = req.user.empresaId;
    const adminUserId = req.user.id;
    const { id: clienteIdToUpdate } = req.params; // ID do cliente a atualizar

    logger.info(`[ClienteController] Utilizador ${adminUserId} requisitou updateCliente para ID: ${clienteIdToUpdate} na empresa ${empresaId}.`);
    logger.debug(`[ClienteController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
    logger.debug(`[ClienteController] Ficheiro recebido (logo): ${req.file ? req.file.key : 'Nenhum/Manter/Remover'}`);

    // Validação do ID do cliente (formato ObjectId)
    if (!mongoose.Types.ObjectId.isValid(clienteIdToUpdate)) {
        logger.warn(`[ClienteController] updateCliente: ID do cliente inválido (${clienteIdToUpdate}).`);
        return res.status(400).json({ message: 'ID do cliente inválido.' });
    }

    // Validação de entrada (se usar express-validator nas rotas)
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) { ... }

    try {
        // Chama a função do serviço diretamente
        const clienteAtualizado = await updateCliente(clienteIdToUpdate, req.body, req.file, empresaId);

        // O serviço lança 404 se não encontrar, então não precisamos verificar null aqui explicitamente
        logger.info(`[ClienteController] Cliente ID ${clienteIdToUpdate} atualizado com sucesso por ${adminUserId}.`);
        res.status(200).json(clienteAtualizado); // Retorna o documento atualizado
    } catch (error) {
        // Loga o erro recebido do serviço
        logger.error(`[ClienteController] Erro ao chamar clienteService.updateCliente (ID: ${clienteIdToUpdate}): ${error.message}`, { status: error.status, stack: error.stack });
        // O errorHandler tratará o status (400, 404, 409, 500) vindo do serviço
        next(error);
    }
};

/**
 * Controller para buscar todos os clientes da empresa.
 */
exports.getAllClientesController = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[ClienteController] getAllClientes: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresaId = req.user.empresaId;
    const userId = req.user.id;

    logger.info(`[ClienteController] Utilizador ${userId} requisitou getAllClientes para empresa ${empresaId}.`);

    try {
        // Chama a função do serviço diretamente
        const clientes = await getAllClientes(empresaId);

        logger.info(`[ClienteController] getAllClientes retornou ${clientes.length} clientes para empresa ${empresaId}.`);
        res.status(200).json(clientes); // Retorna a lista de objetos simples
    } catch (error) {
         // Loga o erro recebido do serviço
        logger.error(`[ClienteController] Erro ao chamar clienteService.getAllClientes: ${error.message}`, { status: error.status, stack: error.stack });
        // O errorHandler tratará o status (provavelmente 500) vindo do serviço
        next(error);
    }
};

/**
 * Controller para buscar um cliente específico pelo ID.
 */
exports.getClienteByIdController = async (req, res, next) => {
     // Verifica se req.user e req.user.empresaId existem
     if (!req.user || !req.user.empresaId) {
        logger.error('[ClienteController] getClienteById: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
     const empresaId = req.user.empresaId;
     const userId = req.user.id;
     const { id: clienteIdToGet } = req.params; // ID do cliente a buscar

     logger.info(`[ClienteController] Utilizador ${userId} requisitou getClienteById para ID: ${clienteIdToGet} na empresa ${empresaId}.`);

     // Validação do ID do cliente
     if (!mongoose.Types.ObjectId.isValid(clienteIdToGet)) {
        logger.warn(`[ClienteController] getClienteById: ID do cliente inválido (${clienteIdToGet}).`);
        return res.status(400).json({ message: 'ID do cliente inválido.' });
     }

     try {
         // Chama a função do serviço diretamente
         const cliente = await getClienteById(clienteIdToGet, empresaId);

         // O serviço lança 404 se não encontrar
         logger.info(`[ClienteController] Cliente ID ${clienteIdToGet} encontrado com sucesso.`);
         res.status(200).json(cliente); // Retorna o objeto simples do cliente
     } catch (error) {
         // Loga o erro recebido do serviço
         logger.error(`[ClienteController] Erro ao chamar clienteService.getClienteById (ID: ${clienteIdToGet}): ${error.message}`, { status: error.status, stack: error.stack });
         // O errorHandler tratará o status (404, 500) vindo do serviço
         next(error);
     }
 };

/**
 * Controller para apagar um cliente.
 */
 exports.deleteClienteController = async (req, res, next) => {
     // Verifica se req.user e req.user.empresaId existem
     if (!req.user || !req.user.empresaId) {
        logger.error('[ClienteController] deleteCliente: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
     const empresaId = req.user.empresaId;
     const adminUserId = req.user.id;
     const { id: clienteIdToDelete } = req.params; // ID do cliente a apagar

     logger.info(`[ClienteController] Utilizador ${adminUserId} requisitou deleteCliente para ID: ${clienteIdToDelete} na empresa ${empresaId}.`);

      // Validação do ID do cliente
     if (!mongoose.Types.ObjectId.isValid(clienteIdToDelete)) {
        logger.warn(`[ClienteController] deleteCliente: ID do cliente inválido (${clienteIdToDelete}).`);
        return res.status(400).json({ message: 'ID do cliente inválido.' });
     }

     try {
         // Chama a função do serviço diretamente
         await deleteCliente(clienteIdToDelete, empresaId);

         logger.info(`[ClienteController] Cliente ID ${clienteIdToDelete} apagado com sucesso por ${adminUserId}.`);
         res.status(204).send(); // No content
     } catch (error) {
         // Loga o erro recebido do serviço
         logger.error(`[ClienteController] Erro ao chamar clienteService.deleteCliente (ID: ${clienteIdToDelete}): ${error.message}`, { status: error.status, stack: error.stack });
         // O errorHandler tratará o status (404, 409 - aluguel ativo, 500) vindo do serviço
         next(error);
     }
 };