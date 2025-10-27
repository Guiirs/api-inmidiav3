// controllers/aluguelController.js
const { validationResult } = require('express-validator');
const AluguelService = require('../services/aluguelService'); // Serviço Mongoose
const logger = require('../config/logger'); // Importa o logger

// Instancia o serviço fora das funções do controller
const aluguelService = new AluguelService();

/**
 * Controller para obter o histórico de alugueis de uma placa específica.
 */
exports.getAlugueisByPlaca = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[AluguelController] getAlugueisByPlaca: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresa_id = req.user.empresaId;
    const { placaId } = req.params; // ID (_id) da placa

    logger.info(`[AluguelController] Requisitado getAlugueisByPlaca para placa ${placaId} na empresa ${empresa_id}.`);

    // Validação básica do placaId (formato ObjectId)
    if (!mongoose.Types.ObjectId.isValid(placaId)) {
        logger.warn(`[AluguelController] getAlugueisByPlaca: ID da placa inválido (${placaId}).`);
        return res.status(400).json({ message: 'ID da placa inválido.' });
    }

    try {
        // Chama o serviço refatorado
        const alugueis = await aluguelService.getAlugueisByPlaca(placaId, empresa_id);
        logger.info(`[AluguelController] getAlugueisByPlaca retornou ${alugueis.length} alugueis para placa ${placaId}.`);
        res.status(200).json(alugueis); // Serviço retorna lista de documentos populados
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[AluguelController] Erro ao chamar aluguelService.getAlugueisByPlaca: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (provavelmente 500) vindo do serviço
        next(err);
    }
};

/**
 * Controller para criar um novo aluguel.
 */
exports.createAluguel = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[AluguelController] createAluguel: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresa_id = req.user.empresaId;

    logger.info(`[AluguelController] Requisitado createAluguel para empresa ${empresa_id}.`);
    logger.debug(`[AluguelController] Dados recebidos para createAluguel: ${JSON.stringify(req.body)}`);

    // Validação de entrada (feita em aluguelRoutes.js usando express-validator)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        logger.warn(`[AluguelController] createAluguel: Erro de validação: ${firstError}`);
        // Retorna 400 Bad Request com a mensagem de erro da validação
        return res.status(400).json({ message: firstError });
    }

    try {
        // Chama o serviço refatorado (passa req.body que foi validado e sanitizado)
        const novoAluguel = await aluguelService.createAluguel(req.body, empresa_id);
        logger.info(`[AluguelController] createAluguel bem-sucedido. Novo aluguel ID: ${novoAluguel.id}`); // Usa 'id' mapeado
        res.status(201).json(novoAluguel); // Serviço retorna o novo documento (já populado e como objeto simples)
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[AluguelController] Erro ao chamar aluguelService.createAluguel: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (400 - datas inválidas, 409 - conflito, 500) vindo do serviço
        next(err);
    }
};

/**
 * Controller para apagar (cancelar) um aluguel.
 */
exports.deleteAluguel = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[AluguelController] deleteAluguel: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresa_id = req.user.empresaId;
    const { id: aluguelId } = req.params; // ID (_id) do aluguel a apagar

    logger.info(`[AluguelController] Requisitado deleteAluguel para ID ${aluguelId} na empresa ${empresa_id}.`);

    // Validação básica do aluguelId (formato ObjectId)
    if (!mongoose.Types.ObjectId.isValid(aluguelId)) {
        logger.warn(`[AluguelController] deleteAluguel: ID do aluguel inválido (${aluguelId}).`);
        return res.status(400).json({ message: 'ID do aluguel inválido.' });
    }

    try {
        // Chama o serviço refatorado
        const result = await aluguelService.deleteAluguel(aluguelId, empresa_id);
        logger.info(`[AluguelController] deleteAluguel para ID ${aluguelId} concluído com sucesso.`);
        // O serviço retorna { success: true, message: '...' } no sucesso (status 200 OK)
        // Se o serviço lançar erro 404, ele será capturado pelo catch
        res.status(200).json(result);
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[AluguelController] Erro ao chamar aluguelService.deleteAluguel: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (404, 500) vindo do serviço
        next(err);
    }
};

// Removido createAluguelController pois agora exportamos as funções diretamente
// module.exports = createAluguelController();