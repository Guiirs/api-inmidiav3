// services/webhookService.js
const axios = require('axios');
const crypto = require('crypto');
const Webhook = require('../models/Webhook');
const logger = require('../config/logger');

/**
 * Serviço para gerenciar e disparar Webhooks
 */
class WebhookService {
    
    /**
     * Dispara webhook para evento específico
     * @param {string} empresaId - ID da empresa
     * @param {string} evento - Tipo do evento
     * @param {object} payload - Dados do evento
     */
    async disparar(empresaId, evento, payload) {
        try {
            // Busca webhooks ativos para este evento
            const webhooks = await Webhook.find({
                empresa: empresaId,
                ativo: true,
                eventos: evento
            }).select('+secret');

            if (webhooks.length === 0) {
                logger.debug(`[WebhookService] Nenhum webhook ativo para evento ${evento} na empresa ${empresaId}`);
                return;
            }

            logger.info(`[WebhookService] Disparando ${webhooks.length} webhook(s) para evento: ${evento}`);

            // Dispara todos os webhooks em paralelo
            const promises = webhooks.map(webhook => this._dispararWebhook(webhook, evento, payload));
            await Promise.allSettled(promises);

        } catch (error) {
            logger.error(`[WebhookService] Erro ao disparar webhooks: ${error.message}`);
        }
    }

    /**
     * Dispara um webhook individual com retry logic
     * @private
     */
    async _dispararWebhook(webhook, evento, payload) {
        const maxTentativas = webhook.retry_config?.max_tentativas || 3;
        const timeout = webhook.retry_config?.timeout_ms || 5000;

        for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
            try {
                // Prepara payload com timestamp e evento
                const webhookPayload = {
                    evento,
                    timestamp: new Date().toISOString(),
                    data: payload,
                    webhook_id: webhook._id
                };

                // Gera assinatura HMAC
                const signature = this._gerarAssinatura(webhookPayload, webhook.secret);

                // Prepara headers
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Event': evento,
                    'X-Webhook-Tentativa': tentativa,
                    'User-Agent': 'InMidia-Webhook/1.0',
                    ...Object.fromEntries(webhook.headers || {})
                };

                // Faz requisição HTTP
                const response = await axios.post(webhook.url, webhookPayload, {
                    headers,
                    timeout,
                    validateStatus: (status) => status >= 200 && status < 300
                });

                // Sucesso!
                await webhook.registrarDisparo(true);
                logger.info(`[WebhookService] ✅ Webhook ${webhook.nome} disparado com sucesso (tentativa ${tentativa})`);
                return;

            } catch (error) {
                const detalhes = error.response 
                    ? `HTTP ${error.response.status}: ${error.response.statusText}`
                    : error.message;

                logger.warn(`[WebhookService] ⚠️ Falha no webhook ${webhook.nome} (tentativa ${tentativa}/${maxTentativas}): ${detalhes}`);

                // Se for a última tentativa, registra falha
                if (tentativa === maxTentativas) {
                    await webhook.registrarDisparo(false, detalhes);
                    logger.error(`[WebhookService] ❌ Webhook ${webhook.nome} falhou após ${maxTentativas} tentativas`);
                }

                // Aguarda antes de tentar novamente (exponential backoff)
                if (tentativa < maxTentativas) {
                    await this._sleep(Math.pow(2, tentativa) * 1000);
                }
            }
        }
    }

    /**
     * Gera assinatura HMAC-SHA256 para validação
     * @private
     */
    _gerarAssinatura(payload, secret) {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(payload));
        return hmac.digest('hex');
    }

    /**
     * Helper para delay
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cria novo webhook
     */
    async criar(dados, userId) {
        try {
            // Gera secret aleatório
            const secret = crypto.randomBytes(32).toString('hex');

            const webhook = new Webhook({
                ...dados,
                secret,
                criado_por: userId
            });

            await webhook.save();
            logger.info(`[WebhookService] Webhook criado: ${webhook.nome} (${webhook._id})`);
            
            // Retorna sem o secret
            const webhookObj = webhook.toObject();
            delete webhookObj.secret;
            
            return webhookObj;
        } catch (error) {
            logger.error(`[WebhookService] Erro ao criar webhook: ${error.message}`);
            throw error;
        }
    }

    /**
     * Busca webhooks da empresa
     */
    async listar(empresaId, filtros = {}) {
        try {
            const query = { empresa: empresaId, ...filtros };
            const webhooks = await Webhook.find(query)
                .sort({ createdAt: -1 })
                .populate('criado_por', 'username email');

            return webhooks;
        } catch (error) {
            logger.error(`[WebhookService] Erro ao listar webhooks: ${error.message}`);
            throw error;
        }
    }

    /**
     * Atualiza webhook
     */
    async atualizar(webhookId, empresaId, dados) {
        try {
            const webhook = await Webhook.findOne({ _id: webhookId, empresa: empresaId });
            
            if (!webhook) {
                throw new Error('Webhook não encontrado');
            }

            // Atualiza campos permitidos
            const camposPermitidos = ['nome', 'url', 'eventos', 'ativo', 'retry_config', 'headers'];
            camposPermitidos.forEach(campo => {
                if (dados[campo] !== undefined) {
                    webhook[campo] = dados[campo];
                }
            });

            await webhook.save();
            logger.info(`[WebhookService] Webhook atualizado: ${webhook.nome} (${webhook._id})`);
            
            return webhook;
        } catch (error) {
            logger.error(`[WebhookService] Erro ao atualizar webhook: ${error.message}`);
            throw error;
        }
    }

    /**
     * Remove webhook
     */
    async remover(webhookId, empresaId) {
        try {
            const resultado = await Webhook.deleteOne({ _id: webhookId, empresa: empresaId });
            
            if (resultado.deletedCount === 0) {
                throw new Error('Webhook não encontrado');
            }

            logger.info(`[WebhookService] Webhook removido: ${webhookId}`);
            return true;
        } catch (error) {
            logger.error(`[WebhookService] Erro ao remover webhook: ${error.message}`);
            throw error;
        }
    }

    /**
     * Regenera secret de um webhook
     */
    async regenerarSecret(webhookId, empresaId) {
        try {
            const webhook = await Webhook.findOne({ _id: webhookId, empresa: empresaId });
            
            if (!webhook) {
                throw new Error('Webhook não encontrado');
            }

            webhook.secret = crypto.randomBytes(32).toString('hex');
            await webhook.save();

            logger.info(`[WebhookService] Secret regenerado para webhook: ${webhook.nome}`);
            
            // Retorna o novo secret (única vez que é exibido)
            return {
                webhook_id: webhook._id,
                secret: webhook.secret,
                mensagem: 'Secret regenerado com sucesso. Guarde-o em local seguro, não será exibido novamente.'
            };
        } catch (error) {
            logger.error(`[WebhookService] Erro ao regenerar secret: ${error.message}`);
            throw error;
        }
    }

    /**
     * Testa webhook enviando payload de exemplo
     */
    async testar(webhookId, empresaId) {
        try {
            const webhook = await Webhook.findOne({ _id: webhookId, empresa: empresaId }).select('+secret');
            
            if (!webhook) {
                throw new Error('Webhook não encontrado');
            }

            const payloadTeste = {
                mensagem: 'Este é um webhook de teste',
                teste: true,
                empresa_id: empresaId
            };

            await this._dispararWebhook(webhook, 'teste', payloadTeste);
            
            return { sucesso: true, mensagem: 'Webhook de teste enviado' };
        } catch (error) {
            logger.error(`[WebhookService] Erro ao testar webhook: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new WebhookService();
