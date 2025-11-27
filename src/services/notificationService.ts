// src/services/notificationService.ts
// @ts-nocheck
import logger from '../config/logger';

class NotificationService {
    io: any = null;

    constructor() {}

    initialize(io: any) {
        this.io = io;
        logger.info('[NotificationService] Serviço de notificações inicializado com Socket.IO');
    }

    notifyEmpresa(empresaId: string, type: string, data: any) {
        if (!this.io) {
            logger.warn('[NotificationService] Socket.IO não inicializado. Notificação não enviada.');
            return;
        }

        const room = `empresa_${empresaId}`;
        this.io.to(room).emit('notification', {
            type,
            data,
            timestamp: new Date().toISOString()
        });

        logger.info(`[NotificationService] Notificação enviada para empresa ${empresaId}: ${type}`);
    }

    notifyUser(userId: string, type: string, data: any) {
        if (!this.io) {
            logger.warn('[NotificationService] Socket.IO não inicializado. Notificação não enviada.');
            return;
        }

        const room = `user_${userId}`;
        this.io.to(room).emit('notification', {
            type,
            data,
            timestamp: new Date().toISOString()
        });

        logger.info(`[NotificationService] Notificação enviada para usuário ${userId}: ${type}`);
    }

    notifyAllAdmins(type: string, data: any) {
        if (!this.io) {
            logger.warn('[NotificationService] Socket.IO não inicializado. Notificação não enviada.');
            return;
        }

        this.io.to('admins').emit('notification', {
            type,
            data,
            timestamp: new Date().toISOString()
        });

        logger.info(`[NotificationService] Notificação broadcast enviada para todos os admins: ${type}`);
    }

    static TYPES = {
        PLACA_DISPONIVEL: 'placa_disponivel',
        PLACA_ALUGADA: 'placa_alugada',
        CONTRATO_CRIADO: 'contrato_criado',
        CONTRATO_EXPIRANDO: 'contrato_expirando',
        CONTRATO_EXPIRADO: 'contrato_expirado',
        PI_CRIADA: 'pi_criada',
        PI_APROVADA: 'pi_aprovada',
        CLIENTE_NOVO: 'cliente_novo',
        API_KEY_REGENERADA: 'api_key_regenerada',
        ALUGUEL_CRIADO: 'aluguel_criado',
        ALUGUEL_CANCELADO: 'aluguel_cancelado'
    };
}

export default new NotificationService();
