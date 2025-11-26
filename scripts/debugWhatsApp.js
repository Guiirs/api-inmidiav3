const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, LocalAuth } = require('whatsapp-web.js');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const qrcode = require('qrcode-terminal');

// Importar modelos necessários
require('../models/Placa');
require('../models/Aluguel');
require('../models/Regiao');
require('../models/Cliente');

const Placa = require('../models/Placa');

async function debugWhatsApp() {
  let client = null;
  
  try {
    logger.info('🔍 [Debug WhatsApp] Iniciando diagnóstico completo...\n');

    // 1. Conectar ao MongoDB
    logger.info('1️⃣ Conectando ao MongoDB...');
    if (!process.env.MONGODB_URI) {
      logger.error('❌ MONGODB_URI não configurada!');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ MongoDB conectado!\n');

    // 2. Inicializar WhatsApp cliente direto
    logger.info('2️⃣ Inicializando WhatsApp Web Client...');
    
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: './whatsapp-session'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });

    // Configurar eventos
    client.on('qr', (qr) => {
      logger.info('[WhatsApp] 📱 QR Code gerado:');
      qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', () => {
      logger.info('[WhatsApp] ✅ Autenticado!');
    });

    client.on('ready', () => {
      logger.info('[WhatsApp] 🚀 Cliente pronto!\n');
    });

    // Inicializar
    await client.initialize();
    
    // Aguardar estar pronto
    await new Promise(resolve => setTimeout(resolve, 3000));
    logger.info('✅ Cliente WhatsApp inicializado!\n');

    // 3. Buscar grupo
    logger.info('3️⃣ Buscando grupo...');
    const NOME_GRUPO = process.env.WHATSAPP_GROUP_NAME || 'Placas Disponíveis';
    
    const chats = await client.getChats();
    const groups = chats.filter(chat => chat.isGroup);
    
    logger.info(`📋 Encontrados ${groups.length} grupos\n`);
    
    const targetGroup = groups.find(g => g.name === NOME_GRUPO);
    
    if (!targetGroup) {
      logger.error(`❌ Grupo "${NOME_GRUPO}" não encontrado!`);
      logger.info('\n📋 Grupos disponíveis:');
      groups.slice(0, 10).forEach((g, i) => {
        logger.info(`  ${i + 1}. ${g.name} (${g.id._serialized})`);
      });
      process.exit(1);
    }

    logger.info(`✅ Grupo encontrado: "${targetGroup.name}"`);
    logger.info(`   ID: ${targetGroup.id._serialized}`);
    logger.info(`   Participantes: ${targetGroup.participants.length}\n`);

    // 4. Verificar permissões
    logger.info('4️⃣ Verificando permissões...');
    const meParticipant = targetGroup.participants.find(p => p.id._serialized === client.info.wid._serialized);
    
    if (meParticipant) {
      logger.info(`   • Sou participante: ✅ SIM`);
      logger.info(`   • Sou admin: ${meParticipant.isAdmin ? '✅ SIM' : '⚠️  NÃO'}`);
    } else {
      logger.warn(`   • ⚠️  NÃO sou participante do grupo!`);
    }
    
    logger.info(`   • Grupo é read-only: ${targetGroup.isReadOnly ? '❌ SIM' : '✅ NÃO'}\n`);

    // 5. Enviar mensagem simples de teste
    logger.info('5️⃣ Enviando mensagem de teste...');
    logger.info('⚠️  Aguardando 3 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const mensagemTeste = '🧪 *TESTE DE SISTEMA*\n\nEsta é uma mensagem de teste do sistema de relatórios automáticos.\n\n_Ignore esta mensagem._';
      
      await client.sendMessage(targetGroup.id._serialized, mensagemTeste);
      logger.info('✅ Mensagem de teste enviada!\n');
      
      // Aguardar
      logger.info('⏳ Aguardando 5 segundos...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      logger.error(`❌ ERRO ao enviar mensagem: ${error.message}\n`);
      console.error(error);
    }

    // 6. Gerar e enviar relatório real
    logger.info('6️⃣ Gerando relatório de placas...');
    
    const placas = await Placa.find({})
      .populate('regiao', 'nome')
      .sort({ codigo: 1 });
    
    const alugueisAtivos = await mongoose.model('Aluguel').find({
      status: { $in: ['ativo', 'aprovado'] }
    });
    
    const placasAlugadas = new Set(
      alugueisAtivos.flatMap(a => a.placas.map(p => p.toString()))
    );
    
    const disponiveis = placas.filter(p => 
      p.status === 'disponivel' && !placasAlugadas.has(p._id.toString())
    );
    
    const alugadas = placas.filter(p => 
      placasAlugadas.has(p._id.toString())
    );
    
    const indisponiveis = placas.filter(p => 
      p.status === 'indisponivel'
    );
    
    logger.info(`   • Total: ${placas.length}`);
    logger.info(`   • Disponíveis: ${disponiveis.length}`);
    logger.info(`   • Alugadas: ${alugadas.length}`);
    logger.info(`   • Indisponíveis: ${indisponiveis.length}\n`);

    // Formatar mensagem
    let mensagem = '📊 *RELATÓRIO DE DISPONIBILIDADE*\n';
    mensagem += `_Atualizado em ${new Date().toLocaleString('pt-BR')}_\n\n`;
    mensagem += `📈 *RESUMO GERAL*\n`;
    mensagem += `• Total de Placas: ${placas.length}\n`;
    mensagem += `• Disponíveis: ✅ ${disponiveis.length}\n`;
    mensagem += `• Alugadas: 🟡 ${alugadas.length}\n`;
    mensagem += `• Indisponíveis: ❌ ${indisponiveis.length}\n\n`;
    
    if (disponiveis.length > 0) {
      mensagem += `✅ *PLACAS DISPONÍVEIS (${disponiveis.length})*\n`;
      disponiveis.slice(0, 20).forEach(p => {
        const regiao = p.regiao?.nome || 'Sem região';
        mensagem += `  • ${p.codigo} - ${regiao}\n`;
      });
      if (disponiveis.length > 20) {
        mensagem += `  ... e mais ${disponiveis.length - 20} placas\n`;
      }
    }
    
    mensagem += `\n_Sistema de Gestão de Placas_`;

    // Enviar relatório
    logger.info('7️⃣ Enviando relatório completo...');
    logger.info('⚠️  Aguardando 3 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      await client.sendMessage(targetGroup.id._serialized, mensagem);
      logger.info('✅ RELATÓRIO ENVIADO COM SUCESSO!\n');
    } catch (error) {
      logger.error(`❌ ERRO ao enviar relatório: ${error.message}\n`);
      console.error(error);
    }

    // 8. Verificar últimas mensagens
    logger.info('8️⃣ Verificando últimas mensagens do grupo...');
    try {
      const messages = await targetGroup.fetchMessages({ limit: 10 });
      
      logger.info(`\n📬 Últimas 10 mensagens:`);
      messages.reverse().forEach((msg, index) => {
        const isFromMe = msg.fromMe ? '(🤖 EU)' : '';
        const timestamp = new Date(msg.timestamp * 1000).toLocaleTimeString('pt-BR');
        const preview = msg.body.substring(0, 40).replace(/\n/g, ' ');
        logger.info(`  ${index + 1}. [${timestamp}] ${isFromMe} ${preview}...`);
      });
      
      const minhasMensagens = messages.filter(m => m.fromMe);
      logger.info(`\n✅ Minhas mensagens no grupo: ${minhasMensagens.length}`);
      
    } catch (error) {
      logger.error(`⚠️  Erro ao buscar mensagens: ${error.message}\n`);
    }

    logger.info('\n✅ ✅ ✅ DEBUG CONCLUÍDO! ✅ ✅ ✅\n');
    logger.info('� Verifique seu WhatsApp AGORA para ver as mensagens!\n');

  } catch (error) {
    logger.error(`❌ Erro fatal no debug: ${error.message}`);
    console.error(error);
  } finally {
    // Cleanup
    logger.info('🧹 Limpando recursos...');
    
    if (client) {
      try {
        await client.destroy();
        logger.info('✅ Cliente WhatsApp destruído');
      } catch (e) {
        logger.error(`⚠️  Erro ao destruir cliente: ${e.message}`);
      }
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      logger.info('✅ MongoDB desconectado');
    }
    
    logger.info('\n👋 Fim do debug!\n');
    process.exit(0);
  }
}

debugWhatsApp();
