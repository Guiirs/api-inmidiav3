// controllers/sseController.js
const logger = require('../config/logger');

/**
 * Controller para Server-Sent Events (SSE)
 * Permite streaming unidirecional de eventos do servidor para cliente
 */

// Map para armazenar conexões SSE ativas
const conexoesSSE = new Map();

/**
 * Endpoint SSE para notificações em tempo real
 * Cliente deve manter conexão aberta
 */
exports.streamNotificacoes = (req, res) => {
    const userId = req.user.id;
    const empresaId = req.user.empresaId;
    const connectionId = `${userId}_${Date.now()}`;

    logger.info(`[SSE] Cliente conectado: ${req.user.username} (${connectionId})`);

    // Configura headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx

    // Envia evento de conexão estabelecida
    res.write(`data: ${JSON.stringify({
        type: 'connected',
        message: 'Conexão SSE estabelecida',
        timestamp: new Date().toISOString()
    })}\n\n`);

    // Armazena conexão
    conexoesSSE.set(connectionId, {
        res,
        userId,
        empresaId,
        username: req.user.username,
        role: req.user.role,
        connectedAt: new Date()
    });

    // Envia keep-alive a cada 30 segundos
    const keepAliveInterval = setInterval(() => {
        res.write(`:keep-alive\n\n`);
    }, 30000);

    // Cleanup quando cliente desconecta
    req.on('close', () => {
        clearInterval(keepAliveInterval);
        conexoesSSE.delete(connectionId);
        logger.info(`[SSE] Cliente desconectado: ${req.user.username} (${connectionId})`);
    });

    req.on('error', (error) => {
        clearInterval(keepAliveInterval);
        conexoesSSE.delete(connectionId);
        logger.error(`[SSE] Erro na conexão ${connectionId}: ${error.message}`);
    });
};

/**
 * Envia notificação SSE para usuário específico
 */
exports.notificarUsuario = (userId, type, data) => {
    let enviados = 0;

    conexoesSSE.forEach((conexao, connectionId) => {
        if (conexao.userId === userId) {
            try {
                const evento = {
                    type,
                    data,
                    timestamp: new Date().toISOString()
                };

                conexao.res.write(`data: ${JSON.stringify(evento)}\n\n`);
                enviados++;
            } catch (error) {
                logger.error(`[SSE] Erro ao enviar para ${connectionId}: ${error.message}`);
                conexoesSSE.delete(connectionId);
            }
        }
    });

    if (enviados > 0) {
        logger.debug(`[SSE] Notificação enviada para ${enviados} conexão(ões) do usuário ${userId}`);
    }
};

/**
 * Envia notificação SSE para todos usuários de uma empresa
 */
exports.notificarEmpresa = (empresaId, type, data) => {
    let enviados = 0;

    conexoesSSE.forEach((conexao, connectionId) => {
        if (conexao.empresaId === empresaId) {
            try {
                const evento = {
                    type,
                    data,
                    timestamp: new Date().toISOString()
                };

                conexao.res.write(`data: ${JSON.stringify(evento)}\n\n`);
                enviados++;
            } catch (error) {
                logger.error(`[SSE] Erro ao enviar para ${connectionId}: ${error.message}`);
                conexoesSSE.delete(connectionId);
            }
        }
    });

    if (enviados > 0) {
        logger.info(`[SSE] Notificação enviada para ${enviados} conexão(ões) da empresa ${empresaId}`);
    }
};

/**
 * Envia notificação broadcast para todos admins
 */
exports.notificarAdmins = (type, data) => {
    let enviados = 0;

    conexoesSSE.forEach((conexao, connectionId) => {
        if (conexao.role === 'admin') {
            try {
                const evento = {
                    type,
                    data,
                    timestamp: new Date().toISOString()
                };

                conexao.res.write(`data: ${JSON.stringify(evento)}\n\n`);
                enviados++;
            } catch (error) {
                logger.error(`[SSE] Erro ao enviar para ${connectionId}: ${error.message}`);
                conexoesSSE.delete(connectionId);
            }
        }
    });

    if (enviados > 0) {
        logger.info(`[SSE] Notificação broadcast enviada para ${enviados} admin(s)`);
    }
};

/**
 * Retorna estatísticas das conexões SSE ativas
 */
exports.getEstatisticas = (req, res) => {
    const stats = {
        total_conexoes: conexoesSSE.size,
        por_empresa: {},
        por_role: { admin: 0, user: 0 }
    };

    conexoesSSE.forEach((conexao) => {
        // Conta por empresa
        if (!stats.por_empresa[conexao.empresaId]) {
            stats.por_empresa[conexao.empresaId] = 0;
        }
        stats.por_empresa[conexao.empresaId]++;

        // Conta por role
        stats.por_role[conexao.role]++;
    });

    res.status(200).json({
        sucesso: true,
        sse_stats: stats
    });
};

// Exporta funções auxiliares para uso em services
module.exports.notificarUsuario = exports.notificarUsuario;
module.exports.notificarEmpresa = exports.notificarEmpresa;
module.exports.notificarAdmins = exports.notificarAdmins;
