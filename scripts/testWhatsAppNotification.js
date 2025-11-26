// Test WhatsApp notification for new rental
require('dotenv').config();
const mongoose = require('mongoose');
const Placa = require('../models/Placa');
const Cliente = require('../models/Cliente');
const Regiao = require('../models/Regiao');

// Simula a função de notificação
function formatarNotificacaoAluguel(aluguel, placa, cliente) {
    // Formata as datas
    const dataInicio = new Date(aluguel.data_inicio).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    const dataFim = new Date(aluguel.data_fim).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    // Calcula duração em dias
    const inicio = new Date(aluguel.data_inicio);
    const fim = new Date(aluguel.data_fim);
    const diferencaDias = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));

    // Monta a mensagem
    const regiao = placa.regiao?.nome || 'Sem região';
    
    let mensagem = `🆕 *NOVO ALUGUEL REGISTRADO*\n\n`;
    mensagem += `📋 *Placa:* ${placa.numero_placa}\n`;
    mensagem += `📍 *Região:* ${regiao}\n`;
    mensagem += `👤 *Cliente:* ${cliente.nome}\n\n`;
    mensagem += `📅 *Período do Aluguel:*\n`;
    mensagem += `• Início: ${dataInicio}\n`;
    mensagem += `• Término: ${dataFim}\n`;
    mensagem += `• Duração: ${diferencaDias} dias\n\n`;
    mensagem += `_Sistema de Gestão de Placas_`;

    return mensagem;
}

async function main() {
    try {
        console.log('\n📱 ===== TESTE DE NOTIFICAÇÃO DE ALUGUEL =====\n');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado\n');

        // Busca uma placa e cliente reais para exemplo
        const placa = await Placa.findOne().populate('regiao', 'nome').limit(1).exec();
        const cliente = await Cliente.findOne().limit(1).exec();

        if (!placa || !cliente) {
            console.log('❌ Não há placas ou clientes no banco para testar');
            await mongoose.connection.close();
            return;
        }

        // Simula dados de aluguel
        const aluguelSimulado = {
            data_inicio: new Date(),
            data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
        };

        const mensagem = formatarNotificacaoAluguel(aluguelSimulado, placa, cliente);

        console.log('📨 MENSAGEM QUE SERÁ ENVIADA NO WHATSAPP:');
        console.log('='.repeat(60));
        console.log(mensagem);
        console.log('='.repeat(60));
        console.log('\n✨ Exemplo:');
        console.log(`   Quando criar um aluguel para a placa "${placa.numero_placa}"`);
        console.log(`   do cliente "${cliente.nome}",`);
        console.log(`   essa mensagem será enviada automaticamente no grupo WhatsApp!`);

        await mongoose.connection.close();
        console.log('\n✅ Teste concluído!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

main();
