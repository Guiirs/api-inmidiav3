// controllers/regiaoController.js
const { validationResult } = require('express-validator');
const mongoose = require('mongoose'); // Para validar ObjectId
const RegiaoService = require('../services/regiaoService'); // Serviço Mongoose
const logger = require('../config/logger'); // Importa o logger

// Instancia o serviço fora das funções do controller
const regiaoService = new RegiaoService();

/**
 * Controller para obter todas as regiões da empresa.
 */
exports.getAllRegioes = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[RegiaoController] getAllRegioes: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresa_id = req.user.empresaId;
    const userId = req.user.id; // Para logging

    logger.info(`[RegiaoController] Utilizador ${userId} requisitou getAllRegioes para empresa ${empresa_id}.`);

    try {
        // Chama o serviço refatorado
        const regioes = await regiaoService.getAll(empresa_id);
        logger.info(`[RegiaoController] getAllRegioes retornou ${regioes.length} regiões para empresa ${empresa_id}.`);
        res.status(200).json(regioes); // Serviço retorna a lista de objetos simples
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[RegiaoController] Erro ao chamar regiaoService.getAll: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (provavelmente 500) vindo do serviço
        next(err);
    }
};

/**
 * Controller para criar uma nova região.
 */
exports.createRegiao = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[RegiaoController] createRegiao: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresa_id = req.user.empresaId;
    const userId = req.user.id;
    const { nome } = req.body;

    logger.info(`[RegiaoController] Utilizador ${userId} requisitou createRegiao ('${nome}') para empresa ${empresa_id}.`);

    // Validação de entrada (feita em regiaoRoutes.js usando express-validator)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        logger.warn(`[RegiaoController] createRegiao: Erro de validação: ${firstError}`);
        // Retorna 400 Bad Request com a mensagem de erro da validação
        return res.status(400).json({ message: firstError });
    }

    try {
        // Chama o serviço refatorado (passa nome validado e sanitizado)
        const novaRegiao = await regiaoService.create(nome, empresa_id);
        logger.info(`[RegiaoController] createRegiao bem-sucedida. Nova região ID: ${novaRegiao.id} ('${novaRegiao.nome}').`); // Usa 'id' mapeado
        res.status(201).json(novaRegiao); // Serviço retorna o novo documento
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[RegiaoController] Erro ao chamar regiaoService.create: ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (400, 409, 500) vindo do serviço
        next(err);
    }
};

/**
 * Controller para atualizar o nome de uma região existente.
 */
exports.updateRegiao = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[RegiaoController] updateRegiao: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresa_id = req.user.empresaId;
    const userId = req.user.id;
    const { id: regiaoIdToUpdate } = req.params; // ID (_id) da região
    const { nome: novoNome } = req.body; // Novo nome

    logger.info(`[RegiaoController] Utilizador ${userId} requisitou updateRegiao para ID: ${regiaoIdToUpdate} na empresa ${empresa_id}. Novo nome: '${novoNome}'`);

    // Validação do ID da região (formato ObjectId)
    if (!mongoose.Types.ObjectId.isValid(regiaoIdToUpdate)) {
        logger.warn(`[RegiaoController] updateRegiao: ID da região inválido (${regiaoIdToUpdate}).`);
        return res.status(400).json({ message: 'ID da região inválido.' });
    }

    // Validação de entrada (feita em regiaoRoutes.js usando express-validator)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array({ onlyFirstError: true })[0].msg;
        logger.warn(`[RegiaoController] updateRegiao: Erro de validação: ${firstError}`);
        return res.status(400).json({ message: firstError });
    }

    try {
        // Chama o serviço refatorado
        const regiaoAtualizada = await regiaoService.update(regiaoIdToUpdate, novoNome, empresa_id);
        // O serviço lança 404 se não encontrar
        logger.info(`[RegiaoController] updateRegiao para ID ${regiaoIdToUpdate} concluído com sucesso.`);
        res.status(200).json(regiaoAtualizada); // Serviço retorna o documento atualizado
    } catch (err) {
         // Loga o erro recebido do serviço
        logger.error(`[RegiaoController] Erro ao chamar regiaoService.update (ID: ${regiaoIdToUpdate}): ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (400, 404, 409, 500) vindo do serviço
        next(err);
    }
};

/**
 * Controller para apagar uma região.
 */
exports.deleteRegiao = async (req, res, next) => {
    // Verifica se req.user e req.user.empresaId existem
    if (!req.user || !req.user.empresaId) {
        logger.error('[RegiaoController] deleteRegiao: Informações do utilizador (empresaId) em falta no token.');
        return res.status(401).json({ message: 'Autorização inválida ou dados em falta.' });
    }
    const empresa_id = req.user.empresaId;
    const userId = req.user.id;
    const { id: regiaoIdToDelete } = req.params; // ID (_id) da região

    logger.info(`[RegiaoController] Utilizador ${userId} requisitou deleteRegiao para ID: ${regiaoIdToDelete} na empresa ${empresa_id}.`);

    // Validação do ID da região
    if (!mongoose.Types.ObjectId.isValid(regiaoIdToDelete)) {
        logger.warn(`[RegiaoController] deleteRegiao: ID da região inválido (${regiaoIdToDelete}).`);
        return res.status(400).json({ message: 'ID da região inválido.' });
    }

    try {
        // Chama o serviço refatorado (que verifica se está em uso)
        await regiaoService.delete(regiaoIdToDelete, empresa_id);
        logger.info(`[RegiaoController] deleteRegiao para ID ${regiaoIdToDelete} concluído com sucesso.`);
        res.status(204).send(); // No Content
    } catch (err) {
        // Loga o erro recebido do serviço
        logger.error(`[RegiaoController] Erro ao chamar regiaoService.delete (ID: ${regiaoIdToDelete}): ${err.message}`, { status: err.status, stack: err.stack });
        // O errorHandler tratará o status (400 - em uso, 404, 500) vindo do serviço
        next(err);
    }
};

// Removido createRegiaoController pois exportamos diretamente
// module.exports = createRegiaoController();