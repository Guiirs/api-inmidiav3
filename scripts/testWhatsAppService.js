const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const logger = require('../config/logger');

// Importar modelos
require('../models/Placa');
require('../models/Aluguel');
require('../models/Regiao');
require('../models/Cliente');

const whatsappService = require('../services/whatsappService');

async function testarWhatsAppService() {
  try {
    console.log('🧪 TESTE DO WHATSAPP SERVICE\n');

    // 1. Conectar MongoDB
    console.log('1️⃣ Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB conectado!\n');

    // 2. Inicializar WhatsApp Service
    console.log('2️⃣ Inicializando WhatsApp Service...');
    await whatsappService.initialize();
    
    // Aguardar ficar pronto
    console.log('⏳ Aguardando cliente ficar pronto...');
    let tentativas = 0;
    while (!whatsappService.isReady && tentativas < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      tentativas++;
      if (tentativas % 5 === 0) {
        console.log(`   ... aguardando (${tentativas}s)`);
      }
    }
    
    if (!whatsappService.isReady) {
      console.error('❌ Timeout: Cliente não ficou pronto após 60s');
      process.exit(1);
    }
    
    console.log('✅ Cliente pronto!\n');

    // 3. Verificar configuração
    console.log('3️⃣ Verificando configuração...');
    console.log(`   • isReady: ${whatsappService.isReady}`);
    console.log(`   • groupId: ${whatsappService.groupId || 'NÃO CONFIGURADO'}`);
    console.log(`   • client: ${whatsappService.client ? 'OK' : 'NULL'}\n`);

    if (!whatsappService.groupId) {
      console.error('❌ ERRO: groupId não foi configurado!');
      console.log('   O método findGroup() pode não ter funcionado.');
      
      // Tentar buscar manualmente
      console.log('\n   Tentando buscar grupo manualmente...');
      const chats = await whatsappService.client.getChats();
      const grupos = chats.filter(c => c.isGroup);
      console.log(`   Grupos encontrados: ${grupos.length}`);
      
      const grupoAlvo = grupos.find(g => g.name === 'Placas Disponíveis');
      if (grupoAlvo) {
        whatsappService.groupId = grupoAlvo.id._serialized;
        console.log(`   ✅ Grupo encontrado manualmente: ${whatsappService.groupId}\n`);
      } else {
        console.error('   ❌ Grupo "Placas Disponíveis" não encontrado!');
        process.exit(1);
      }
    }

    // 4. Gerar relatório
    console.log('4️⃣ Gerando relatório...');
    const relatorio = await whatsappService.gerarRelatorio();
    
    console.log(`   • Total: ${relatorio.total}`);
    console.log(`   • Disponíveis: ${relatorio.disponiveis.length}`);
    console.log(`   • Alugadas: ${relatorio.alugadas.length}`);
    console.log(`   • Indisponíveis: ${relatorio.indisponiveis.length}\n`);

    // 5. Formatar mensagem
    console.log('5️⃣ Formatando mensagem...');
    const mensagem = whatsappService.formatarMensagem(relatorio);
    
    console.log('----------------------------');
    console.log(mensagem.substring(0, 200));
    console.log('...');
    console.log('----------------------------\n');

    // 6. ENVIAR usando o método do service
    console.log('6️⃣ ENVIANDO via whatsappService.enviarRelatorioDisponibilidade()...');
    console.log('⏳ Aguardando 3 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const sucesso = await whatsappService.enviarRelatorioDisponibilidade();
    
    if (sucesso) {
      console.log('✅ ✅ ✅ ENVIADO COM SUCESSO! ✅ ✅ ✅\n');
    } else {
      console.error('❌ ❌ ❌ FALHA AO ENVIAR! ❌ ❌ ❌\n');
    }

    // 7. Verificar histórico
    console.log('7️⃣ Verificando histórico...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const chat = await whatsappService.client.getChatById(whatsappService.groupId);
    const mensagens = await chat.fetchMessages({ limit: 5 });
    
    console.log('\n📬 Últimas 5 mensagens:');
    mensagens.reverse().forEach((m, i) => {
      const hora = new Date(m.timestamp * 1000).toLocaleTimeString('pt-PT');
      const isMe = m.fromMe ? '(🤖 EU)' : '';
      const preview = m.body.substring(0, 30).replace(/\n/g, ' ');
      console.log(`   ${i+1}. [${hora}] ${isMe} ${preview}...`);
    });

    console.log('\n✅ ✅ ✅ TESTE CONCLUÍDO! ✅ ✅ ✅\n');
    console.log('📱 VERIFIQUE SEU WHATSAPP!\n');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error);
  } finally {
    console.log('\n🧹 Limpando...');
    
    if (whatsappService.client) {
      await whatsappService.destroy();
      console.log('✅ WhatsApp desconectado');
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('✅ MongoDB desconectado');
    }
    
    console.log('\n👋 Fim!\n');
    process.exit(0);
  }
}

testarWhatsAppService();
