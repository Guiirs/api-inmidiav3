// routes/whatsappRoutes.js
const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminAuthMiddleware = require('../middlewares/adminAuthMiddleware');
const { body } = require('express-validator');
const logger = require('../config/logger');

// Todas as rotas requerem autenticação de admin
router.use(authMiddleware);
router.use(adminAuthMiddleware);

// GET /api/v1/whatsapp/status - Status da conexão
router.get('/status', whatsappController.getStatus);

// POST /api/v1/whatsapp/enviar-relatorio - Envia relatório manualmente
router.post('/enviar-relatorio', whatsappController.enviarRelatorio);

// POST /api/v1/whatsapp/enviar-mensagem - Envia mensagem customizada
router.post(
    '/enviar-mensagem',
    [
        body('mensagem')
            .notEmpty().withMessage('Mensagem é obrigatória')
            .isString().withMessage('Mensagem deve ser texto')
            .isLength({ max: 4096 }).withMessage('Mensagem muito longa (máx 4096 caracteres)')
    ],
    whatsappController.enviarMensagem
);

// POST /api/v1/whatsapp/reconectar - Reconecta cliente
router.post('/reconectar', whatsappController.reconectar);

// GET /api/v1/whatsapp/grupos - Lista grupos disponíveis
router.get('/grupos', whatsappController.listarGrupos);

logger.info('[Routes WhatsApp] Rotas de WhatsApp configuradas');

module.exports = router;
