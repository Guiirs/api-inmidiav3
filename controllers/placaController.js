// controllers/placaController.js

// <<< ALTERADO: Importa as funções específicas do serviço >>>
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

// --- Placa Controllers ---

/**
 * Controller para criar uma nova placa.
 */
exports.createPlacaController = async (req, res, next) => {
    try {
        // Verifica se req.user e req.user.empresaId existem
        if (!req.user || !req.user.empresaId) {
            logger.error('[PlacaController] Erro: Informações do utilizador (empresaId) em falta no token.');
            return res.status(401).json({ message: 'Autorização inválida ou em falta.' });
        }
        const empresaId = req.user.empresaId; // Obtido do token JWT via authMiddleware

        logger.info(`[PlacaController] Recebida requisição para criar placa. Empresa ID: ${empresaId}`);
        logger.debug(`[PlacaController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
        logger.debug(`[PlacaController] Ficheiro recebido: ${req.file ? req.file.key : 'Nenhum'}`);

        // <<< ALTERADO: Chama a função importada diretamente >>>
        const novaPlaca = await createPlaca(req.body, req.file, empresaId);
        logger.info(`[PlacaController] Placa criada com sucesso. ID: ${novaPlaca._id}`);
        res.status(201).json(novaPlaca);
    } catch (error) {
        logger.error(`[PlacaController] Erro ao criar placa: ${error.message}`, { stack: error.stack, body: req.body, file: req.file });
        next(error); // Passa para o errorHandler
    }
};

/**
 * Controller para atualizar uma placa existente.
 */
exports.updatePlacaController = async (req, res, next) => {
    try {
        const { id } = req.params;
         // Verifica se req.user e req.user.empresaId existem
         if (!req.user || !req.user.empresaId) {
            logger.error('[PlacaController] Erro: Informações do utilizador (empresaId) em falta no token.');
            return res.status(401).json({ message: 'Autorização inválida ou em falta.' });
        }
        const empresaId = req.user.empresaId;

        logger.info(`[PlacaController] Recebida requisição para atualizar placa ID: ${id}. Empresa ID: ${empresaId}`);
        logger.debug(`[PlacaController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
        logger.debug(`[PlacaController] Ficheiro recebido: ${req.file ? req.file.key : 'Nenhum/Manter/Remover'}`);

        // <<< ALTERADO: Chama a função importada diretamente >>>
        const placaAtualizada = await updatePlaca(id, req.body, req.file, empresaId);

        if (!placaAtualizada) {
             // Se o serviço retornar null (embora a lógica atual lance erro), trata como não encontrado
             logger.warn(`[PlacaController] Placa ID ${id} não encontrada para atualização (retorno do serviço foi null).`);
             return res.status(404).json({ message: 'Placa não encontrada.' });
        }

        logger.info(`[PlacaController] Placa ID ${id} atualizada com sucesso.`);
        res.status(200).json(placaAtualizada);
    } catch (error) {
        logger.error(`[PlacaController] Erro ao atualizar placa ID ${req.params.id}: ${error.message}`, { stack: error.stack, body: req.body, file: req.file });
         // Se for erro específico do serviço (ex: Placa não encontrada, Região inválida)
        if (error.message === 'Placa não encontrada.' || error.message === 'Região inválida.') {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};

/**
 * Controller para buscar todas as placas (com filtros, paginação).
 */
exports.getAllPlacasController = async (req, res, next) => {
    try {
         // Verifica se req.user e req.user.empresaId existem
         if (!req.user || !req.user.empresaId) {
            logger.error('[PlacaController] Erro: Informações do utilizador (empresaId) em falta no token.');
            return res.status(401).json({ message: 'Autorização inválida ou em falta.' });
        }
        const empresaId = req.user.empresaId;
        logger.info(`[PlacaController] Recebida requisição para buscar placas. Empresa ID: ${empresaId}, Query: ${JSON.stringify(req.query)}`);

        // <<< ALTERADO: Chama a função importada diretamente >>>
        const result = await getAllPlacas(empresaId, req.query);
        logger.info(`[PlacaController] Busca de placas concluída. Retornando ${result.data.length} placas na página ${result.pagination.currentPage}.`);
        res.status(200).json(result);
    } catch (error) {
         logger.error(`[PlacaController] Erro ao buscar placas: ${error.message}`, { stack: error.stack, query: req.query });
        next(error);
    }
};

/**
 * Controller para buscar uma placa específica pelo ID.
 */
exports.getPlacaByIdController = async (req, res, next) => {
     try {
         const { id } = req.params;
          // Verifica se req.user e req.user.empresaId existem
          if (!req.user || !req.user.empresaId) {
             logger.error('[PlacaController] Erro: Informações do utilizador (empresaId) em falta no token.');
             return res.status(401).json({ message: 'Autorização inválida ou em falta.' });
         }
         const empresaId = req.user.empresaId;
         logger.info(`[PlacaController] Recebida requisição para buscar placa ID: ${id}. Empresa ID: ${empresaId}`);

         // <<< ALTERADO: Chama a função importada diretamente >>>
         const placa = await getPlacaById(id, empresaId);

         if (!placa) {
              // Se o serviço retornar null (embora a lógica atual lance erro), trata como não encontrado
              logger.warn(`[PlacaController] Placa ID ${id} não encontrada na busca por ID (retorno do serviço foi null).`);
              return res.status(404).json({ message: 'Placa não encontrada.' });
         }

         logger.info(`[PlacaController] Placa ID ${id} encontrada.`);
         res.status(200).json(placa);
     } catch (error) {
         logger.error(`[PlacaController] Erro ao buscar placa ID ${req.params.id}: ${error.message}`, { stack: error.stack });
         if (error.message === 'Placa não encontrada.') {
            return res.status(404).json({ message: error.message });
         }
         next(error);
     }
 };

/**
 * Controller para apagar uma placa.
 */
 exports.deletePlacaController = async (req, res, next) => {
     try {
         const { id } = req.params;
          // Verifica se req.user e req.user.empresaId existem
          if (!req.user || !req.user.empresaId) {
             logger.error('[PlacaController] Erro: Informações do utilizador (empresaId) em falta no token.');
             return res.status(401).json({ message: 'Autorização inválida ou em falta.' });
         }
         const empresaId = req.user.empresaId;
         logger.info(`[PlacaController] Recebida requisição para apagar placa ID: ${id}. Empresa ID: ${empresaId}`);

         // <<< ALTERADO: Chama a função importada diretamente >>>
         await deletePlaca(id, empresaId);
         logger.info(`[PlacaController] Placa ID ${id} apagada com sucesso.`);
         res.status(204).send(); // No content
     } catch (error) {
          logger.error(`[PlacaController] Erro ao apagar placa ID ${req.params.id}: ${error.message}`, { stack: error.stack });
         if (error.message === 'Placa não encontrada.') {
            return res.status(404).json({ message: error.message });
         }
         // Se for erro por placa alugada, retorna 409 (Conflict)
         if (error.message.includes('alugada')) {
             return res.status(409).json({ message: error.message });
         }
         next(error);
     }
 };

/**
 * Controller para alternar a disponibilidade (manutenção).
 */
 exports.toggleDisponibilidadeController = async (req, res, next) => {
     try {
         const { id } = req.params;
          // Verifica se req.user e req.user.empresaId existem
          if (!req.user || !req.user.empresaId) {
             logger.error('[PlacaController] Erro: Informações do utilizador (empresaId) em falta no token.');
             return res.status(401).json({ message: 'Autorização inválida ou em falta.' });
         }
         const empresaId = req.user.empresaId;
         logger.info(`[PlacaController] Recebida requisição para alternar disponibilidade da placa ID: ${id}. Empresa ID: ${empresaId}`);

         // <<< ALTERADO: Chama a função importada diretamente >>>
         const placaAtualizada = await toggleDisponibilidade(id, empresaId);
         logger.info(`[PlacaController] Disponibilidade da placa ID ${id} alternada com sucesso para ${placaAtualizada.disponivel}.`);
         res.status(200).json(placaAtualizada);
     } catch (error) {
         logger.error(`[PlacaController] Erro ao alternar disponibilidade da placa ID ${req.params.id}: ${error.message}`, { stack: error.stack });
          if (error.message === 'Placa não encontrada.') {
             return res.status(404).json({ message: error.message });
          }
          // Se for erro por placa alugada, retorna 409 (Conflict)
          if (error.message.includes('alugada')) {
              return res.status(409).json({ message: error.message });
          }
         next(error);
     }
 };

/**
 * Controller para buscar todas as localizações de placas.
 */
 exports.getPlacaLocationsController = async (req, res, next) => {
     try {
          // Verifica se req.user e req.user.empresaId existem
          if (!req.user || !req.user.empresaId) {
             logger.error('[PlacaController] Erro: Informações do utilizador (empresaId) em falta no token.');
             return res.status(401).json({ message: 'Autorização inválida ou em falta.' });
         }
         const empresaId = req.user.empresaId;
         logger.info(`[PlacaController] Recebida requisição para buscar localizações de placas. Empresa ID: ${empresaId}`);

         // <<< ALTERADO: Chama a função importada diretamente >>>
         const locations = await getAllPlacaLocations(empresaId);
         logger.info(`[PlacaController] Busca de localizações concluída. Retornando ${locations.length} localizações.`);
         res.status(200).json(locations);
     } catch (error) {
          logger.error(`[PlacaController] Erro ao buscar localizações de placas: ${error.message}`, { stack: error.stack });
         next(error);
     }
 };