// controllers/regiaoController.js

// const { validationResult } = require('express-validator'); // Não é mais necessário
// const mongoose = require('mongoose'); // Não é mais necessário para validação de ID
const RegiaoService = require('../services/regiaoService'); 
const logger = require('../config/logger');

// Instancia o serviço fora das funções do controller
const regiaoService = new RegiaoService();

/**
 * Controller para obter todas as regiões da empresa.
 * GET /api/v1/regioes
 */
exports.getAllRegioes = async (req, res, next) => {
    // [MELHORIA] Confia que authMiddleware já validou req.user e empresaId
    const empresa_id = req.user.empresaId;
    const userId = req.user.id; 

    logger.info(`[RegiaoController] Utilizador ${userId} requisitou getAllRegioes para empresa ${empresa_id}.`);

    try {
        // Chama o serviço
        const regioes = await regiaoService.getAll(empresa_id);
        logger.info(`[RegiaoController] getAllRegioes retornou ${regioes.length} regiões para empresa ${empresa_id}.`);
        res.status(200).json(regioes); // Serviço retorna a lista de objetos simples
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[RegiaoController] Erro ao chamar regiaoService.getAll: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para criar uma nova região.
 * POST /api/v1/regioes
 */
exports.createRegiao = async (req, res, next) => {
    // [MELHORIA] Confia que authMiddleware já validou req.user e empresaId
    const empresa_id = req.user.empresaId;
    const userId = req.user.id;
    const { nome } = req.body;

    logger.info(`[RegiaoController] Utilizador ${userId} requisitou createRegiao ('${nome}') para empresa ${empresa_id}.`);

    // [MELHORIA] Remove a verificação de validação (agora na rota)

    try {
        // Chama o serviço (passa nome validado e sanitizado)
        const novaRegiao = await regiaoService.create(nome, empresa_id);
        logger.info(`[RegiaoController] createRegiao bem-sucedida. Nova região ID: ${novaRegiao.id} ('${novaRegiao.nome}').`);
        res.status(201).json(novaRegiao); // Serviço retorna o novo documento
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[RegiaoController] Erro ao chamar regiaoService.create: ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para atualizar o nome de uma região existente.
 * PUT /api/v1/regioes/:id
 */
exports.updateRegiao = async (req, res, next) => {
    // [MELHORIA] Confia que authMiddleware já validou req.user e empresaId
    const empresa_id = req.user.empresaId;
    const userId = req.user.id;
    const { id: regiaoIdToUpdate } = req.params;
    const { nome: novoNome } = req.body; 

    logger.info(`[RegiaoController] Utilizador ${userId} requisitou updateRegiao para ID: ${regiaoIdToUpdate} na empresa ${empresa_id}. Novo nome: '${novoNome}'`);

    // [MELHORIA] Remove validação manual de ID (agora na rota)
    // [MELHORIA] Remove verificação de validação de body (agora na rota)

    try {
        // Chama o serviço
        const regiaoAtualizada = await regiaoService.update(regiaoIdToUpdate, novoNome, empresa_id);
        
        logger.info(`[RegiaoController] updateRegiao para ID ${regiaoIdToUpdate} concluído com sucesso.`);
        res.status(200).json(regiaoAtualizada); // Serviço retorna o documento atualizado
    } catch (err) {
         // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[RegiaoController] Erro ao chamar regiaoService.update (ID: ${regiaoIdToUpdate}): ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};

/**
 * Controller para apagar uma região.
 * DELETE /api/v1/regioes/:id
 */
exports.deleteRegiao = async (req, res, next) => {
    // [MELHORIA] Confia que authMiddleware já validou req.user e empresaId
    const empresa_id = req.user.empresaId;
    const userId = req.user.id;
    const { id: regiaoIdToDelete } = req.params;

    logger.info(`[RegiaoController] Utilizador ${userId} requisitou deleteRegiao para ID: ${regiaoIdToDelete} na empresa ${empresa_id}.`);

    // [MELHORIA] Remove validação manual de ID (agora na rota)

    try {
        // Chama o serviço (que verifica se está em uso)
        await regiaoService.delete(regiaoIdToDelete, empresa_id);
        logger.info(`[RegiaoController] deleteRegiao para ID ${regiaoIdToDelete} concluído com sucesso.`);
        res.status(204).send(); // No Content
    } catch (err) {
        // O erro (que deve ser um AppError do service) é passado para o errorHandler global
        logger.error(`[RegiaoController] Erro ao chamar regiaoService.delete (ID: ${regiaoIdToDelete}): ${err.message}`, { status: err.status, stack: err.stack });
        next(err);
    }
};