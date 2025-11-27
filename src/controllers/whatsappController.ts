// @ts-nocheck
// src/controllers/whatsappController.ts
import { Response, NextFunction } from 'express';
import { IAuthRequest } from '../types/express';
import whatsappService from '../services/whatsappService';
import logger from '../config/logger';

/**
 * Obtém status do cliente WhatsApp
 */
export async function getStatus(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
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
    } catch (error: any) {
        logger.error(`[WhatsAppController] Erro ao obter status: ${error.message}`);
        next(error);
    }
}

/**
 * Envia relatório manualmente
 */
export async function enviarRelatorio(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        logger.info(`[WhatsAppController] Usuário ${(req.user as any).username} solicitou envio de relatório`);

        if (!whatsappService.isReady) {
            res.status(503).json({
                sucesso: false,
                mensagem: 'WhatsApp não está conectado. Aguarde a conexão ou escaneie o QR Code.'
            });
            return;
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
    } catch (error: any) {
        logger.error(`[WhatsAppController] Erro ao enviar relatório: ${error.message}`);
        next(error);
    }
}

/**
 * Envia mensagem customizada
 */
export async function enviarMensagem(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const { mensagem } = req.body;

        if (!mensagem || mensagem.trim().length === 0) {
            res.status(400).json({
                sucesso: false,
                mensagem: 'Mensagem é obrigatória'
            });
            return;
        }

        logger.info(`[WhatsAppController] Usuário ${(req.user as any).username} enviando mensagem customizada`);

        if (!whatsappService.isReady) {
            res.status(503).json({
                sucesso: false,
                mensagem: 'WhatsApp não está conectado.'
            });
            return;
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
    } catch (error: any) {
        logger.error(`[WhatsAppController] Erro ao enviar mensagem: ${error.message}`);
        next(error);
    }
}

/**
 * Reconecta o cliente WhatsApp
 */
export async function reconectar(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        logger.info(`[WhatsAppController] Usuário ${(req.user as any).username} solicitou reconexão`);

        await whatsappService.destroy();
        await whatsappService.initialize();

        res.status(200).json({
            sucesso: true,
            mensagem: 'Reconexão iniciada. Verifique os logs para o QR Code se necessário.'
        });
    } catch (error: any) {
        logger.error(`[WhatsAppController] Erro ao reconectar: ${error.message}`);
        next(error);
    }
}

/**
 * Lista grupos disponíveis
 */
export async function listarGrupos(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        if (!whatsappService.isReady || !whatsappService.client) {
            res.status(503).json({
                sucesso: false,
                mensagem: 'WhatsApp não está conectado.'
            });
            return;
        }

        const chats = await whatsappService.client.getChats();
        const grupos = chats
            .filter((chat: any) => chat.isGroup)
            .map((group: any) => ({
                id: group.id._serialized,
                nome: group.name,
                participantes: group.participants?.length || 0
            }));

        res.status(200).json({
            sucesso: true,
            total: grupos.length,
            grupos
        });
    } catch (error: any) {
        logger.error(`[WhatsAppController] Erro ao listar grupos: ${error.message}`);
        next(error);
    }
}

export default {
    getStatus,
    enviarRelatorio,
    enviarMensagem,
    reconectar,
    listarGrupos
};

