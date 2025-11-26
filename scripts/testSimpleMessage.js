const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

async function testeSimplesDireto() {
  let client = null;
  
  try {
    console.log('🔥 TESTE SUPER SIMPLES - ENVIO DIRETO\n');

    // ID fixo do grupo
    const GROUP_ID = '120363425517091266@g.us';
    
    console.log(`🎯 Grupo alvo: ${GROUP_ID}\n`);

    // Inicializar cliente
    console.log('🚀 Inicializando WhatsApp...');
    
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
      console.log('📱 QR Code:');
      qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', () => {
      console.log('✅ Autenticado!');
    });

    let pronto = false;
    client.on('ready', () => {
      console.log('✅ Cliente pronto!\n');
      pronto = true;
    });

    await client.initialize();
    
    // Aguardar ficar pronto
    while (!pronto) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('📤 ENVIANDO MENSAGEM DE TESTE...\n');
    
    const mensagem = `🧪 *TESTE SIMPLES*

Esta é uma mensagem de teste enviada em ${new Date().toLocaleString('pt-BR')}.

Se você está vendo isto, o sistema está funcionando! ✅`;

    console.log('Mensagem:');
    console.log('---');
    console.log(mensagem);
    console.log('---\n');

    console.log('⏳ Aguardando 2 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('📨 Enviando para o grupo...');
    const resultado = await client.sendMessage(GROUP_ID, mensagem);
    
    console.log('\n✅ ✅ ✅ MENSAGEM ENVIADA! ✅ ✅ ✅');
    console.log(`   ID: ${resultado.id.id}`);
    console.log(`   Timestamp: ${new Date(resultado.timestamp * 1000).toLocaleString('pt-BR')}\n`);

    // Verificar no histórico
    console.log('🔍 Verificando histórico...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const chat = await client.getChatById(GROUP_ID);
    const mensagens = await chat.fetchMessages({ limit: 3 });
    
    console.log('\n📬 Últimas 3 mensagens do grupo:');
    mensagens.reverse().forEach((m, i) => {
      const hora = new Date(m.timestamp * 1000).toLocaleTimeString('pt-BR');
      const isMe = m.fromMe ? '(🤖 EU)' : '';
      const preview = m.body.substring(0, 40).replace(/\n/g, ' ');
      console.log(`   ${i+1}. [${hora}] ${isMe} ${preview}...`);
    });

    console.log('\n✅ TESTE CONCLUÍDO!');
    console.log('📱 ABRA SEU WHATSAPP E VERIFIQUE O GRUPO "Placas Disponíveis"!\n');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error);
  } finally {
    if (client) {
      await client.destroy();
      console.log('👋 Cliente desconectado');
    }
    process.exit(0);
  }
}

testeSimplesDireto();
