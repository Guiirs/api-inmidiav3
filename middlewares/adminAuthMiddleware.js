// middlewares/adminAuthMiddleware.js
const logger = require('../config/logger'); // Importa o logger

const isAdmin = (req, res, next) => {
    logger.debug('[AdminAuthMiddleware] Verificando permissão de administrador...');

    // 1. Verifica se a informação do utilizador foi anexada pelo authMiddleware
    if (!req.user) {
        logger.warn('[AdminAuthMiddleware] Acesso negado: req.user ausente (falha de autenticação prévia?).');
        // Embora authMiddleware deva tratar, um 403 aqui é apropriado se a role não puder ser lida.
        return res.status(403).json({ message: 'Acesso negado. Token inválido ou dados do utilizador em falta.' });
    }
    
    const userRole = req.user.role;
    const userId = req.user.id;

    // 2. Verifica se a role é 'admin'
    if (userRole === 'admin') {
        logger.debug(`[AdminAuthMiddleware] Admin ${userId} autenticado. Acesso permitido.`);
        // Se for admin, pode prosseguir
        next();
    } else {
        // Se não for, retorna um erro de "Acesso Proibido"
        logger.warn(`[AdminAuthMiddleware] Utilizador ${userId} (Role: ${userRole}) tentou aceder a rota restrita. Acesso negado.`);
        res.status(403).json({ message: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
    }
};

module.exports = isAdmin;