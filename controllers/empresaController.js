// controllers/empresaController.js
const logger = require('../config/logger');
const empresaService = require('../services/empresaService');
const AppError = require('../utils/AppError'); // --- [CORREÇÃO] Importar AppError
const cacheService = require('../services/cacheService');

// Função existente (INTACTA)
const getApiKey = async (req, res, next) => {
    try {
        // O ID da empresa é obtido do utilizador autenticado
        const empresaId = req.user.empresaId; 
        const apiKey = await empresaService.getApiKey(empresaId);
        
        if (!apiKey) {
             return res.status(404).json({ message: 'API Key não encontrada.' });
        }
        
        res.status(200).json({ apiKey });
    } catch (error) {
        logger.error(`[EmpresaController] Erro ao buscar API Key: ${error.message}`);
        next(error);
    }
};

// Função existente (INTACTA)
const regenerateApiKey = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        
        // Poderia adicionar verificação de password aqui se necessário
        
        const newApiKey = await empresaService.regenerateApiKey(empresaId);
        
        res.status(200).json({ 
            message: 'API Key regenerada com sucesso.',
            apiKey: newApiKey 
        });
    } catch (error) {
        logger.error(`[EmpresaController] Erro ao regenerar API Key: ${error.message}`);
        next(error);
    }
};

// Função existente (INTACTA)
const getEmpresaDetails = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        
        // Verificar cache primeiro
        const cacheKey = `empresa:details:${empresaId}`;
        const cachedEmpresa = await cacheService.get(cacheKey);
        
        if (cachedEmpresa) {
            logger.info(`[EmpresaController] Cache HIT para getEmpresaDetails empresa ${empresaId}.`);
            return res.status(200).json({
                status: 'success',
                data: cachedEmpresa
            });
        }

        // Cache MISS - buscar do banco
        logger.info(`[EmpresaController] Cache MISS para getEmpresaDetails empresa ${empresaId}. Consultando banco...`);
        const empresa = await empresaService.getEmpresaDetails(empresaId);
        
        // Cachear por 10 minutos (dados de empresa mudam raramente)
        await cacheService.set(cacheKey, empresa, 600);
        
        res.status(200).json({
            status: 'success',
            data: empresa
        });
    } catch (error) {
        next(error);
    }
};

// Função existente (INTACTA)
const updateEmpresaDetails = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        const updateData = req.body;

        const empresaAtualizada = await empresaService.updateEmpresaDetails(empresaId, updateData);
        
        // Invalidar cache após atualização
        await cacheService.del(`empresa:details:${empresaId}`);
        
        res.status(200).json({
            status: 'success',
            message: 'Detalhes da empresa atualizados com sucesso.',
            data: empresaAtualizada
        });
    } catch (error) {
        next(error);
    }
};


// --- [CORREÇÃO] Nova função de controlador de registo adicionada ---
/**
 * Controller para registar uma nova Empresa e o seu Admin.
 * Esta rota é pública e não usa req.user.
 */
const registerEmpresaController = async (req, res, next) => {
    try {
        // Os dados vêm validados pelo 'registerValidationRules'
        const { nome_empresa, cnpj, username, email, password, nome, sobrenome } = req.body;

        const empresaData = {
            nome: nome_empresa,
            cnpj: cnpj,
        };
        
        const userData = {
            username,
            email,
            password,
            nome,
            sobrenome,
        };

        // Chamar o serviço que faz a transação
        const { empresa, user } = await empresaService.registerEmpresa(empresaData, userData);

        // Resposta de sucesso
        res.status(201).json({
            status: 'success',
            message: 'Empresa e utilizador administrador criados com sucesso. Por favor, faça login.',
            data: {
                empresaId: empresa._id,
                userId: user._id,
            }
        });

    } catch (error) {
        // Se o serviço lançar um AppError (ex: duplicado), passa-o para o errorHandler
        next(error); 
    }
};
// --- Fim da Correção ---


module.exports = {
    getApiKey,
    regenerateApiKey,
    getEmpresaDetails,
    updateEmpresaDetails,
    registerEmpresaController, // --- [CORREÇÃO] Exportar a nova função ---
};