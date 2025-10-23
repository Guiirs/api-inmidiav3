// InMidia/backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const config = require('../config/config'); // <-- 1. Importa a mesma configuração

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Token não fornecido.' });
    }
// --- ADICIONE ESTA LINHA ---
    console.log('--- ROTA PROTEGIDA --- CHAVE USADA PARA VERIFICAR O TOKEN:', config.jwtSecret);
    // 2. Usa a mesma chave secreta do "cofre" para verificar o token
    jwt.verify(token, config.jwtSecret, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido ou expirado.' });
        }
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;