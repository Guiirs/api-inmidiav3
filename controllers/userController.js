// controllers/userController.js
// const { validationResult } = require('express-validator'); // Não é mais necessário
const UserService = require('../services/userService'); 
const logger = require('../config/logger'); 

// Instancia o serviço fora das funções do controller
const userService = new UserService();

/**
 * Controller para obter o perfil do utilizador autenticado.
 * GET /api/v1/user/me
 */
exports.getUserProfile = async (req, res, next) => {
    // [MELHORIA] Confia que authMiddleware já validou req.user e ID.
    const userId = req.user.id;
    
    logger.info(`[UserController] Utilizador ID ${userId} requisitou getUserProfile.`);

    try {
        // O ID do utilizador vem do token JWT
        const user = await userService.getProfile(userId);
        logger.info(`[UserController] Perfil do utilizador ID ${userId} encontrado com sucesso.`);
        // O serviço Mongoose já retorna os campos corretos (sem senha)
        res.status(200).json(user);
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[UserController] Erro ao chamar userService.getProfile (ID: ${userId}): ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para atualizar o perfil do utilizador autenticado.
 * PUT /api/v1/user/me
 */
exports.updateUserProfile = async (req, res, next) => {
    // [MELHORIA] Confia que authMiddleware já validou req.user e ID.
    const userId = req.user.id;

    logger.info(`[UserController] Utilizador ID ${userId} requisitou updateUserProfile.`);
    logger.debug(`[UserController] Dados recebidos para update: ${JSON.stringify(req.body)}`);

    // [MELHORIA] Remove a verificação de validationResult (agora na rota)

    try {
        // Chama o serviço refatorado
        const updatedUser = await userService.updateProfile(userId, req.body);
        
        logger.info(`[UserController] Perfil do utilizador ID ${userId} atualizado com sucesso.`);
        // O serviço já retorna o utilizador atualizado (sem senha)
        res.status(200).json({
            message: 'Dados do utilizador atualizados com sucesso.',
            user: updatedUser 
        });
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[UserController] Erro ao chamar userService.updateProfile (ID: ${userId}): ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para obter os dados da empresa associada (apenas Admin).
 * GET /api/v1/user/me/empresa
 */
exports.getEmpresaProfile = async (req, res, next) => {
    // [MELHORIA] Confia que authMiddleware já validou todos os campos essenciais.
    const empresa_id = req.user.empresaId;
    const userRole = req.user.role;
    const userId = req.user.id;

    logger.info(`[UserController] Utilizador ID ${userId} requisitou getEmpresaProfile (Role: ${userRole}).`);

    try {
        // Chama o serviço refatorado
        const empresa = await userService.getEmpresaProfile(empresa_id, userRole);
        
        logger.info(`[UserController] Perfil da empresa ID ${empresa_id} encontrado com sucesso.`);
        res.status(200).json(empresa);
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[UserController] Erro ao chamar userService.getEmpresaProfile (Empresa: ${empresa_id}): ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para regenerar a API Key da empresa (apenas Admin com confirmação de senha).
 * POST /api/v1/user/me/empresa/regenerate-api-key
 */
exports.regenerateEmpresaApiKey = async (req, res, next) => {
    // [MELHORIA] Confia que authMiddleware já validou todos os campos essenciais.
    const userId = req.user.id;
    const empresaId = req.user.empresaId;
    const userRole = req.user.role;
    const { password } = req.body; // Senha para verificação

    logger.info(`[UserController] Utilizador ID ${userId} requisitou regenerateEmpresaApiKey (Role: ${userRole}).`);

    // [MELHORIA] Remove a verificação de validationResult (agora na rota)

    try {
        // Preparar dados de auditoria
        const auditData = {
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent')
        };

        // Chama o serviço refatorado com dados de auditoria
        const result = await userService.regenerateApiKey(userId, empresaId, userRole, password, auditData);

        logger.info(`[UserController] API Key regenerada com sucesso para empresa ${empresaId} por admin ${userId}.`);
        
        // O serviço retorna fullApiKey e newPrefix
        res.status(200).json({
            message: 'API Key regenerada com sucesso! Guarde-a num local seguro.',
            fullApiKey: result.fullApiKey,
            newApiKeyPrefix: result.newPrefix
        });
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[UserController] Erro ao chamar userService.regenerateApiKey (Empresa: ${empresaId}): ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};