// controllers/placaController.js
const {
    createPlaca,
    updatePlaca,
    getAllPlacas,
    getPlacaById,
    deletePlaca,
    toggleDisponibilidade,
    getAllPlacaLocations,
    getPlacasDisponiveis // <--- 1. IMPORTAR O NOVO SERVIÇO
} = require('../services/placaService');
const logger = require('../config/logger');
const cacheService = require('../services/cacheService');/**
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


    try {
        const novaPlaca = await createPlaca(req.body, req.file, empresaId);

        // Invalidar cache de locations após criação
        await cacheService.del(`placas:locations:empresa:${empresaId}`);

        logger.info(`[PlacaController] Placa ${novaPlaca.numero_placa} (ID: ${novaPlaca.id}) criada com sucesso por ${userId}.`);
        res.status(201).json(novaPlaca); // Retorna o documento criado (populado)
    } catch (error) {
        logger.error(`[PlacaController] Erro ao chamar placaService.createPlaca: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};/**
 * Controller para atualizar uma placa existente.
 * PUT /api/v1/placas/:id
 */
exports.updatePlacaController = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    const userId = req.user.id;
    const { id: placaIdToUpdate } = req.params;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou updatePlaca para ID: ${placaIdToUpdate} na empresa ${empresaId}.`);
    logger.debug(`[PlacaController] Dados recebidos (body): ${JSON.stringify(req.body)}`);
    logger.debug(`[PlacaController] Ficheiro recebido: ${req.file ? req.file.key : 'Nenhum/Manter/Remover'}`);


    try {
        const placaAtualizada = await updatePlaca(placaIdToUpdate, req.body, req.file, empresaId);

        // Invalidar cache de locations após atualização
        await cacheService.del(`placas:locations:empresa:${empresaId}`);

        logger.info(`[PlacaController] Placa ID ${placaIdToUpdate} atualizada com sucesso por ${userId}.`);
        res.status(200).json(placaAtualizada); // Retorna o documento atualizado (populado)
    } catch (error) {
         logger.error(`[PlacaController] Erro ao chamar placaService.updatePlaca (ID: ${placaIdToUpdate}): ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};/**
 * Controller para buscar todas as placas (com filtros, paginação).
 * GET /api/v1/placas
 */
exports.getAllPlacasController = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    const userId = req.user.id;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou getAllPlacas para empresa ${empresaId}.`);
    logger.debug(`[PlacaController] Query Params: ${JSON.stringify(req.query)}`);

    try {
        const result = await getAllPlacas(empresaId, req.query);
        logger.info(`[PlacaController] getAllPlacas retornou ${result.data.length} placas na página ${result.pagination.currentPage} (Total: ${result.pagination.totalDocs}).`);
        res.status(200).json(result); // Retorna { data: [...], pagination: {...} }
    } catch (error) {
        logger.error(`[PlacaController] Erro ao chamar placaService.getAllPlacas: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};

/**
 * Controller para buscar uma placa específica pelo ID.
 * GET /api/v1/placas/:id
 */
exports.getPlacaByIdController = async (req, res, next) => {
     const empresaId = req.user.empresaId;
     const userId = req.user.id;
     const { id: placaIdToGet } = req.params;

     logger.info(`[PlacaController] Utilizador ${userId} requisitou getPlacaById para ID: ${placaIdToGet} na empresa ${empresaId}.`);

     try {
         const placa = await getPlacaById(placaIdToGet, empresaId);

         logger.info(`[PlacaController] Placa ID ${placaIdToGet} encontrada com sucesso.`);
         res.status(200).json(placa); // Retorna o objeto simples da placa (populado)
     } catch (error) {
         logger.error(`[PlacaController] Erro ao chamar placaService.getPlacaById (ID: ${placaIdToGet}): ${error.message}`, { status: error.status, stack: error.stack });
         next(error);
     }
 };

