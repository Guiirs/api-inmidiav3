// InMidia/backend/controllers/authController.js

const db = require('../config/database');
const AuthService = require('../services/authService');
const { loginValidationRules, handleValidationErrors } = require('../validators/authValidator');

const createAuthController = () => {
    const controller = {};
    // O authService já não precisa de receber a secretKey
    const authService = new AuthService(db);

    controller.login = async (req, res, next) => {
        try {
            const { email, password } = req.body;
            // A função login retorna um objeto { token, user }
            const result = await authService.login(email, password);

            // --- ESTA É A CORREÇÃO CRÍTICA ---
            // Enviamos o token e o user como propriedades de topo na resposta.
            res.status(200).json({ 
                message: 'Login bem-sucedido!', 
                token: result.token, 
                user: result.user 
            });
            // ------------------------------------

        } catch (err) {
            next(err);
        }
    };
    
    controller.forgotPassword = async (req, res, next) => {
        try {
            const { email } = req.body;
            const result = await authService.forgotPassword(email);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    };

    controller.resetPassword = async (req, res, next) => {
        try {
            const { token } = req.params;
            const { newPassword } = req.body;
            const result = await authService.resetPassword(token, newPassword);
            res.status(200).json(result);
        } catch(err) {
            next(err);
        }
    };

    return controller;
};

module.exports = createAuthController();