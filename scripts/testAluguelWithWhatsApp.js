// Test aluguel creation with WhatsApp notification
require('dotenv').config();
const mongoose = require('mongoose');
const AluguelService = require('../services/aluguelService');
const whatsappService = require('../services/whatsappService');
const logger = require('../config/logger');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    try {
        console.log('\n🧪 ===== TESTE DE CRIAÇÃO DE ALUGUEL COM NOTIFICAÇÃO =====\n');

        // Conecta ao MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado\n');

        // Inicializa WhatsApp
        console.log('📱 Inicializando WhatsApp...');
        console.log('   (Isso pode levar alguns segundos se for a primeira vez)\n');
        
        await whatsappService.initialize();
        
        // Aguarda o WhatsApp ficar pronto
        let tentativas = 0;
        while (!whatsappService.isReady && tentativas < 30) {
            await sleep(1000);
            tentativas++;
            if (tentativas % 5 === 0) {
                console.log(`   Aguardando WhatsApp... (${tentativas}s)`);
            }
        }

        if (!whatsappService.isReady) {
            console.log('❌ WhatsApp não ficou pronto em 30 segundos');
            console.log('   Verifique se você escaneou o QR Code\n');
            process.exit(1);
        }

        console.log('✅ WhatsApp pronto!\n');
        console.log(`   isReady: ${whatsappService.isReady}`);
        console.log(`   groupId: ${whatsappService.groupId}\n`);

        // Busca dados para criar o aluguel de teste
        const Placa = require('../models/Placa');
        const Cliente = require('../models/Cliente');

        const placa = await Placa.findOne({ numero_placa: /^ALUG/ }).exec();
        const cliente = await Cliente.findOne({ nome: /Teste/ }).exec();

        if (!placa || !cliente) {
            console.log('❌ Não encontrou placa ou cliente de teste');
            console.log('   Crie uma placa com "ALUG" no nome e um cliente com "Teste" no nome\n');
            process.exit(1);
        }

        console.log(`📋 Criando aluguel de teste:`);
        console.log(`   Placa: ${placa.numero_placa}`);
        console.log(`   Cliente: ${cliente.nome}`);
        console.log(`   Período: 30 dias a partir de hoje\n`);

        // Cria o aluguel
        const aluguelService = new AluguelService();
        
        const hoje = new Date();
        const daqui30dias = new Date(hoje);
        daqui30dias.setDate(daqui30dias.getDate() + 30);

        const aluguelData = {
            placa_id: placa._id.toString(),
            cliente_id: cliente._id.toString(),
            data_inicio: hoje.toISOString(),
            data_fim: daqui30dias.toISOString()
        };

        console.log('⏳ Criando aluguel...\n');

        const novoAluguel = await aluguelService.createAluguel(aluguelData, placa.empresa.toString());

        console.log('✅ Aluguel criado com sucesso!');
        console.log(`   ID: ${novoAluguel.id}\n`);

        console.log('📨 Aguardando envio da notificação WhatsApp...');
        await sleep(3000);

        console.log('\n✅ TESTE CONCLUÍDO!');
        console.log('   Verifique o grupo WhatsApp "Placas Disponíveis"');
        console.log('   Deve ter uma mensagem sobre o novo aluguel\n');

        // Limpa
        await whatsappService.destroy();
        await mongoose.connection.close();

    } catch (error) {
        console.error('\n❌ Erro durante o teste:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
