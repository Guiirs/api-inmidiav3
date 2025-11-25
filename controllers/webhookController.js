// controllers/webhookController.js
const webhookService = require('../services/webhookService');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

/**
 * Lista todos os webhooks da empresa
 */
exports.listarWebhooks = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        const { ativo } = req.query;

        const filtros = {};
        if (ativo !== undefined) {
            filtros.ativo = ativo === 'true';
        }

        const webhooks = await webhookService.listar(empresaId, filtros);

        res.status(200).json({
            sucesso: true,
            total: webhooks.length,
            webhooks
        });
    } catch (error) {
        logger.error(`[WebhookController] Erro ao listar webhooks: ${error.message}`);
        next(error);
    }
};

/**
 * Cria novo webhook
 */
exports.criarWebhook = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        const userId = req.user.id;
        const { nome, url, eventos, retry_config, headers } = req.body;

        const webhook = await webhookService.criar({
            empresa: empresaId,
            nome,
            url,
            eventos,
            retry_config,
            headers
        }, userId);

        logger.info(`[WebhookController] Webhook criado por usuário ${userId}: ${webhook.nome}`);

        res.status(201).json({
            sucesso: true,
            mensagem: 'Webhook criado com sucesso',
            webhook
        });
    } catch (error) {
        logger.error(`[WebhookController] Erro ao criar webhook: ${error.message}`);
        next(error);
    }
};

/**
 * Atualiza webhook existente
 */
exports.atualizarWebhook = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        const { webhookId } = req.params;
        const dados = req.body;

        const webhook = await webhookService.atualizar(webhookId, empresaId, dados);

        logger.info(`[WebhookController] Webhook atualizado: ${webhook.nome}`);

        res.status(200).json({
            sucesso: true,
            mensagem: 'Webhook atualizado com sucesso',
            webhook
        });
    } catch (error) {
        logger.error(`[WebhookController] Erro ao atualizar webhook: ${error.message}`);
        next(error);
    }
};

/**
 * Remove webhook
 */
exports.removerWebhook = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        const { webhookId } = req.params;

        await webhookService.remover(webhookId, empresaId);

        logger.info(`[WebhookController] Webhook removido: ${webhookId}`);

        res.status(200).json({
            sucesso: true,
            mensagem: 'Webhook removido com sucesso'
        });
    } catch (error) {
        logger.error(`[WebhookController] Erro ao remover webhook: ${error.message}`);
        next(error);
    }
};

/**
 * Regenera secret do webhook
 */
exports.regenerarSecret = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        const { webhookId } = req.params;

        const resultado = await webhookService.regenerarSecret(webhookId, empresaId);

        logger.info(`[WebhookController] Secret regenerado para webhook: ${webhookId}`);

        res.status(200).json({
            sucesso: true,
            ...resultado
        });
    } catch (error) {
        logger.error(`[WebhookController] Erro ao regenerar secret: ${error.message}`);
        next(error);
    }
};

/**
 * Testa webhook
 */
exports.testarWebhook = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        const { webhookId } = req.params;

        await webhookService.testar(webhookId, empresaId);

        res.status(200).json({
            sucesso: true,
            mensagem: 'Webhook de teste enviado com sucesso'
        });
    } catch (error) {
        logger.error(`[WebhookController] Erro ao testar webhook: ${error.message}`);
        next(error);
    }
};

/**
 * Busca detalhes de um webhook específico
 */
exports.buscarWebhook = async (req, res, next) => {
    try {
        const empresaId = req.user.empresaId;
        const { webhookId } = req.params;

        const webhooks = await webhookService.listar(empresaId, { _id: webhookId });

        if (webhooks.length === 0) {
            throw new AppError('Webhook não encontrado', 404);
        }

        res.status(200).json({
            sucesso: true,
            webhook: webhooks[0]
        });
    } catch (error) {
        logger.error(`[WebhookController] Erro ao buscar webhook: ${error.message}`);
        next(error);
    }
};
