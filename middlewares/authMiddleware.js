// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const config = require('../config/config'); // Importa a configuração
const logger = require('../config/logger'); // Importa o logger

const authenticateToken = (req, res, next) => {
    // 1. Loga o início da tentativa de autenticação
    logger.debug('[AuthMiddleware] Tentando autenticar token...');
    
    // Pega o cabeçalho de autorização
    const authHeader = req.headers['authorization'];
    // Extrai o token do formato "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        logger.warn('[AuthMiddleware] Token de autenticação ausente na requisição.');
        return res.status(401).json({ message: 'Token não fornecido.' });
    }

    // 2. Verifica o token
    jwt.verify(token, config.jwtSecret, (err, user) => {
        if (err) {
            // Loga o erro de verificação (expiração, assinatura inválida, etc.)
            logger.warn(`[AuthMiddleware] Verificação do token falhou: ${err.message}. Status: ${err.name}`);
            
            // Retorna 403 Forbidden para indicar token inválido ou expirado
            return res.status(403).json({ message: 'Token inválido ou expirado.' });
        }
        
        // 3. Sucesso! Anexa os dados do utilizador ao request
        // O payload JWT deve conter id, username, role, empresaId
        if (!user || !user.id || !user.empresaId || !user.role) {
             logger.error(`[AuthMiddleware] Payload do token incompleto para utilizador ID: ${user ? user.id : 'N/A'}.`);
             return res.status(403).json({ message: 'Token inválido (payload incompleto).' });
        }
        
        req.user = {
             id: user.id,
             username: user.username,
             role: user.role,
             empresaId: user.empresaId // Usando 'empresaId' do payload JWT
        };

        logger.debug(`[AuthMiddleware] Token validado para utilizador: ${req.user.username} (Empresa: ${req.user.empresaId})`);
        
        // Continua para o próximo middleware ou controller
        next();
    });
};

module.exports = authenticateToken;