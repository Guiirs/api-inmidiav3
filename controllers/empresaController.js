// InMidia/backend/controllers/empresaController.js
const EmpresaService = require('../services/empresaService');
// const { validationResult } = require('express-validator'); // Não é mais necessário
const logger = require('../config/logger');

// Instancia o serviço fora das funções do controller
const empresaService = new EmpresaService();

/**
 * Controller para registar uma nova empresa e o seu utilizador administrador.
 * POST /api/v1/empresas/register
 */
exports.register = async (req, res, next) => {
    logger.info('[EmpresaController] Recebida requisição POST /empresas/register.');
    logger.debug(`[EmpresaController] Dados recebidos (body): ${JSON.stringify(req.body)}`);

    // [MELHORIA] Remove a verificação de validationResult. Confia que a rota já a executou.

    try {
        const { nome_empresa, cnpj, username, email, password, nome, sobrenome } = req.body;

        // Monta o objeto esperado pelo serviço
        const registrationData = {
            nome_empresa,
            cnpj,
            adminUser: { username, email, password, nome, sobrenome }
        };

        // Chama o serviço refatorado (que já tem tratamento de erros robusto e usa transação)
        const result = await empresaService.register(registrationData);

        logger.info(`[EmpresaController] Empresa ${result.empresa.nome} (ID: ${result.empresa.id}) e admin ${result.user.username} (ID: ${result.user.id}) registados com sucesso.`);
        // Retorna 201 Created com os dados (incluindo a fullApiKey)
        res.status(201).json(result);
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[EmpresaController] Erro ao chamar empresaService.register: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};