/**
 * Controller para apagar uma placa.
 * DELETE /api/v1/placas/:id
 */
 exports.deletePlacaController = async (req, res, next) => {
     const empresaId = req.user.empresaId;
     const userId = req.user.id;
     const { id: placaIdToDelete } = req.params;

     logger.info(`[PlacaController] Utilizador ${userId} requisitou deletePlaca para ID: ${placaIdToDelete} na empresa ${empresaId}.`);

     try {
         await deletePlaca(placaIdToDelete, empresaId);

         // Invalidar cache de locations após exclusão
         await cacheService.del(`placas:locations:empresa:${empresaId}`);

         logger.info(`[PlacaController] Placa ID ${placaIdToDelete} apagada com sucesso por ${userId}.`);
         res.status(204).send(); // No content
     } catch (error) {
          logger.error(`[PlacaController] Erro ao chamar placaService.deletePlaca (ID: ${placaIdToDelete}): ${error.message}`, { status: error.status, stack: error.stack });
         next(error);
     }
 };/**
 * Controller para alternar a disponibilidade (manutenção).
 * PATCH /api/v1/placas/:id/disponibilidade
 */
 exports.toggleDisponibilidadeController = async (req, res, next) => {
      const empresaId = req.user.empresaId;
      const userId = req.user.id;
      const { id: placaIdToToggle } = req.params;

      logger.info(`[PlacaController] Utilizador ${userId} requisitou toggleDisponibilidade para placa ID: ${placaIdToToggle} na empresa ${empresaId}.`);

     try {
         const placaAtualizada = await toggleDisponibilidade(placaIdToToggle, empresaId);
         
         // Invalidar cache de locations após alternar disponibilidade
         await cacheService.del(`placas:locations:empresa:${empresaId}`);
         
         logger.info(`[PlacaController] Disponibilidade da placa ID ${placaIdToToggle} alternada com sucesso para ${placaAtualizada.disponivel} por ${userId}.`);
         res.status(200).json(placaAtualizada); // Retorna a placa atualizada (populada, objeto simples)
     } catch (error) {
         logger.error(`[PlacaController] Erro ao chamar placaService.toggleDisponibilidade (ID: ${placaIdToToggle}): ${error.message}`, { status: error.status, stack: error.stack });
         next(error);
     }
 };/**
 * Controller para buscar todas as localizações de placas.
 * GET /api/v1/placas/locations
 */
 exports.getPlacaLocationsController = async (req, res, next) => {
      const empresaId = req.user.empresaId;
      const userId = req.user.id;

      logger.info(`[PlacaController] Utilizador ${userId} requisitou getPlacaLocations para empresa ${empresaId}.`);

     try {
         // Verificar cache primeiro
         const cacheKey = `placas:locations:empresa:${empresaId}`;
         const cachedLocations = await cacheService.get(cacheKey);
         
         if (cachedLocations) {
             logger.info(`[PlacaController] Cache HIT para getPlacaLocations empresa ${empresaId}.`);
             return res.status(200).json(cachedLocations);
         }

         // Cache MISS - buscar do banco
         logger.info(`[PlacaController] Cache MISS para getPlacaLocations empresa ${empresaId}. Consultando banco...`);
         const locations = await getAllPlacaLocations(empresaId);
         
         // Cachear resultado por 5 minutos
         await cacheService.set(cacheKey, locations, 300);
         
         logger.info(`[PlacaController] getPlacaLocations retornou ${locations.length} localizações.`);
         res.status(200).json(locations); // Retorna array de objetos simples
     } catch (error) {
         logger.error(`[PlacaController] Erro ao chamar placaService.getAllPlacaLocations: ${error.message}`, { status: error.status, stack: error.stack });
         next(error);
     }
 };
// =============================================================================
// == CONTROLLER CORRIGIDO (Passa req.query completo) ==
// =============================================================================

/**
 * Controller para buscar placas disponíveis por período.
 * GET /api/v1/placas/disponiveis
 */
exports.getPlacasDisponiveisController = async (req, res, next) => {
    const empresaId = req.user.empresaId;
    const userId = req.user.id;
    // Aceita tanto camelCase (frontend) quanto snake_case (legado)
    const dataInicio = req.query.dataInicio || req.query.data_inicio;
    const dataFim = req.query.dataFim || req.query.data_fim;

    logger.info(`[PlacaController] Utilizador ${userId} requisitou getPlacasDisponiveis para empresa ${empresaId}.`);

    // *** INÍCIO DA CORREÇÃO (LOG) ***
    // Loga todos os parâmetros de query, não apenas as datas
    logger.debug(`[PlacaController] Query Params: ${JSON.stringify(req.query)}`);
    // *** FIM DA CORREÇÃO (LOG) ***

    // Validação básica (idealmente, isso deve ser feito por um validador na rota)
    if (!dataInicio || !dataFim) {
        logger.warn(`[PlacaController] Requisição para getPlacasDisponiveis sem dataInicio ou dataFim.`);
        // Note: idealmente, isso é pego pelo 'disponibilidadeValidationRules'
        return res.status(400).json({ message: 'dataInicio e dataFim são obrigatórios.' });
    }    try {
        // *** INÍCIO DA CORREÇÃO (LÓGICA) ***
        // Passa o req.query completo (que inclui regiao e search) para o service
        const placas = await getPlacasDisponiveis(empresaId, dataInicio, dataFim, req.query);
        // *** FIM DA CORREÇÃO (LÓGICA) ***
        
        logger.info(`[PlacaController] getPlacasDisponiveis retornou ${placas.length} placas.`);
        
        // Retorna no formato { data: [...] } para alinhar com o frontend 
        // (que usa `select: (data) => data.data ?? []` no useQuery)
        res.status(200).json({ data: placas }); 
    } catch (error) {
         logger.error(`[PlacaController] Erro ao chamar placaService.getPlacasDisponiveis: ${error.message}`, { status: error.status, stack: error.stack });
        next(error);
    }
};