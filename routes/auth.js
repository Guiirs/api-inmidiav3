// routes/auth.js

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit'); // Importa a função
const logger = require('../config/logger'); // Adiciona logger

// Importa os controllers
let authController, empresaController; // Assumindo que empresaController também é usado aqui
try {
    authController = require('../controllers/authController');
    // Se a rota de registo estiver aqui e não em empresaRoutes, descomente:
    // empresaController = require('../controllers/empresaController');
    logger.info('[Routes Auth] Controllers carregados com sucesso.');
} catch (error) {
    logger.error('[Routes Auth] ERRO CRÍTICO ao carregar controllers:', error);
    throw new Error('Falha ao carregar controllers de Autenticação.');
}

// <<< CORREÇÃO: Cria a instância do limitador UMA VEZ AQUI >>>
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 10, // Limita cada IP a 10 requisições por janela
	message: { message: 'Muitas tentativas de login a partir deste IP, por favor tente novamente após 15 minutos' }, // Envia JSON
	standardHeaders: true, // Retorna info do rate limit nos headers `RateLimit-*`
	legacyHeaders: false, // Desabilita os headers `X-RateLimit-*`
    keyGenerator: (req, res) => { // Usa X-Forwarded-For se existir (proxy reverso)
        return req.headers['x-forwarded-for'] || req.ip;
    },
    handler: (req, res, next, options) => { // Loga quando o limite é atingido
        logger.warn(`[RateLimit] Limite de taxa atingido para login do IP: ${req.ip} (ou X-Forwarded-For: ${req.headers['x-forwarded-for']})`);
        res.status(options.statusCode).send(options.message);
    }
});

// Opcional: Criar um limitador separado para registo, se necessário
// const registerLimiter = rateLimit({ ... configurações diferentes ... });

logger.info('[Routes Auth] Definindo rotas de Autenticação...');

// --- Rotas de Autenticação ---

// POST /api/auth/login - Login do Utilizador
// <<< CORREÇÃO: Usa a instância criada 'loginLimiter' como middleware >>>
router.post('/login', loginLimiter, authController.login);
logger.debug('[Routes Auth] Rota POST /login definida.');

// POST /api/auth/forgot-password - Pedido de redefinição de senha
// Pode adicionar um limitador aqui também, se desejar
router.post('/forgot-password', authController.forgotPassword);
logger.debug('[Routes Auth] Rota POST /forgot-password definida.');

// POST /api/auth/reset-password/:token - Redefinição de senha com token
// Pode adicionar um limitador aqui também
router.post('/reset-password/:token', authController.resetPassword);
logger.debug('[Routes Auth] Rota POST /reset-password/:token definida.');

// GET /api/auth/verify-token/:token - Verifica token de redefinição (GET request)
// Geralmente não precisa de rate limit tão estrito aqui
router.get('/verify-token/:token', authController.verifyResetToken);
logger.debug('[Routes Auth] Rota GET /verify-token/:token definida.');


// Se a rota de registo estiver aqui (em vez de em empresaRoutes):
// router.post('/register', registerLimiter, empresaController.registerEmpresa); // Use um registerLimiter?
// logger.debug('[Routes Auth] Rota POST /register definida.');


logger.info('[Routes Auth] Rotas de Autenticação definidas com sucesso.');

module.exports = router;
logger.debug('[Routes Auth] Router exportado.');