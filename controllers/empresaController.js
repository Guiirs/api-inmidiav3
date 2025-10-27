// InMidia/backend/controllers/empresaController.js
const EmpresaService = require('../services/empresaService');
const { validationResult } = require('express-validator'); // Importa para verificar erros de validação
const logger = require('../config/logger'); // Importa o logger

// Instancia o serviço fora das funções do controller
const empresaService = new EmpresaService();

/**
 * Controller para registar uma nova empresa e o seu utilizador administrador.
 */
exports.register = async (req, res, next) => {
    logger.info('[EmpresaController] Recebida requisição POST /empresas/register.');
    logger.debug(`[EmpresaController] Dados recebidos (body): ${JSON.stringify(req.body)}`); // Cuidado com senha em logs detalhados

    // Verifica erros de validação detetados pelo express-validator (configurado nas rotas)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Pega a primeira mensagem de erro
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        logger.warn(`[EmpresaController] Registo falhou: Erro de validação: ${firstError}`);
        // Retorna 400 Bad Request com a mensagem de erro da validação
        return res.status(400).json({ message: firstError });
    }

    // Se a validação passou, continua para o serviço
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
        // Loga o erro recebido do serviço antes de passar para o errorHandler
        logger.error(`[EmpresaController] Erro ao chamar empresaService.register: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (400, 409, 500) vindo do serviço
        next(err);
    }
};

// Removido createEmpresaController pois agora exportamos as funções diretamente
// module.exports = createEmpresaController();