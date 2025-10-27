// controllers/userController.js
const { validationResult } = require('express-validator');
const UserService = require('../services/userService'); // Importa o serviço
const logger = require('../config/logger'); // Importa o logger

// Instancia o serviço fora das funções do controller
const userService = new UserService();

/**
 * Controller para obter o perfil do utilizador autenticado.
 */
exports.getUserProfile = async (req, res, next) => {
    // Verifica se req.user e req.user.id existem
    if (!req.user || !req.user.id) {
        logger.error('[UserController] getUserProfile: ID do utilizador em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const userId = req.user.id;
    
    logger.info(`[UserController] Utilizador ID ${userId} requisitou getUserProfile.`);

    try {
        // O ID do utilizador vem do token JWT
        const user = await userService.getProfile(userId);
        logger.info(`[UserController] Perfil do utilizador ID ${userId} encontrado com sucesso.`);
        // O serviço Mongoose já retorna os campos corretos (sem senha)
        res.status(200).json(user);
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[UserController] Erro ao chamar userService.getProfile (ID: ${userId}): ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (404, 500) vindo do serviço
        next(err);
    }
};

/**
 * Controller para atualizar o perfil do utilizador autenticado.
 */
exports.updateUserProfile = async (req, res, next) => {
    // Verifica se req.user e req.user.id existem
    if (!req.user || !req.user.id) {
        logger.error('[UserController] updateUserProfile: ID do utilizador em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const userId = req.user.id;

    logger.info(`[UserController] Utilizador ID ${userId} requisitou updateUserProfile.`);
    logger.debug(`[UserController] Dados recebidos para update: ${JSON.stringify(req.body)}`);

    // Validação de entrada (feita em routes/user.js usando express-validator)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        logger.warn(`[UserController] updateUserProfile: Erro de validação: ${firstError}`);
        // Retorna 400 Bad Request com a mensagem de erro da validação
        return res.status(400).json({ message: firstError });
    }

    try {
        // Chama o serviço refatorado
        const updatedUser = await userService.updateProfile(userId, req.body);
        
        logger.info(`[UserController] Perfil do utilizador ID ${userId} atualizado com sucesso.`);
        // O serviço já retorna o utilizador atualizado (sem senha)
        res.status(200).json({
            message: 'Dados do utilizador atualizados com sucesso.',
            user: updatedUser // Retorna o objeto do utilizador atualizado
        });
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[UserController] Erro ao chamar userService.updateProfile (ID: ${userId}): ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (400, 404, 409, 500) vindo do serviço
        next(err);
    }
};

/**
 * Controller para obter os dados da empresa associada (apenas Admin).
 */
exports.getEmpresaProfile = async (req, res, next) => {
    // Verifica se req.user, req.user.empresaId e req.user.role existem
    if (!req.user || !req.user.empresaId || !req.user.role) {
        logger.error('[UserController] getEmpresaProfile: Dados do utilizador/empresa em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
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
        // Loga o erro recebido do serviço
        logger.error(`[UserController] Erro ao chamar userService.getEmpresaProfile (Empresa: ${empresa_id}): ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (403, 404, 500) vindo do serviço
        next(err);
    }
};

/**
 * Controller para regenerar a API Key da empresa (apenas Admin com confirmação de senha).
 */
exports.regenerateEmpresaApiKey = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId/id existem
    if (!req.user || !req.user.id || !req.user.empresaId || !req.user.role) {
        logger.error('[UserController] regenerateEmpresaApiKey: Dados do utilizador/empresa em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const userId = req.user.id;
    const empresaId = req.user.empresaId;
    const userRole = req.user.role;
    const { password } = req.body; // Senha para verificação

    logger.info(`[UserController] Utilizador ID ${userId} requisitou regenerateEmpresaApiKey (Role: ${userRole}).`);

    // Validação de entrada (feita em routes/user.js usando express-validator)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        logger.warn(`[UserController] regenerateEmpresaApiKey: Erro de validação: ${firstError}`);
        return res.status(400).json({ message: firstError });
    }

    try {
        // Chama o serviço refatorado
        const result = await userService.regenerateApiKey(userId, empresaId, userRole, password);

        logger.info(`[UserController] API Key regenerada com sucesso para empresa ${empresaId} por admin ${userId}.`);
        
        // O serviço retorna fullApiKey e newPrefix
        res.status(200).json({
            message: 'API Key regenerada com sucesso! Guarde-a num local seguro.',
            fullApiKey: result.fullApiKey,
            newApiKeyPrefix: result.newPrefix
        });
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[UserController] Erro ao chamar userService.regenerateApiKey (Empresa: ${empresaId}): ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (400, 401, 403, 404, 500) vindo do serviço
        next(err);
    }
};

// Removido createUserController pois exportamos diretamente
// module.exports = createUserController();