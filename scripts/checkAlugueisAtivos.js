// Script simples para ver todos os aluguéis ativos
require('dotenv').config();
const mongoose = require('mongoose');
const Aluguel = require('../models/Aluguel');
const Cliente = require('../models/Cliente');
const Placa = require('../models/Placa');

async function listarAlugueisAtivos() {
    try {
        console.log('🔍 Conectando...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado!\n');

        const hoje = new Date();
        const alugueis = await Aluguel.find({
            data_inicio: { $lte: hoje },
            data_fim: { $gte: hoje }
        })
        .populate('cliente', 'nome')
        .populate('placa', 'numero_placa')
        .lean();

        console.log(`📊 Total: ${alugueis.length} aluguéis ativos\n`);

        for (const aluguel of alugueis) {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`ID: ${aluguel._id}`);
            console.log(`Cliente: ${aluguel.cliente?.nome || 'N/A'}`);
            console.log(`Placa: ${aluguel.placa?.numero_placa || 'N/A'}`);
            console.log(`Início: ${aluguel.data_inicio.toLocaleDateString()}`);
            console.log(`Fim: ${aluguel.data_fim.toLocaleDateString()}`);
        }

        await mongoose.connection.close();
        console.log('\n✅ Concluído!');
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

listarAlugueisAtivos();
