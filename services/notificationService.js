// services/notificationService.js
const logger = require('../config/logger');

/**
 * Serviço de Notificações em Tempo Real via WebSocket
 * Gerencia envio de notificações para clientes conectados via Socket.IO
 */
class NotificationService {
    constructor() {
        this.io = null; // Será definido pelo server.js
    }

    /**
     * Inicializa o serviço com a instância do Socket.IO
     * @param {SocketIO.Server} io - Instância do Socket.IO
     */
    initialize(io) {
        this.io = io;
        logger.info('[NotificationService] Serviço de notificações inicializado com Socket.IO');
    }

    /**
     * Envia notificação para uma empresa específica
     * @param {string} empresaId - ID da empresa
     * @param {string} type - Tipo de notificação (placa_disponivel, contrato_criado, etc)
     * @param {object} data - Dados da notificação
     */
    notifyEmpresa(empresaId, type, data) {
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

    /**
     * Envia notificação para um usuário específico
     * @param {string} userId - ID do usuário
     * @param {string} type - Tipo de notificação
     * @param {object} data - Dados da notificação
     */
    notifyUser(userId, type, data) {
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

    /**
     * Envia notificação broadcast para todos os admins
     * @param {string} type - Tipo de notificação
     * @param {object} data - Dados da notificação
     */
    notifyAllAdmins(type, data) {
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

    /**
     * Tipos de notificações suportadas
     */
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

// Exporta singleton
module.exports = new NotificationService();
