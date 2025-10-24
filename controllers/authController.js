// InMidia/backend/controllers/authController.js
// const db = require('../config/database'); // <-- Remova esta linha
const AuthService = require('../services/authService');
// Validadores permanecem os mesmos
const { loginValidationRules, handleValidationErrors } = require('../validators/authValidator');

const createAuthController = () => {
    const controller = {};
    // Instancia o serviço sem passar 'db'
    const authService = new AuthService(); // <-- Alteração aqui

    controller.login = async (req, res, next) => {
        try {
            const { email, password } = req.body; // Login agora usa email
            // Chama o serviço refatorado
            const result = await authService.login(email, password);

            // O serviço já retorna { token, user: { id: _id, ... } }
            res.status(200).json({
                message: 'Login bem-sucedido!',
                token: result.token,
                user: result.user
            });

        } catch (err) {
            next(err);
        }
    };

    controller.forgotPassword = async (req, res, next) => {
        try {
            const { email } = req.body;
            // Chama o serviço refatorado
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
             // Chama o serviço refatorado
            const result = await authService.resetPassword(token, newPassword);
            res.status(200).json(result);
        } catch(err) {
            next(err);
        }
    };

    return controller;
};

module.exports = createAuthController(); // Exporta a instância