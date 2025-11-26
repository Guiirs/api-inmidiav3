const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');

// Importar modelos
require('../models/Placa');
require('../models/Aluguel');
require('../models/Regiao');
require('../models/Cliente');

const Placa = require('../models/Placa');
const Aluguel = require('../models/Aluguel');

async function testeSimples() {
  let client = null;
  
  try {
    console.log('🔍 TESTE DIRETO DE ENVIO\n');

    // 1. Conectar MongoDB
    console.log('1️⃣ Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB conectado!\n');

    // 2. Buscar dados
    console.log('2️⃣ Buscando placas do banco...');
    const placas = await Placa.find({})
      .populate('regiao', 'nome')
      .limit(5); // Pegar só 5 para teste
    
    console.log(`✅ Encontradas ${placas.length} placas`);
    placas.forEach(p => {
      console.log(`   - ${p.numero_placa} (${p.regiao?.nome || 'Sem região'})`);
    });
    console.log('');

    // 3. Buscar aluguéis ativos
    console.log('3️⃣ Buscando aluguéis ativos...');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const alugueisAtivos = await Aluguel.find({
      data_inicio: { $lte: hoje },
      data_fim: { $gte: hoje }
    });
    
    console.log(`✅ Encontrados ${alugueisAtivos.length} aluguéis ativos\n`);

    // 4. Inicializar WhatsApp
    console.log('4️⃣ Inicializando WhatsApp...');
    
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: './whatsapp-session'
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    client.on('qr', (qr) => {
      console.log('📱 Escaneie o QR Code:');
      qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', () => {
      console.log('✅ Autenticado!');
    });

    let isReady = false;
    client.on('ready', () => {
      console.log('✅ Cliente pronto!\n');
      isReady = true;
    });

    await client.initialize();
    
    // Aguardar ficar pronto
    while (!isReady) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 5. Buscar o grupo
    console.log('5️⃣ Buscando grupo "Placas Disponíveis"...');
    const chats = await client.getChats();
    const grupos = chats.filter(c => c.isGroup);
    
    console.log(`📋 Total de grupos: ${grupos.length}`);
    
    const grupoAlvo = grupos.find(g => g.name === 'Placas Disponíveis');
    
    if (!grupoAlvo) {
      console.error('❌ Grupo não encontrado!');
      console.log('\n📋 Primeiros 10 grupos:');
      grupos.slice(0, 10).forEach((g, i) => {
        console.log(`   ${i+1}. ${g.name}`);
      });
      process.exit(1);
    }
    
    console.log(`✅ Grupo encontrado: ${grupoAlvo.name}`);
    console.log(`   ID: ${grupoAlvo.id._serialized}`);
    console.log(`   Participantes: ${grupoAlvo.participants.length}\n`);

    // 6. Montar mensagem SIMPLES
    console.log('6️⃣ Montando mensagem...');
    
    const totalPlacas = placas.length;
    const totalAlugadas = alugueisAtivos.length;
    const totalDisponiveis = totalPlacas - totalAlugadas;
    
    let mensagem = `🧪 *TESTE DE RELATÓRIO*\n\n`;
    mensagem += `📊 *Resumo:*\n`;
    mensagem += `• Total: ${totalPlacas} placas (amostra)\n`;
    mensagem += `• Disponíveis: ${totalDisponiveis}\n`;
    mensagem += `• Alugadas: ${totalAlugadas}\n\n`;
    
    mensagem += `📍 *Placas na amostra:*\n`;
    placas.forEach(p => {
      mensagem += `• ${p.numero_placa} - ${p.regiao?.nome || 'Sem região'}\n`;
    });
    
    mensagem += `\n_Teste enviado em ${new Date().toLocaleString('pt-PT')}_`;
    
    console.log('✅ Mensagem montada:');
    console.log('----------------------------');
    console.log(mensagem);
    console.log('----------------------------\n');

    // 7. ENVIAR
    console.log('7️⃣ ENVIANDO MENSAGEM...');
    console.log('⏳ Aguardando 3 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const resultado = await client.sendMessage(grupoAlvo.id._serialized, mensagem);
      console.log('✅ ✅ ✅ MENSAGEM ENVIADA COM SUCESSO! ✅ ✅ ✅');
      console.log(`   ID da mensagem: ${resultado.id.id}`);
      console.log(`   Timestamp: ${new Date(resultado.timestamp * 1000).toLocaleString('pt-PT')}`);
      console.log('');
    } catch (erro) {
      console.error('❌ ERRO AO ENVIAR:');
      console.error(erro);
      console.log('');
    }

    // 8. Verificar se chegou
    console.log('8️⃣ Verificando mensagens enviadas...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mensagens = await grupoAlvo.fetchMessages({ limit: 5 });
    const minhasMensagens = mensagens.filter(m => m.fromMe);
    
    console.log(`\n📬 Últimas 5 mensagens do grupo:`);
    mensagens.reverse().forEach((m, i) => {
      const hora = new Date(m.timestamp * 1000).toLocaleTimeString('pt-PT');
      const isMe = m.fromMe ? '(🤖 EU)' : '';
      const preview = m.body.substring(0, 30).replace(/\n/g, ' ');
      console.log(`   ${i+1}. [${hora}] ${isMe} ${preview}...`);
    });
    
    console.log(`\n✅ Total de mensagens minhas: ${minhasMensagens.length}`);
    
    if (minhasMensagens.length > 0) {
      const ultima = minhasMensagens[0];
      console.log(`\n📱 Última mensagem minha:`);
      console.log(`   Horário: ${new Date(ultima.timestamp * 1000).toLocaleString('pt-PT')}`);
      console.log(`   Preview: ${ultima.body.substring(0, 50)}...`);
    }

    console.log('\n✅ ✅ ✅ TESTE CONCLUÍDO! ✅ ✅ ✅');
    console.log('\n📱 VERIFIQUE SEU WHATSAPP AGORA!\n');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error);
  } finally {
    console.log('\n🧹 Limpando...');
    
    if (client) {
      await client.destroy();
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

testeSimples();
