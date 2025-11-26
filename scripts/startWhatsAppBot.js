// scripts/startWhatsAppBot.js
/**
 * Inicia o bot WhatsApp para escutar comandos no grupo
 * Comandos disponíveis:
 * - !placas ou !disponibilidade - Mostra relatório de disponibilidade
 * - !help ou !ajuda - Mostra lista de comandos
 */

require('dotenv').config();
const mongoose = require('mongoose');
const whatsappService = require('../services/whatsappService');
const logger = require('../config/logger');

async function main() {
    try {
        console.log('\n🤖 ============================================');
        console.log('   BOT WHATSAPP - RELATÓRIO DE PLACAS');
        console.log('============================================\n');

        // 1. Conectar ao MongoDB
        logger.info('📦 Conectando ao MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('✅ MongoDB conectado!\n');

        // 2. Inicializar WhatsApp
        logger.info('📱 Inicializando WhatsApp...');
        logger.info('⚠️  Se for a primeira vez, escaneie o QR Code\n');
        
        await whatsappService.initialize();

        logger.info('\n✅ Bot WhatsApp iniciado com sucesso!');
        logger.info('🎯 Grupo configurado: ' + whatsappService.groupId);
        logger.info('\n📋 Comandos disponíveis no grupo:');
        logger.info('   • !placas ou !disponibilidade - Mostra relatório');
        logger.info('   • !help ou !ajuda - Lista de comandos');
        logger.info('\n💡 O bot está ouvindo mensagens do grupo...');
        logger.info('   Pressione Ctrl+C para parar\n');

        // Manter o processo rodando
        process.on('SIGINT', async () => {
            logger.info('\n\n🛑 Encerrando bot...');
            await whatsappService.destroy();
            await mongoose.connection.close();
            logger.info('👋 Bot encerrado com sucesso!');
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            logger.info('\n\n🛑 Encerrando bot...');
            await whatsappService.destroy();
            await mongoose.connection.close();
            logger.info('👋 Bot encerrado com sucesso!');
            process.exit(0);
        });

    } catch (error) {
        logger.error('❌ Erro ao iniciar bot:', error);
        process.exit(1);
    }
}

main();
