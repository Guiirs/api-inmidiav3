// scripts/testWhatsApp.js
/**
 * Script para testar integração WhatsApp
 * 
 * Uso (a partir do diretório BECKEND):
 * node scripts/testWhatsApp.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const logger = require('../config/logger');

// Importar modelos necessários para o Mongoose registrar os schemas
require('../models/Placa');
require('../models/Aluguel');
require('../models/Regiao');
require('../models/Cliente');

// Importar whatsappService DEPOIS de carregar os modelos
const whatsappService = require('../services/whatsappService');

async function testarWhatsApp() {
    try {
        logger.info('🧪 [Teste WhatsApp] Iniciando teste de integração...\n');

        // Verifica variáveis de ambiente
        if (!process.env.MONGODB_URI) {
            logger.error('❌ MONGODB_URI não configurada no .env!');
            logger.info('Configure o arquivo .env com MONGODB_URI antes de continuar.');
            process.exit(1);
        }

        // 1. Conectar ao MongoDB
        logger.info('1️⃣ Conectando ao MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('✅ MongoDB conectado!\n');

        // 2. Inicializar WhatsApp
        logger.info('2️⃣ Inicializando WhatsApp...');
        logger.info('⚠️  Aguarde o QR Code aparecer (se for primeira vez)');
        await whatsappService.initialize();

        // Aguarda até estar pronto
        await waitForReady();

        // 3. Listar grupos e verificar configuração
        logger.info('\n3️⃣ Listando grupos disponíveis...');
        
        // Garantir que o groupId está configurado (ID fixo de segurança)
        if (!whatsappService.groupId) {
            whatsappService.groupId = '120363425517091266@g.us';
            logger.info('🔒 Configurando ID fixo de segurança...');
        }
        
        const chats = await whatsappService.client.getChats();
        const grupos = chats.filter(chat => chat.isGroup);
        
        logger.info(`\n📋 Grupos encontrados: ${grupos.length}`);
        grupos.forEach((grupo, index) => {
            logger.info(`  ${index + 1}. ${grupo.name} (${grupo.id._serialized})`);
        });

        logger.info(`\n✅ Grupo configurado: ${whatsappService.groupId}`);

        // 4. Gerar relatório
        logger.info('\n4️⃣ Gerando relatório de placas...');
        const relatorio = await whatsappService.gerarRelatorio();
        
        logger.info('\n📊 Estatísticas:');
        logger.info(`  • Total: ${relatorio.total}`);
        logger.info(`  • Disponíveis: ${relatorio.disponiveis.length}`);
        logger.info(`  • Alugadas: ${relatorio.alugadas.length}`);
        logger.info(`  • Indisponíveis: ${relatorio.indisponiveis.length}`);

        // 5. Enviar mensagem de teste
        logger.info('\n5️⃣ Teste de envio de mensagem...');
        
        // Debug: Verificar estado do serviço
        logger.info(`\n🔍 Debug:`);
        logger.info(`   • isReady: ${whatsappService.isReady}`);
        logger.info(`   • groupId: ${whatsappService.groupId}`);
        logger.info(`   • client: ${whatsappService.client ? 'OK' : 'NULL'}\n`);
        
        logger.info('⚠️  ATENÇÃO: O relatório será enviado para o grupo agora!');
        logger.info('Pressione Ctrl+C para cancelar ou aguarde 5 segundos...\n');
        
        await sleep(5000);
        
        logger.info('📤 Enviando relatório...');
        const sucesso = await whatsappService.enviarRelatorioDisponibilidade();
        
        if (sucesso) {
            logger.info('\n✅ SUCESSO! Relatório enviado para o grupo!');
            
            // Verificar no histórico se realmente enviou
            logger.info('\n🔍 Verificando histórico do grupo...');
            await sleep(2000);
            
            try {
                const chat = await whatsappService.client.getChatById(whatsappService.groupId);
                const messages = await chat.fetchMessages({ limit: 3 });
                
                logger.info('📬 Últimas 3 mensagens:');
                messages.reverse().forEach((m, i) => {
                    const hora = new Date(m.timestamp * 1000).toLocaleTimeString('pt-BR');
                    const isMe = m.fromMe ? '(🤖 EU)' : '';
                    const preview = m.body.substring(0, 40).replace(/\n/g, ' ');
                    logger.info(`   ${i+1}. [${hora}] ${isMe} ${preview}...`);
                });
            } catch (error) {
                logger.error(`Erro ao verificar histórico: ${error.message}`);
            }
        } else {
            logger.error('\n❌ FALHA ao enviar relatório!');
        }

        // 6. Finalizar
        logger.info('\n6️⃣ Teste concluído!');
        logger.info('\n📝 Próximos passos:');
        logger.info('  1. Configure WHATSAPP_ENABLED=true no .env');
        logger.info('  2. Configure WHATSAPP_GROUP_NAME com o nome do grupo');
        logger.info('  3. Configure WHATSAPP_REPORT_HOUR (ex: 09:00)');
        logger.info('  4. Reinicie o servidor\n');

        // Cleanup
        await whatsappService.destroy();
        await mongoose.disconnect();
        
        process.exit(0);

    } catch (error) {
        logger.error(`\n❌ Erro durante teste: ${error.message}`);
        logger.error(error.stack);
        process.exit(1);
    }
}

async function waitForReady() {
    return new Promise((resolve) => {
        if (whatsappService.isReady) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (whatsappService.isReady) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 1000);
        }
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Executar teste
testarWhatsApp();
