// controllers/whatsappController.js
const whatsappService = require('../services/whatsappService');
const logger = require('../config/logger');

/**
 * Obtém status do cliente WhatsApp
 */
exports.getStatus = async (req, res, next) => {
    try {
        const status = {
            conectado: whatsappService.isReady,
            grupo_configurado: !!whatsappService.groupId,
            grupo_id: whatsappService.groupId || null
        };

        res.status(200).json({
            sucesso: true,
            status
        });
    } catch (error) {
        logger.error(`[WhatsAppController] Erro ao obter status: ${error.message}`);
        next(error);
    }
};

/**
 * Envia relatório manualmente
 */
exports.enviarRelatorio = async (req, res, next) => {
    try {
        logger.info(`[WhatsAppController] Usuário ${req.user.username} solicitou envio de relatório`);

        if (!whatsappService.isReady) {
            return res.status(503).json({
                sucesso: false,
                mensagem: 'WhatsApp não está conectado. Aguarde a conexão ou escaneie o QR Code.'
            });
        }

        const sucesso = await whatsappService.enviarRelatorioDisponibilidade();

        if (sucesso) {
            res.status(200).json({
                sucesso: true,
                mensagem: 'Relatório enviado com sucesso!'
            });
        } else {
            res.status(500).json({
                sucesso: false,
                mensagem: 'Falha ao enviar relatório. Verifique os logs.'
            });
        }
    } catch (error) {
        logger.error(`[WhatsAppController] Erro ao enviar relatório: ${error.message}`);
        next(error);
    }
};

/**
 * Envia mensagem customizada
 */
exports.enviarMensagem = async (req, res, next) => {
    try {
        const { mensagem } = req.body;

        if (!mensagem || mensagem.trim().length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Mensagem é obrigatória'
            });
        }

        logger.info(`[WhatsAppController] Usuário ${req.user.username} enviando mensagem customizada`);

        if (!whatsappService.isReady) {
            return res.status(503).json({
                sucesso: false,
                mensagem: 'WhatsApp não está conectado.'
            });
        }

        const sucesso = await whatsappService.enviarMensagem(mensagem);

        if (sucesso) {
            res.status(200).json({
                sucesso: true,
                mensagem: 'Mensagem enviada com sucesso!'
            });
        } else {
            res.status(500).json({
                sucesso: false,
                mensagem: 'Falha ao enviar mensagem.'
            });
        }
    } catch (error) {
        logger.error(`[WhatsAppController] Erro ao enviar mensagem: ${error.message}`);
        next(error);
    }
};

/**
 * Reconecta o cliente WhatsApp
 */
exports.reconectar = async (req, res, next) => {
    try {
        logger.info(`[WhatsAppController] Usuário ${req.user.username} solicitou reconexão`);

        await whatsappService.destroy();
        await whatsappService.initialize();

        res.status(200).json({
            sucesso: true,
            mensagem: 'Reconexão iniciada. Verifique os logs para o QR Code se necessário.'
        });
    } catch (error) {
        logger.error(`[WhatsAppController] Erro ao reconectar: ${error.message}`);
        next(error);
    }
};

/**
 * Lista grupos disponíveis
 */
exports.listarGrupos = async (req, res, next) => {
    try {
        if (!whatsappService.isReady || !whatsappService.client) {
            return res.status(503).json({
                sucesso: false,
                mensagem: 'WhatsApp não está conectado.'
            });
        }

        const chats = await whatsappService.client.getChats();
        const grupos = chats
            .filter(chat => chat.isGroup)
            .map(group => ({
                id: group.id._serialized,
                nome: group.name,
                participantes: group.participants?.length || 0
            }));

        res.status(200).json({
            sucesso: true,
            total: grupos.length,
            grupos
        });
    } catch (error) {
        logger.error(`[WhatsAppController] Erro ao listar grupos: ${error.message}`);
        next(error);
    }
};
