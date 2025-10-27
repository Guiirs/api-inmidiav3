// controllers/clienteController.js

// <<< ALTERADO: Importa as funções específicas do serviço >>>
const {
    createCliente,
    updateCliente,
    getAllClientes,
    getClienteById,
    deleteCliente
} = require('../services/clienteService');
const logger = require('../config/logger');

// --- Cliente Controllers ---

/**
 * Controller para criar um novo cliente.
 */
exports.createClienteController = async (req, res, next) => {
    try {
        // Verifica se req.user e req.user.empresaId existem
        if (!req.user || !req.user.empresaId) {
            logger.error('[ClienteController] Erro: Informações do utilizador (empresaId) em falta no token.');
            return res.status(401).json({ message: 'Autorização inválida ou em falta.' });
        }
        const empresaId = req.user.empresaId;

        logger.info(`[ClienteController] Recebida requisição para criar cliente. Empresa ID: ${empresaId}`);
        logger.debug(`[ClienteController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
        logger.debug(`[ClienteController] Ficheiro recebido (logo): ${req.file ? req.file.key : 'Nenhum'}`);

        // <<< REMOVIDO: const clienteService = new ClienteService(); >>>
        // <<< ALTERADO: Chama a função importada diretamente >>>
        const novoCliente = await createCliente(req.body, req.file, empresaId);

        logger.info(`[ClienteController] Cliente criado com sucesso. ID: ${novoCliente._id}`);
        res.status(201).json(novoCliente);
    } catch (error) {
        logger.error(`[ClienteController] Erro ao criar cliente: ${error.message}`, { stack: error.stack, body: req.body, file: req.file });
        next(error); // Passa para o errorHandler
    }
};

/**
 * Controller para atualizar um cliente existente.
 */
exports.updateClienteController = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Verifica se req.user e req.user.empresaId existem
        if (!req.user || !req.user.empresaId) {
            logger.error('[ClienteController] Erro: Informações do utilizador (empresaId) em falta no token.');
            return res.status(401).json({ message: 'Autorização inválida ou em falta.' });
        }
        const empresaId = req.user.empresaId;

        logger.info(`[ClienteController] Recebida requisição para atualizar cliente ID: ${id}. Empresa ID: ${empresaId}`);
        logger.debug(`[ClienteController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
        logger.debug(`[ClienteController] Ficheiro recebido (logo): ${req.file ? req.file.key : 'Nenhum/Manter/Remover'}`);

        // <<< REMOVIDO: const clienteService = new ClienteService(); >>>
        // <<< ALTERADO: Chama a função importada diretamente >>>
        const clienteAtualizado = await updateCliente(id, req.body, req.file, empresaId);

        if (!clienteAtualizado) {
             logger.warn(`[ClienteController] Cliente ID ${id} não encontrado para atualização (retorno do serviço foi null).`);
             return res.status(404).json({ message: 'Cliente não encontrado.' });
        }

        logger.info(`[ClienteController] Cliente ID ${id} atualizado com sucesso.`);
        res.status(200).json(clienteAtualizado);
    } catch (error) {
        logger.error(`[ClienteController] Erro ao atualizar cliente ID ${req.params.id}: ${error.message}`, { stack: error.stack, body: req.body, file: req.file });
        // Se for erro específico do serviço (ex: Cliente não encontrado)
        if (error.message === 'Cliente não encontrado.') {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};

/**
 * Controller para buscar todos os clientes.
 */
exports.getAllClientesController = async (req, res, next) => {
    try {
        // Verifica se req.user e req.user.empresaId existem
        if (!req.user || !req.user.empresaId) {
            logger.error('[ClienteController] Erro: Informações do utilizador (empresaId) em falta no token.');
            return res.status(401).json({ message: 'Autorização inválida ou em falta.' });
        }
        const empresaId = req.user.empresaId;
        logger.info(`[ClienteController] Recebida requisição para buscar clientes. Empresa ID: ${empresaId}`);

        // <<< REMOVIDO: const clienteService = new ClienteService(); >>>
        // <<< ALTERADO: Chama a função importada diretamente >>>
        const clientes = await getAllClientes(empresaId);

        logger.info(`[ClienteController] Busca de clientes concluída. Retornando ${clientes.length} clientes.`);
        res.status(200).json(clientes);
    } catch (error) {
         logger.error(`[ClienteController] Erro ao buscar clientes: ${error.message}`, { stack: error.stack });
        next(error);
    }
};

/**
 * Controller para buscar um cliente específico pelo ID.
 */
exports.getClienteByIdController = async (req, res, next) => {
     try {
         const { id } = req.params;
         // Verifica se req.user e req.user.empresaId existem
         if (!req.user || !req.user.empresaId) {
            logger.error('[ClienteController] Erro: Informações do utilizador (empresaId) em falta no token.');
            return res.status(401).json({ message: 'Autorização inválida ou em falta.' });
        }
         const empresaId = req.user.empresaId;
         logger.info(`[ClienteController] Recebida requisição para buscar cliente ID: ${id}. Empresa ID: ${empresaId}`);

         // <<< REMOVIDO: const clienteService = new ClienteService(); >>>
         // <<< ALTERADO: Chama a função importada diretamente >>>
         const cliente = await getClienteById(id, empresaId);

         if (!cliente) {
              logger.warn(`[ClienteController] Cliente ID ${id} não encontrado na busca por ID (retorno do serviço foi null).`);
              return res.status(404).json({ message: 'Cliente não encontrado.' });
         }

         logger.info(`[ClienteController] Cliente ID ${id} encontrado.`);
         res.status(200).json(cliente);
     } catch (error) {
         logger.error(`[ClienteController] Erro ao buscar cliente ID ${req.params.id}: ${error.message}`, { stack: error.stack });
         if (error.message === 'Cliente não encontrado.') {
            return res.status(404).json({ message: error.message });
         }
         next(error);
     }
 };

/**
 * Controller para apagar um cliente.
 */
 exports.deleteClienteController = async (req, res, next) => {
     try {
         const { id } = req.params;
         // Verifica se req.user e req.user.empresaId existem
         if (!req.user || !req.user.empresaId) {
            logger.error('[ClienteController] Erro: Informações do utilizador (empresaId) em falta no token.');
            return res.status(401).json({ message: 'Autorização inválida ou em falta.' });
        }
         const empresaId = req.user.empresaId;
         logger.info(`[ClienteController] Recebida requisição para apagar cliente ID: ${id}. Empresa ID: ${empresaId}`);

         // <<< REMOVIDO: const clienteService = new ClienteService(); >>>
         // <<< ALTERADO: Chama a função importada diretamente >>>
         await deleteCliente(id, empresaId);

         logger.info(`[ClienteController] Cliente ID ${id} apagado com sucesso.`);
         res.status(204).send(); // No content
     } catch (error) {
          logger.error(`[ClienteController] Erro ao apagar cliente ID ${req.params.id}: ${error.message}`, { stack: error.stack });
         if (error.message === 'Cliente não encontrado.') {
            return res.status(404).json({ message: error.message });
         }
         // Se for erro por alugueis existentes, retorna 409 (Conflict)
         if (error.message.includes('alugueis ativos ou agendados')) {
             return res.status(409).json({ message: error.message });
         }
         next(error);
     }
 };