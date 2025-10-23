// middlewares/adminAuthMiddleware.js

const isAdmin = (req, res, next) => {
    // O middleware de autenticação (authMiddleware) já colocou os dados do utilizador em req.user
    // Agora, verificamos se a role dele é 'admin'
    if (req.user && req.user.role === 'admin') {
        // Se for admin, pode prosseguir
        next();
    } else {
        // Se não for, retorna um erro de "Acesso Proibido"
        res.status(403).json({ message: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
    }
};

module.exports = isAdmin;